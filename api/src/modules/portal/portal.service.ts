import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigPortalService } from '../config-portal/config-portal.service';
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
  private readonly portalBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly configPortal: ConfigPortalService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
    const configuredPortal = config.get<string>('PORTAL_URL');
    this.portalBase = configuredPortal
      ? configuredPortal.replace(/\/$/, '')
      : 'http://localhost:3001';
  }

  async findPublicProperties(filtros: FiltrosPublicasDto) {
    const page  = filtros.page  || 1;
    const limit = Math.min(filtros.limit || 12, 500);
    const skip  = (page - 1) * limit;

    const where: any = { estado: 'DISPONIBLE' };
    // Distingue el sitio público del tenant del mapa interno del CRM
    // (crm.gestprop.net/portal), cada uno con su propia bandera de visibilidad.
    if (filtros.vista === 'mapa_crm') {
      where.mostrar_en_mapa_crm = true;
    } else {
      where.mostrar_en_portal = true;
    }
    // Env var takes priority; otherwise use tenantId passed by the portal SSR.
    // `||` (not `??`): docker-compose interpola PORTAL_TENANT_ID como "" cuando
    // no está definida en .env, y "" no es null/undefined así que `??` nunca
    // caía al fallback — dejaba resolvedTenantId en "" y el filtro nunca se aplicaba.
    const resolvedTenantId = TENANT_ID || filtros.tenantId;
    if (resolvedTenantId) where.tenant_id = resolvedTenantId;

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
          agente: { select: { nombre: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.propiedad.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findPublicProperty(id: string, vista?: string, tenantId?: string) {
    const where: any = { id, estado: 'DISPONIBLE' };
    if (vista === 'mapa_crm') {
      where.mostrar_en_mapa_crm = true;
    } else {
      where.mostrar_en_portal = true;
    }
    // `||` (no `??`): mismo motivo que en findPublicProperties — TENANT_ID
    // interpolado como "" por docker-compose no debe ganarle a un tenantId real.
    const resolvedTenantId = TENANT_ID || tenantId;
    if (resolvedTenantId) where.tenant_id = resolvedTenantId;

    const prop = await this.prisma.propiedad.findFirst({
      where,
      include: {
        ...PUBLIC_PROPERTY_INCLUDE,
        tenant: { select: { nombre: true, logo_url: true, plan: true } },
      },
    });

    if (!prop) throw new NotFoundException('Propiedad no encontrada');

    const planFeatures = await this.prisma.catalogoPlan.findUnique({
      where: { plan: prop.tenant.plan },
      select: { tiene_mapas: true },
    });

    if (!planFeatures?.tiene_mapas) {
      return { ...prop, latitud: null, longitud: null };
    }
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
        await this.sendVerificationEmail(dto.email, existing.nombre, token, tenantId);
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

    await this.sendVerificationEmail(dto.email, dto.nombre, token, tenantId);
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

    // ─── Lead assignment based on tenant config ─────────────────
    const config = await this.prisma.configSeguridad.findUnique({
      where: { tenant_id: tenantId },
      select: { modo_asignacion_leads: true },
    });
    const modo = config?.modo_asignacion_leads ?? 'Manual';

    const activeAgents = await this.prisma.user.findMany({
      where: { tenant_id: tenantId, estado: 'ACTIVO', rol: { in: ['ADMIN', 'SENIOR', 'JUNIOR'] } },
      select: { id: true, rol: true, ultimo_login: true },
      orderBy: { ultimo_login: 'asc' },
    });

    let assignedAgentId: string | null = null;

    if (modo === 'RoundRobin' && activeAgents.length > 0) {
      // Assign to the agent who received a lead least recently (approximated by oldest ultimo_login)
      const lastLeadCounts = await this.prisma.cliente.groupBy({
        by: ['agente_id'],
        where: { tenant_id: tenantId, agente_id: { in: activeAgents.map((a) => a.id) }, origen: 'PORTAL_WEB' },
        _count: { agente_id: true },
        orderBy: { _count: { agente_id: 'asc' } },
      });
      const assignedIds = new Set(lastLeadCounts.map((r) => r.agente_id));
      const unassigned = activeAgents.find((a) => !assignedIds.has(a.id));
      assignedAgentId = unassigned?.id ?? lastLeadCounts[0]?.agente_id ?? activeAgents[0].id;
    } else if (modo === 'MenosCarga' && activeAgents.length > 0) {
      // Assign to agent with fewest active pipeline items
      const loads = await this.prisma.clientePropiedad.groupBy({
        by: ['cliente_id'],
        where: {
          estado: { notIn: ['GANADO', 'PERDIDO'] },
          cliente: { tenant_id: tenantId, agente_id: { in: activeAgents.map((a) => a.id) } },
        },
        _count: { cliente_id: true },
      });
      // This is approximate — count by agente from cliente
      const loadByAgent: Record<string, number> = {};
      for (const ag of activeAgents) loadByAgent[ag.id] = 0;
      const clienteAgentMap = await this.prisma.cliente.findMany({
        where: { tenant_id: tenantId, agente_id: { in: activeAgents.map((a) => a.id) } },
        select: { id: true, agente_id: true },
      });
      const clienteToAgent: Record<string, string> = {};
      for (const c of clienteAgentMap) if (c.agente_id) clienteToAgent[c.id] = c.agente_id;
      for (const l of loads) {
        const ag = clienteToAgent[l.cliente_id];
        if (ag) loadByAgent[ag] = (loadByAgent[ag] ?? 0) + (l._count.cliente_id ?? 0);
      }
      assignedAgentId = Object.entries(loadByAgent).sort((a, b) => a[1] - b[1])[0]?.[0] ?? activeAgents[0].id;
    }

    // Assign client to agent if determined
    if (assignedAgentId) {
      await this.prisma.cliente.update({
        where: { id: clienteId },
        data: { agente_id: assignedAgentId },
      });
    }

    // Notify: assigned agent (or all ADMINs if Manual/no assignment)
    const notifyIds: string[] = assignedAgentId
      ? [assignedAgentId]
      : (await this.prisma.user.findMany({
          where: { tenant_id: tenantId, estado: 'ACTIVO', rol: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true },
        })).map((u) => u.id);

    const notifData = notifyIds.map((uid) => ({
      id:         randomUUID(),
      tenant_id:  tenantId,
      user_id:    uid,
      tipo:       'SISTEMA' as const,
      titulo:     '🤖 Nuevo lead via chatbot',
      mensaje:    `${dto.nombre} está interesado/a. ${notas}`,
      entidad:    'Cliente',
      entidad_id: clienteId,
    }));

    if (notifData.length > 0) {
      await this.prisma.notificacion.createMany({ data: notifData });
    }

    return { success: true, clienteId, asignadoA: assignedAgentId };
  }

  // ─── Panel del cliente (magic link + dashboard) ───────────────

  async solicitarAcceso(email: string, tenantId?: string) {
    const resolvedTenantId = TENANT_ID || tenantId;
    const where: any = { email };
    if (resolvedTenantId) where.tenant_id = resolvedTenantId;

    const cliente = await this.prisma.cliente.findFirst({
      where,
      select: { id: true, nombre: true, email: true, tenant_id: true, portal_verificado: true },
    });

    if (!cliente || !cliente.email) {
      return { message: 'Si tu correo está registrado, recibirás un enlace de acceso.' };
    }

    const token   = randomUUID();
    const expires = new Date(Date.now() + (cliente.portal_verificado ? 15 : 24) * 60 * 60 * 1000);

    await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { activation_token: token, activation_expires: expires },
    });

    if (cliente.portal_verificado) {
      await this.sendMagicLoginEmail(cliente.email, cliente.nombre, token, cliente.tenant_id);
    } else {
      await this.sendVerificationEmail(cliente.email, cliente.nombre, token, cliente.tenant_id);
    }

    return { message: 'Si tu correo está registrado, recibirás un enlace de acceso.' };
  }

  async accederConToken(token: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { activation_token: token },
      select: { id: true, nombre: true, email: true, tenant_id: true, activation_expires: true },
    });

    if (!cliente || !cliente.activation_expires || cliente.activation_expires < new Date()) {
      throw new BadRequestException('El enlace no es válido o ha expirado. Solicita uno nuevo.');
    }

    await this.prisma.cliente.update({
      where: { id: cliente.id },
      data: { activation_token: null, activation_expires: null, portal_verificado: true },
    });

    const accessToken = this.jwt.sign(
      { sub: cliente.id, tenantId: cliente.tenant_id, email: cliente.email, type: 'cliente' },
      { expiresIn: '30d' },
    );

    return { token: accessToken, nombre: cliente.nombre };
  }

  async getMiCuenta(clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true, nombre: true, email: true, telefono: true,
        gestion_interes: true, zona_interes: true, presupuesto_max: true,
        tipo_interes: true, habitaciones_min: true, created_at: true,
        intereses: {
          orderBy: { created_at: 'desc' as const },
          select: {
            id: true, estado: true, nivel_interes: true, notas: true,
            fecha_contacto: true, fecha_cierre: true, precio_cierre: true, created_at: true,
            propiedad: {
              select: {
                id: true, codigo: true, titulo: true, tipo: true, gestion: true,
                precio_venta: true, precio_renta: true, moneda: true,
                estado: true, zona: true, municipio: true, departamento: true,
                imagenes: { where: { tipo: 'portada' }, take: 1, select: { url: true } },
              },
            },
            visitas: {
              where: {
                fecha_inicio: { gte: new Date() },
                estado: { in: ['PENDIENTE', 'CONFIRMADA'] as any[] },
              },
              orderBy: { fecha_inicio: 'asc' as const },
              take: 1,
              select: {
                id: true, fecha_inicio: true, fecha_fin: true,
                estado: true, zoom_join_url: true, ubicacion: true,
              },
            },
          },
        },
        favoritos: {
          orderBy: { created_at: 'desc' as const },
          select: {
            id: true, created_at: true,
            propiedad: {
              select: {
                id: true, codigo: true, titulo: true, tipo: true, gestion: true,
                precio_venta: true, precio_renta: true, moneda: true,
                estado: true, zona: true, municipio: true, departamento: true,
                imagenes: { where: { tipo: 'portada' }, take: 1, select: { url: true } },
              },
            },
          },
        },
        // §10 CA-2: Búsquedas guardadas
        busquedas_guardadas: {
          orderBy: { created_at: 'desc' as const },
          select: { id: true, nombre: true, filtros: true, alertas: true, created_at: true },
        },
      },
    });

    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async addFavorito(clienteId: string, tenantId: string, propiedadId: string) {
    const prop = await this.prisma.propiedad.findUnique({ where: { id: propiedadId }, select: { id: true } });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');

    await this.prisma.favorito.upsert({
      where: { cliente_id_propiedad_id: { cliente_id: clienteId, propiedad_id: propiedadId } },
      create: { id: randomUUID(), tenant_id: tenantId, cliente_id: clienteId, propiedad_id: propiedadId },
      update: {},
    });
    return { success: true };
  }

  async removeFavorito(clienteId: string, propiedadId: string) {
    await this.prisma.favorito.deleteMany({
      where: { cliente_id: clienteId, propiedad_id: propiedadId },
    });
    return { success: true };
  }

  // §10 CA-2: Saved searches
  async getBusquedasGuardadas(clienteId: string) {
    return this.prisma.busquedaGuardada.findMany({
      where: { cliente_id: clienteId },
      orderBy: { created_at: 'desc' },
    });
  }

  async saveBusquedaGuardada(clienteId: string, tenantId: string, nombre: string, filtros: Record<string, unknown>, alertas = true) {
    return this.prisma.busquedaGuardada.create({
      data: { id: randomUUID(), tenant_id: tenantId, cliente_id: clienteId, nombre, filtros: filtros as Prisma.InputJsonValue, alertas },
    });
  }

  async deleteBusquedaGuardada(clienteId: string, id: string) {
    const b = await this.prisma.busquedaGuardada.findFirst({ where: { id, cliente_id: clienteId } });
    if (!b) throw new NotFoundException('Búsqueda no encontrada');
    await this.prisma.busquedaGuardada.delete({ where: { id } });
    return { deleted: true };
  }

  async getFavoritos(clienteId: string) {
    return this.prisma.favorito.findMany({
      where: { cliente_id: clienteId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, created_at: true,
        propiedad: {
          select: {
            id: true, codigo: true, titulo: true, tipo: true, gestion: true,
            precio_venta: true, precio_renta: true, moneda: true,
            estado: true, zona: true, municipio: true, departamento: true,
            imagenes: { where: { tipo: 'portada' }, take: 1, select: { url: true } },
          },
        },
      },
    });
  }

  // ─── Branding ─────────────────────────────────────────────────

  async getDefaultBranding() {
    const where = TENANT_ID ? { id: TENANT_ID } : undefined;
    const tenant = await this.prisma.tenant.findFirst({
      where,
      orderBy: { created_at: 'asc' },
      select: { nombre: true, logo_url: true },
    });
    return tenant ?? { nombre: 'GestProp', logo_url: null };
  }

  // ─── Private helpers ─────────────────────────────────────────

  private async sendMagicLoginEmail(email: string, nombre: string, token: string, tenantId: string) {
    const base = await this.configPortal.resolvePortalBaseUrl(tenantId, this.portalBase);
    const url = `${base}/mi-cuenta/verify?token=${token}`;
    try {
      await this.email.sendHtml({
        to: email,
        subject: 'Tu enlace de acceso al portal — GestProp',
        html: this.buildMagicLoginHtml(nombre, url),
      });
    } catch (err) {
      this.logger.warn(`Magic login email failed to ${email}: ${err}`);
    }
  }

  private buildMagicLoginHtml(nombre: string, url: string): string {
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
            <span style="color:#fff;font-size:1.125rem;font-weight:700;">GestProp</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#475569;line-height:1.7;font-size:.9375rem;">
            <p style="font-size:2rem;margin:0 0 16px;">🏠</p>
            <h2 style="margin:0 0 12px;font-size:1.125rem;color:#0f172a;">¡Hola, ${nombre}!</h2>
            <p style="margin:0 0 24px;">
              Aquí tienes tu enlace de acceso al portal. Haz clic para ingresar a tu cuenta:
            </p>
            <a href="${url}"
               style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:.9375rem;font-weight:600;">
              Ingresar a mi cuenta →
            </a>
            <p style="margin:24px 0 0;font-size:.8125rem;color:#94a3b8;">
              Este enlace expira en 15 minutos. Si no solicitaste el acceso puedes ignorar este mensaje.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;">
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">GestProp · Portal público</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private async sendVerificationEmail(email: string, nombre: string, token: string, tenantId?: string) {
    const base = tenantId ? await this.configPortal.resolvePortalBaseUrl(tenantId, this.portalBase) : this.portalBase;
    const url = `${base}/verificar?token=${token}`;
    try {
      await this.email.sendHtml({
        to: email,
        subject: 'Confirma tu registro — GestProp',
        html: this.buildVerificationHtml(nombre, url),
        tenantId,
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
            <span style="color:#fff;font-size:1.125rem;font-weight:700;">GestProp</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#475569;line-height:1.7;font-size:.9375rem;">
            <p style="font-size:2rem;margin:0 0 16px;">🏠</p>
            <h2 style="margin:0 0 12px;font-size:1.125rem;color:#0f172a;">¡Hola, ${nombre}!</h2>
            <p style="margin:0 0 24px;">
              Gracias por registrarte en el portal de GestProp. Haz clic en el botón para confirmar tu correo y activar tu cuenta:
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
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">GestProp · Portal público</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ─── F-12: Google OAuth ──────────────────────────────────────

  async googleAuth(credential: string, tenantId?: string) {
    if (!credential) throw new BadRequestException('Credencial de Google requerida');

    // Verify Google credential by calling Google's tokeninfo endpoint
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!res.ok) throw new BadRequestException('Credencial de Google inválida');

    const payload = await res.json() as { email?: string; name?: string; sub?: string; email_verified?: string };
    if (!payload.email || payload.email_verified !== 'true') {
      throw new BadRequestException('El email de Google no está verificado');
    }

    const resolvedTenantId = TENANT_ID || tenantId;
    if (!resolvedTenantId) throw new BadRequestException('No se pudo determinar el tenant');

    // Create or find cliente
    let cliente = await this.prisma.cliente.findUnique({
      where: { tenant_id_email: { tenant_id: resolvedTenantId, email: payload.email } },
    });

    if (!cliente) {
      cliente = await this.prisma.cliente.create({
        data: {
          id: randomUUID(),
          tenant_id: resolvedTenantId,
          nombre: payload.name ?? payload.email.split('@')[0],
          email: payload.email,
          origen: 'PORTAL_WEB',
          portal_verificado: true,
        },
      });
    } else if (!cliente.portal_verificado) {
      await this.prisma.cliente.update({ where: { id: cliente.id }, data: { portal_verificado: true } });
    }

    const accessToken = this.jwt.sign(
      { sub: cliente.id, tenantId: cliente.tenant_id, email: cliente.email, type: 'cliente' },
      { expiresIn: '30d' },
    );

    return { token: accessToken, nombre: cliente.nombre };
  }
}
