import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ChatbotLeadDto, FiltrosPublicasDto, RegistroPortalDto } from './portal.dto';
import { randomUUID } from 'crypto';

const TENANT_ID = process.env.PORTAL_TENANT_ID;

const PUBLIC_PROPERTY_INCLUDE = {
  imagenes: { orderBy: { orden: 'asc' as const }, take: 6, select: { url: true, nombre: true, tipo: true, orden: true } },
  tenant:   { select: { nombre: true, logo_url: true } },
};

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);
  private readonly frontendUrl: string;

  private readonly portalUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
    // If PORTAL_URL is set, verification links go to the Next.js portal (/verificar)
    // Otherwise fall back to the React CRM path (/portal/verificar)
    const portalBase = config.get<string>('PORTAL_URL');
    this.portalUrl = portalBase
      ? `${portalBase.replace(/\/$/, '')}/verificar`
      : `${this.frontendUrl}/portal/verificar`;
  }

  async findPublicProperties(filtros: FiltrosPublicasDto) {
    const page  = filtros.page  || 1;
    const limit = Math.min(filtros.limit || 12, 500);
    const skip  = (page - 1) * limit;

    const where: any = { estado: 'DISPONIBLE' };
    if (TENANT_ID) where.tenant_id = TENANT_ID;

    if (filtros.tipo)    where.tipo    = filtros.tipo;
    if (filtros.gestion) where.gestion = filtros.gestion;

    if (filtros.departamento) where.departamento = { contains: filtros.departamento, mode: 'insensitive' };
    if (filtros.municipio)    where.municipio    = { contains: filtros.municipio,    mode: 'insensitive' };
    if (filtros.zona)         where.zona         = { contains: filtros.zona,         mode: 'insensitive' };

    if (filtros.habitacionesMin) where.habitaciones = { gte: filtros.habitacionesMin };

    if (filtros.precioMin || filtros.precioMax) {
      const range: any = {};
      if (filtros.precioMin) range.gte = filtros.precioMin;
      if (filtros.precioMax) range.lte = filtros.precioMax;
      where.OR = [{ precio_venta: range }, { precio_renta: range }];
    }

    if (filtros.busqueda) {
      where.OR = [
        { titulo:      { contains: filtros.busqueda, mode: 'insensitive' } },
        { codigo:      { contains: filtros.busqueda, mode: 'insensitive' } },
        { descripcion: { contains: filtros.busqueda, mode: 'insensitive' } },
        { zona:        { contains: filtros.busqueda, mode: 'insensitive' } },
        { municipio:   { contains: filtros.busqueda, mode: 'insensitive' } },
        { departamento:{ contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.propiedad.findMany({
        where,
        select: {
          id: true, codigo: true, titulo: true, tipo: true, gestion: true,
          precio_venta: true, precio_renta: true, moneda: true,
          departamento: true, municipio: true, zona: true,
          latitud: true, longitud: true,
          habitaciones: true, banos: true, area_construccion_m2: true,
          imagenes: { where: { tipo: 'portada' }, take: 1, select: { url: true } },
          tenant: { select: { nombre: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.propiedad.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findPublicProperty(id: string) {
    const where: any = { id, estado: 'DISPONIBLE' };
    if (TENANT_ID) where.tenant_id = TENANT_ID;

    const prop = await this.prisma.propiedad.findFirst({
      where,
      include: PUBLIC_PROPERTY_INCLUDE,
    });

    if (!prop) throw new NotFoundException('Propiedad no encontrada');
    return prop;
  }

  // ─── Self-registration ────────────────────────────────────────

  async registrarCliente(dto: RegistroPortalDto) {
    let tenantId: string;

    if (dto.propiedad_id) {
      const prop = await this.prisma.propiedad.findUnique({
        where: { id: dto.propiedad_id },
        select: { tenant_id: true, estado: true },
      });
      if (!prop || prop.estado === 'VENDIDA' || prop.estado === 'RENTADA') {
        throw new NotFoundException('Propiedad no disponible');
      }
      tenantId = prop.tenant_id;
    } else if (TENANT_ID) {
      tenantId = TENANT_ID;
    } else {
      throw new BadRequestException('propiedad_id es requerido');
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 3600 * 1000);

    const existing = await this.prisma.cliente.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email: dto.email } },
    });

    if (existing) {
      if (!existing.portal_verificado) {
        // Resend — update token
        await this.prisma.cliente.update({
          where: { id: existing.id },
          data: { activation_token: token, activation_expires: expires },
        });
        await this.sendVerificationEmail(dto.email, existing.nombre, token);
      }
      // Silent success whether verified or not — no email enumeration
      return { message: 'Revisa tu correo para confirmar el registro' };
    }

    const cliente = await this.prisma.cliente.create({
      data: {
        id: randomUUID(),
        tenant_id: tenantId,
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono ?? null,
        origen: 'PORTAL_WEB',
        notas: dto.mensaje ?? null,
        activation_token: token,
        activation_expires: expires,
      },
    });

    if (dto.propiedad_id) {
      try {
        await this.prisma.clientePropiedad.create({
          data: {
            id: randomUUID(),
            cliente_id: cliente.id,
            propiedad_id: dto.propiedad_id,
            notas: dto.mensaje ?? null,
          },
        });
      } catch (err) {
        this.logger.warn(`ClientePropiedad create failed: ${err}`);
      }
    }

    await this.sendVerificationEmail(dto.email, dto.nombre, token);
    return { message: 'Revisa tu correo para confirmar el registro' };
  }

  async verificarEmail(token: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { activation_token: token },
      select: { id: true, nombre: true, activation_expires: true },
    });

    if (!cliente || !cliente.activation_expires || cliente.activation_expires < new Date()) {
      throw new BadRequestException('El enlace no es válido o ha expirado. Solicita uno nuevo.');
    }

    await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { activation_token: null, activation_expires: null, portal_verificado: true },
    });

    return { success: true, nombre: cliente.nombre };
  }

  // ─── Chatbot lead capture ─────────────────────────────────────

  async crearLeadChatbot(dto: ChatbotLeadDto) {
    let tenantId: string;

    if (dto.propiedad_id) {
      const prop = await this.prisma.propiedad.findUnique({
        where: { id: dto.propiedad_id },
        select: { tenant_id: true },
      });
      tenantId = prop?.tenant_id ?? TENANT_ID ?? '';
    } else {
      tenantId = TENANT_ID ?? '';
    }

    if (!tenantId) throw new BadRequestException('No se pudo determinar el tenant');

    const lines: string[] = [`Nombre: ${dto.nombre}`];
    if (dto.email)           lines.push(`Email: ${dto.email}`);
    if (dto.telefono)        lines.push(`Teléfono: ${dto.telefono}`);
    if (dto.gestion_interes) lines.push(`Gestión: ${dto.gestion_interes}`);
    if (dto.zona_interes)    lines.push(`Zona: ${dto.zona_interes}`);
    if (dto.presupuesto_max) lines.push(`Presupuesto máx: Q${dto.presupuesto_max.toLocaleString('es-GT')}`);
    if (dto.tipo_propiedad)  lines.push(`Tipo: ${dto.tipo_propiedad}`);
    const notas = lines.join(' · ');

    // Upsert cliente
    let clienteId: string;
    if (dto.email) {
      const existing = await this.prisma.cliente.findUnique({
        where: { tenant_id_email: { tenant_id: tenantId, email: dto.email } },
      });
      if (existing) {
        clienteId = existing.id;
        await this.prisma.cliente.update({
          where: { id: existing.id },
          data: {
            nombre:          dto.nombre,
            telefono:        dto.telefono ?? existing.telefono,
            gestion_interes: (dto.gestion_interes as any) ?? existing.gestion_interes,
            zona_interes:    dto.zona_interes ?? existing.zona_interes,
            presupuesto_max: dto.presupuesto_max ? dto.presupuesto_max : existing.presupuesto_max,
            notas:           notas,
          },
        });
      } else {
        const c = await this.prisma.cliente.create({
          data: {
            id:              randomUUID(),
            tenant_id:       tenantId,
            nombre:          dto.nombre,
            email:           dto.email,
            telefono:        dto.telefono ?? null,
            origen:          'PORTAL_WEB',
            gestion_interes: dto.gestion_interes as any ?? null,
            zona_interes:    dto.zona_interes ?? null,
            presupuesto_max: dto.presupuesto_max ?? null,
            notas,
          },
        });
        clienteId = c.id;
      }
    } else {
      const c = await this.prisma.cliente.create({
        data: {
          id:              randomUUID(),
          tenant_id:       tenantId,
          nombre:          dto.nombre,
          telefono:        dto.telefono ?? null,
          origen:          'PORTAL_WEB',
          gestion_interes: dto.gestion_interes as any ?? null,
          zona_interes:    dto.zona_interes ?? null,
          presupuesto_max: dto.presupuesto_max ?? null,
          notas,
        },
      });
      clienteId = c.id;
    }

    // Link to property if provided
    if (dto.propiedad_id) {
      await this.prisma.clientePropiedad.upsert({
        where: { cliente_id_propiedad_id: { cliente_id: clienteId, propiedad_id: dto.propiedad_id } },
        create: { id: randomUUID(), cliente_id: clienteId, propiedad_id: dto.propiedad_id, notas },
        update: {},
      });
    }

    // Notify all ADMIN users of the tenant
    const admins = await this.prisma.user.findMany({
      where: { tenant_id: tenantId, estado: 'ACTIVO', rol: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    });

    const notifData = admins.map((u) => ({
      id:         randomUUID(),
      tenant_id:  tenantId,
      user_id:    u.id,
      tipo:       'SISTEMA' as const,
      titulo:     '🤖 Nuevo lead via chatbot',
      mensaje:    `${dto.nombre} está interesado/a. ${notas}`,
      entidad:    'Cliente',
      entidad_id: clienteId,
    }));

    if (notifData.length > 0) {
      await this.prisma.notificacion.createMany({ data: notifData });
    }

    return { success: true, clienteId };
  }

  // ─── Branding ─────────────────────────────────────────────────

  async getDefaultBranding() {
    const where = TENANT_ID ? { id: TENANT_ID } : undefined;
    const tenant = await this.prisma.tenant.findFirst({
      where,
      orderBy: { created_at: 'asc' },
      select: { nombre: true, logo_url: true },
    });
    return tenant ?? { nombre: 'GestPro', logo_url: null };
  }

  // ─── Private helpers ─────────────────────────────────────────

  private async sendVerificationEmail(email: string, nombre: string, token: string) {
    const url = `${this.portalUrl}?token=${token}`;
    try {
      await this.email.sendHtml({
        to: email,
        subject: 'Confirma tu registro — GestPro',
        html: this.buildVerificationHtml(nombre, url),
      });
    } catch (err) {
      this.logger.warn(`Verification email failed to ${email}: ${err}`);
    }
  }

  private buildVerificationHtml(nombre: string, url: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#0f172a;padding:20px 32px;">
            <span style="color:#fff;font-size:1.125rem;font-weight:700;">GestPro</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#475569;line-height:1.7;font-size:.9375rem;">
            <p style="font-size:2rem;margin:0 0 16px;">🏠</p>
            <h2 style="margin:0 0 12px;font-size:1.125rem;color:#0f172a;">¡Hola, ${nombre}!</h2>
            <p style="margin:0 0 24px;">
              Gracias por registrarte en el portal de GestPro. Haz clic en el botón para confirmar tu correo y activar tu cuenta:
            </p>
            <a href="${url}"
               style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:.9375rem;font-weight:600;">
              Confirmar mi correo →
            </a>
            <p style="margin:24px 0 0;font-size:.8125rem;color:#94a3b8;">
              Este enlace expira en 24 horas. Si no solicitaste este registro puedes ignorar este mensaje.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;">
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">GestPro · Portal público</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
