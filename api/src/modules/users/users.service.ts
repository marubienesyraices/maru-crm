import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, UpdateUserDto, CreateAdminDto, UpdateAdminDto } from './dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  }

  async create(tenantId: string, dto: CreateUserDto) {
    // Check tenant user limit
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');

    const userCount = await this.prisma.user.count({
      where: { tenant_id: tenantId, estado: { not: 'INACTIVO' } },
    });
    if (userCount >= tenant.limite_usuarios) {
      throw new BadRequestException(`Límite de usuarios alcanzado (${tenant.limite_usuarios})`);
    }

    // Validate supervisor hierarchy
    if (dto.idSupervisor) {
      await this.validateSupervisor(tenantId, dto.idSupervisor, dto.rol);
    }

    // Validate that JUNIOR cannot be supervisor
    if (dto.rol === 'JUNIOR' && dto.idSupervisor === undefined) {
      throw new BadRequestException('Un agente Junior debe tener un supervisor asignado');
    }

    const activationToken = randomUUID();
    const tempPassword = await bcrypt.hash('temp-' + randomUUID(), 12);

    const user = await this.prisma.user.create({
      data: {
        tenant_id: tenantId,
        email: dto.email,
        password_hash: tempPassword,
        nombre: dto.nombre,
        rol: dto.rol as any,
        id_supervisor: dto.idSupervisor,
        estado: 'PENDIENTE',
        activation_token: activationToken,
        activation_expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    const activationUrl = `${this.frontendUrl}/onboarding?token=${activationToken}`;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Activation: ${activationUrl}`);
    }

    // Welcome email with activation link (fire-and-forget)
    this.email.sendSystemEmail({
      to: user.email,
      subject: '¡Bienvenido/a al CRM! — GestProp',
      heading: `¡Bienvenido/a, ${user.nombre}!`,
      body: `Tu cuenta como <strong>${user.rol}</strong> ha sido creada en GestProp CRM. Usa el siguiente enlace para establecer tu contraseña e ingresar al sistema.`,
      cta: { label: 'Activar mi cuenta', url: activationUrl },
    }).catch(() => {});

    return { ...user, activationToken };
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true, email: true, nombre: true, rol: true, estado: true,
        id_supervisor: true, ultimo_login: true, created_at: true,
        intentos_login: true, bloqueado_hasta: true,
        supervisor: { select: { id: true, nombre: true } },
        _count: { select: { subordinados: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true, email: true, nombre: true, rol: true, estado: true,
        id_supervisor: true, totp_habilitado: true, ultimo_login: true,
        created_at: true,
        supervisor: { select: { id: true, nombre: true } },
        subordinados: { select: { id: true, nombre: true, rol: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(tenantId, id);

    if (dto.idSupervisor) {
      // Prevent circular references
      await this.checkCircularReference(id, dto.idSupervisor, tenantId);
      await this.validateSupervisor(tenantId, dto.idSupervisor, dto.rol);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        email: dto.email,
        rol: dto.rol as any,
        estado: dto.estado as any,
        id_supervisor: dto.idSupervisor,
      },
    });
  }

  async findMe(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId },
      select: { id: true, email: true, nombre: true, rol: true, tema: true, totp_habilitado: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateTema(tenantId: string, userId: string, tema: 'oscuro' | 'claro') {
    await this.findOne(tenantId, userId);
    await this.prisma.user.update({ where: { id: userId }, data: { tema } });
    return { tema };
  }

  // ─── HIERARCHY: Get full downline (recursive) ────────────

  async getDownline(tenantId: string, userId: string): Promise<any[]> {
    const result = await this.prisma.$queryRaw<any[]>`
      WITH RECURSIVE downline AS (
        SELECT id, nombre, email, rol, id_supervisor, 0 as nivel
        FROM users
        WHERE id_supervisor = ${userId} AND tenant_id = ${tenantId}
        
        UNION ALL
        
        SELECT u.id, u.nombre, u.email, u.rol, u.id_supervisor, d.nivel + 1
        FROM users u
        INNER JOIN downline d ON u.id_supervisor = d.id
        WHERE u.tenant_id = ${tenantId}
      )
      SELECT * FROM downline ORDER BY nivel, nombre
    `;
    return result;
  }

  // ─── HIERARCHY: Get full upline (recursive) ──────────────

  async getUpline(tenantId: string, userId: string): Promise<any[]> {
    const result = await this.prisma.$queryRaw<any[]>`
      WITH RECURSIVE upline AS (
        SELECT id, nombre, email, rol, id_supervisor, 0 as nivel
        FROM users
        WHERE id = ${userId} AND tenant_id = ${tenantId}
        
        UNION ALL
        
        SELECT u.id, u.nombre, u.email, u.rol, u.id_supervisor, up.nivel + 1
        FROM users u
        INNER JOIN upline up ON u.id = up.id_supervisor
        WHERE u.tenant_id = ${tenantId}
      )
      SELECT * FROM upline WHERE nivel > 0 ORDER BY nivel
    `;
    return result;
  }

  // ─── Transfer and deactivate ──────────────────────────────

  async transferAndDeactivate(tenantId: string, fromUserId: string, toUserId: string) {
    const [fromUser, toUser] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: fromUserId, tenant_id: tenantId } }),
      this.prisma.user.findFirst({ where: { id: toUserId, tenant_id: tenantId, estado: 'ACTIVO' } }),
    ]);
    if (!fromUser) throw new NotFoundException('Usuario origen no encontrado');
    if (!toUser)   throw new NotFoundException('Usuario destino no encontrado o inactivo');
    if (fromUserId === toUserId) throw new BadRequestException('El usuario origen y destino deben ser distintos');

    const [propiedades, clientes] = await this.prisma.$transaction([
      this.prisma.propiedad.updateMany({
        where: { agente_id: fromUserId, tenant_id: tenantId },
        data:  { agente_id: toUserId },
      }),
      this.prisma.cliente.updateMany({
        where: { agente_id: fromUserId, tenant_id: tenantId },
        data:  { agente_id: toUserId },
      }),
    ]);

    await this.prisma.user.update({
      where: { id: fromUserId },
      data:  { estado: 'INACTIVO' },
    });

    return {
      propiedades_transferidas: propiedades.count,
      clientes_transferidos: clientes.count,
      usuario_desactivado: fromUserId,
      usuario_destino: toUserId,
    };
  }

  // ─── Get hierarchy tree for orgchart ──────────────────────

  async getHierarchyTree(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenant_id: tenantId, estado: { not: 'INACTIVO' } },
      select: { id: true, nombre: true, email: true, rol: true, id_supervisor: true },
      orderBy: { nombre: 'asc' },
    });

    // Build tree structure
    const roots = users.filter((u) => !u.id_supervisor);
    const buildTree = (parentId: string): any[] => {
      return users
        .filter((u) => u.id_supervisor === parentId)
        .map((u) => ({ ...u, subordinados: buildTree(u.id) }));
    };

    return roots.map((r) => ({ ...r, subordinados: buildTree(r.id) }));
  }

  // ─── SUPER_ADMIN: gestión de administradores ─────────────

  async findAllAdmins() {
    return this.prisma.user.findMany({
      where: { rol: 'ADMIN' },
      select: {
        id: true, email: true, nombre: true, rol: true, estado: true,
        ultimo_login: true, created_at: true,
        tenant: { select: { id: true, nombre: true, plan: true, estado: true } },
      },
      orderBy: [{ tenant: { nombre: 'asc' } }, { nombre: 'asc' }],
    });
  }

  async createAdmin(dto: CreateAdminDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');

    const existingAdmin = await this.prisma.user.findFirst({
      where: { tenant_id: dto.tenantId, rol: 'ADMIN' },
      select: { nombre: true, email: true },
    });
    if (existingAdmin) {
      throw new BadRequestException(
        `La empresa "${tenant.nombre}" ya tiene un administrador (${existingAdmin.nombre} — ${existingAdmin.email})`,
      );
    }

    const activationToken = randomUUID();
    const tempPassword = await bcrypt.hash('temp-' + randomUUID(), 12);

    const user = await this.prisma.user.create({
      data: {
        tenant_id: dto.tenantId,
        email: dto.email,
        password_hash: tempPassword,
        nombre: dto.nombre,
        rol: 'ADMIN',
        estado: 'PENDIENTE',
        activation_token: activationToken,
        activation_expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    const activationUrl = `${this.frontendUrl}/onboarding?token=${activationToken}`;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Admin activation: ${activationUrl}`);
    }

    this.email.sendSystemEmail({
      to: user.email,
      subject: '¡Bienvenido/a al CRM! — GestProp',
      heading: `¡Bienvenido/a, ${user.nombre}!`,
      body: `Tu cuenta como <strong>Administrador</strong> ha sido creada en GestProp CRM para la empresa <strong>${tenant.nombre}</strong>. Usa el siguiente enlace para establecer tu contraseña e ingresar al sistema.`,
      cta: { label: 'Activar mi cuenta', url: activationUrl },
    }).catch(() => {});

    return { ...user, activationToken };
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const user = await this.prisma.user.findFirst({ where: { id, rol: 'ADMIN' } });
    if (!user) throw new NotFoundException('Administrador no encontrado');

    if (dto.tenantId && dto.tenantId !== user.tenant_id) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
      if (!tenant) throw new NotFoundException('Empresa no encontrada');

      const existingAdmin = await this.prisma.user.findFirst({
        where: { tenant_id: dto.tenantId, rol: 'ADMIN', id: { not: id } },
        select: { nombre: true, email: true },
      });
      if (existingAdmin) {
        throw new BadRequestException(
          `La empresa "${tenant.nombre}" ya tiene un administrador (${existingAdmin.nombre} — ${existingAdmin.email})`,
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        email: dto.email,
        estado: dto.estado as any,
        tenant_id: dto.tenantId,
      },
    });
  }

  async resendActivation(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      include: { tenant: { select: { nombre: true } } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.estado !== 'PENDIENTE') {
      throw new BadRequestException('Solo se puede reenviar el correo a usuarios pendientes de activación');
    }

    const activationToken = randomUUID();
    await this.prisma.user.update({
      where: { id },
      data: {
        activation_token: activationToken,
        activation_expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    const activationUrl = `${this.frontendUrl}/onboarding?token=${activationToken}`;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Resend activation: ${activationUrl}`);
    }

    this.email.sendSystemEmail({
      to: user.email,
      subject: 'Activa tu cuenta — GestProp',
      heading: `Hola, ${user.nombre}`,
      body: `Se ha generado un nuevo enlace de activación para tu cuenta como <strong>${user.rol}</strong> en GestProp CRM. El enlace anterior ya no es válido.`,
      cta: { label: 'Activar mi cuenta', url: activationUrl },
    }).catch(() => {});

    return { message: 'Correo de activación reenviado' };
  }

  // ─── P-01: Admin manual unlock ───────────────────────────

  async desbloquear(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.user.update({
      where: { id },
      data: { intentos_login: 0, bloqueado_hasta: null },
    });
    return { message: 'Cuenta desbloqueada correctamente' };
  }

  // ─── P-03: Reset 2FA por Administrador ──────────────────

  async resetTotp(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenant_id: tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.user.update({
      where: { id },
      data: { totp_secret: null, totp_habilitado: false },
    });
    return { message: '2FA desactivado. El usuario deberá configurarlo nuevamente en su próximo login.' };
  }

  // ─── F-08: Reasignación masiva de subordinados ──────────

  async reasignarSubordinados(tenantId: string, fromUserId: string, toSupervisorId: string) {
    const [fromUser, toUser] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: fromUserId, tenant_id: tenantId } }),
      this.prisma.user.findFirst({ where: { id: toSupervisorId, tenant_id: tenantId } }),
    ]);
    if (!fromUser) throw new NotFoundException('Usuario origen no encontrado');
    if (!toUser)   throw new NotFoundException('Usuario destino no encontrado');
    if (toUser.rol === 'JUNIOR') throw new BadRequestException('El destino no puede ser un Agente Junior');
    if (fromUserId === toSupervisorId) throw new BadRequestException('El origen y el destino no pueden ser el mismo usuario');

    const count = await this.prisma.user.updateMany({
      where: { tenant_id: tenantId, id_supervisor: fromUserId },
      data: { id_supervisor: toSupervisorId },
    });

    return { reasignados: count.count, message: `${count.count} subordinado(s) reasignado(s) a ${toUser.nombre}` };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  private async validateSupervisor(tenantId: string, supervisorId: string, rol?: string) {
    const supervisor = await this.prisma.user.findFirst({
      where: { id: supervisorId, tenant_id: tenantId },
    });
    if (!supervisor) throw new BadRequestException('Supervisor no encontrado');
    if (supervisor.rol === 'JUNIOR') {
      throw new BadRequestException('Un agente Junior no puede ser supervisor');
    }
  }

  private async checkCircularReference(userId: string, newSupervisorId: string, tenantId: string) {
    // Get the full downline of the user being edited
    const downline = await this.getDownline(tenantId, userId);
    const downlineIds = downline.map((d) => d.id);

    if (downlineIds.includes(newSupervisorId) || newSupervisorId === userId) {
      throw new BadRequestException(
        'No se puede asignar este supervisor: se crearía una referencia circular',
      );
    }
  }
}
