import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Plan, EstadoTenant } from '@prisma/client';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const SUSPENDED_STATES: EstadoTenant[] = ['SUSPENDIDA', 'CANCELADA'];

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(dto: CreateTenantDto) {
    const plan = (dto.plan as Plan) || 'FREE';
    const catalogoConfig = await this.prisma.catalogoPlan.findUnique({ where: { plan } });

    const tenant = await this.prisma.tenant.create({
      data: {
        nombre: dto.nombre,
        logo_url: dto.logoUrl,
        plan,
        moneda: dto.moneda || 'GTQ',
        zona_horaria: dto.zonaHoraria || 'America/Guatemala',
        limite_usuarios: dto.limiteUsuarios ?? catalogoConfig?.limite_usuarios ?? 1,
        limite_propiedades: dto.limitePropiedades ?? catalogoConfig?.limite_propiedades ?? 5,
        estado: (dto.estado as EstadoTenant) || 'ACTIVA',
        trial_hasta: dto.trialHasta ? new Date(dto.trialHasta) : null,
      },
    });

    await this.prisma.configSeguridad.create({
      data: {
        tenant_id: tenant.id,
        geo_paises: ['GT', 'SV'],
        dias_inactividad_lead: 21,
      },
    });

    const activationToken = randomUUID();
    const tempPassword = await bcrypt.hash('temp-will-be-changed', 12);

    const admin = await this.prisma.user.create({
      data: {
        tenant_id: tenant.id,
        email: dto.adminEmail,
        password_hash: tempPassword,
        nombre: dto.adminNombre,
        rol: 'ADMIN',
        estado: 'PENDIENTE',
        activation_token: activationToken,
        activation_expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    console.log(`[DEV] Activation link: ${process.env.FRONTEND_URL}/onboarding?token=${activationToken}`);

    return { tenant, admin: { id: admin.id, email: admin.email, activationToken } };
  }

  async getBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { nombre: true, logo_url: true, plan: true, limite_usuarios: true, limite_propiedades: true },
    });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      include: { _count: { select: { usuarios: true, propiedades: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { config_seguridad: true, _count: { select: { usuarios: true } } },
    });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    let limiteUsuarios = dto.limiteUsuarios;
    let limitePropiedades = dto.limitePropiedades;

    // Si se cambia el plan pero no se especifican límites, adoptar los del catálogo
    if (dto.plan && dto.limiteUsuarios === undefined && dto.limitePropiedades === undefined) {
      const catalogoConfig = await this.prisma.catalogoPlan.findUnique({
        where: { plan: dto.plan as Plan },
      });
      if (catalogoConfig) {
        limiteUsuarios = catalogoConfig.limite_usuarios;
        limitePropiedades = catalogoConfig.limite_propiedades;
      }
    }

    if (limiteUsuarios !== undefined) {
      const userCount = await this.prisma.user.count({ where: { tenant_id: id } });
      if (userCount > limiteUsuarios) {
        throw new BadRequestException(
          `No se puede aplicar el límite de ${limiteUsuarios} usuarios: la empresa ya tiene ${userCount} usuarios registrados`,
        );
      }
    }

    if (limitePropiedades !== undefined) {
      const propCount = await this.prisma.propiedad.count({ where: { tenant_id: id } });
      if (propCount > limitePropiedades) {
        throw new BadRequestException(
          `No se puede aplicar el límite de ${limitePropiedades} propiedades: la empresa ya tiene ${propCount} propiedades registradas`,
        );
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        logo_url: dto.logoUrl,
        plan: dto.plan as Plan | undefined,
        moneda: dto.moneda,
        zona_horaria: dto.zonaHoraria,
        limite_usuarios: limiteUsuarios,
        limite_propiedades: limitePropiedades,
        estado: dto.estado as EstadoTenant | undefined,
        trial_hasta: dto.trialHasta !== undefined
          ? (dto.trialHasta ? new Date(dto.trialHasta) : null)
          : undefined,
      },
    });

    // When suspending or cancelling: kick all active sessions immediately
    if (dto.estado && SUSPENDED_STATES.includes(dto.estado as EstadoTenant)) {
      await this.prisma.session.deleteMany({ where: { tenant_id: id } });
      // Invalidate the JWT-strategy status cache so tokens are rejected within seconds
      await this.redis.set(`tenant:status:${id}`, dto.estado, 60);
    }

    return updated;
  }
}
