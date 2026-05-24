import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CreateCampanaDto, CreatePlantillaDto, UpdateCampanaDto, UpdatePlantillaDto } from './dto';

function extractVariables(html: string): string[] {
  const matches = html.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  for (const m of matches) vars.add(m[1]);
  return [...vars];
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

const ROL_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SENIOR: 'Agente Senior',
  JUNIOR: 'Agente Junior',
};

@Injectable()
export class CampanasService {
  private readonly logger = new Logger(CampanasService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    this.appUrl = (config.get<string>('APP_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  // ─── Plantillas ───────────────────────────────────────────────

  async listPlantillas(tenantId: string) {
    return this.prisma.emailPlantilla.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      select: { id: true, nombre: true, asunto: true, variables: true, created_at: true, updated_at: true },
    });
  }

  async getPlantilla(tenantId: string, id: string) {
    const p = await this.prisma.emailPlantilla.findFirst({ where: { id, tenant_id: tenantId } });
    if (!p) throw new NotFoundException('Plantilla no encontrada');
    return p;
  }

  async createPlantilla(tenantId: string, dto: CreatePlantillaDto) {
    const variables = extractVariables(dto.asunto + ' ' + dto.cuerpo_html);
    return this.prisma.emailPlantilla.create({
      data: { id: randomUUID(), tenant_id: tenantId, nombre: dto.nombre, asunto: dto.asunto, cuerpo_html: dto.cuerpo_html, variables },
    });
  }

  async updatePlantilla(tenantId: string, id: string, dto: UpdatePlantillaDto) {
    await this.getPlantilla(tenantId, id);
    const data: Record<string, unknown> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.asunto !== undefined) data.asunto = dto.asunto;
    if (dto.cuerpo_html !== undefined) {
      data.cuerpo_html = dto.cuerpo_html;
      data.variables = extractVariables((dto.asunto ?? '') + ' ' + dto.cuerpo_html);
    }
    return this.prisma.emailPlantilla.update({ where: { id }, data });
  }

  async deletePlantilla(tenantId: string, id: string) {
    await this.getPlantilla(tenantId, id);
    const inUse = await this.prisma.emailCampana.count({ where: { plantilla_id: id, tenant_id: tenantId } });
    if (inUse > 0) throw new BadRequestException('La plantilla está en uso por una o más campañas');
    return this.prisma.emailPlantilla.delete({ where: { id } });
  }

  previewPlantilla(plantilla: { asunto: string; cuerpo_html: string }, vars: Record<string, string>) {
    const merged = { nombre: 'Juan Pérez', email: 'agente@ejemplo.com', rol: 'Agente Senior', ...vars };
    return {
      asunto: interpolate(plantilla.asunto, merged),
      cuerpo_html: this.wrapEmail(interpolate(plantilla.cuerpo_html, merged)),
    };
  }

  // ─── Campañas ────────────────────────────────────────────────

  async listCampanas(tenantId: string) {
    const campanas = await this.prisma.emailCampana.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      include: { plantilla: { select: { nombre: true } } },
    });
    const ids = campanas.map((c) => c.id);
    const stats = await this.prisma.emailEvento.groupBy({
      by: ['campana_id'],
      where: { campana_id: { in: ids } },
      _count: { id: true },
    });
    const abiertos = await this.prisma.emailEvento.groupBy({
      by: ['campana_id'],
      where: { campana_id: { in: ids }, abierto_at: { not: null } },
      _count: { id: true },
    });
    const statsMap = Object.fromEntries(stats.map((s) => [s.campana_id!, s._count.id]));
    const abiertosMap = Object.fromEntries(abiertos.map((s) => [s.campana_id!, s._count.id]));

    return campanas.map((c) => ({
      ...c,
      total_abiertos: abiertosMap[c.id] ?? 0,
      tasa_apertura: c.total_enviados > 0 ? Math.round(((abiertosMap[c.id] ?? 0) / c.total_enviados) * 100) : 0,
    }));
  }

  async getCampana(tenantId: string, id: string) {
    const c = await this.prisma.emailCampana.findFirst({
      where: { id, tenant_id: tenantId },
      include: { plantilla: true },
    });
    if (!c) throw new NotFoundException('Campaña no encontrada');
    const abiertos = await this.prisma.emailEvento.count({ where: { campana_id: id, abierto_at: { not: null } } });
    return { ...c, total_abiertos: abiertos, tasa_apertura: c.total_enviados > 0 ? Math.round((abiertos / c.total_enviados) * 100) : 0 };
  }

  async createCampana(tenantId: string, dto: CreateCampanaDto) {
    await this.getPlantilla(tenantId, dto.plantilla_id);
    return this.prisma.emailCampana.create({
      data: {
        id: randomUUID(),
        tenant_id: tenantId,
        nombre: dto.nombre,
        plantilla_id: dto.plantilla_id,
        filtro_rol: (dto.filtro_rol ?? []) as never[],
        variables_data: dto.variables_data ?? {},
      },
      include: { plantilla: { select: { nombre: true } } },
    });
  }

  async updateCampana(tenantId: string, id: string, dto: UpdateCampanaDto) {
    const c = await this.getCampana(tenantId, id);
    if (c.estado !== 'BORRADOR') throw new BadRequestException('Solo se pueden editar campañas en estado BORRADOR');
    if (dto.plantilla_id) await this.getPlantilla(tenantId, dto.plantilla_id);
    const data: Record<string, unknown> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.plantilla_id !== undefined) data.plantilla_id = dto.plantilla_id;
    if (dto.filtro_rol !== undefined) data.filtro_rol = dto.filtro_rol;
    if (dto.variables_data !== undefined) data.variables_data = dto.variables_data;
    return this.prisma.emailCampana.update({ where: { id }, data, include: { plantilla: { select: { nombre: true } } } });
  }

  async enviarCampana(tenantId: string, id: string) {
    const campana = await this.getCampana(tenantId, id);
    if (campana.estado !== 'BORRADOR') throw new BadRequestException('La campaña ya fue enviada o está en proceso');

    await this.prisma.emailCampana.update({ where: { id }, data: { estado: 'ENVIANDO' } });

    const filtro: Record<string, unknown> = { tenant_id: tenantId, estado: 'ACTIVO' };
    if (campana.filtro_rol && (campana.filtro_rol as string[]).length > 0) {
      filtro.rol = { in: campana.filtro_rol };
    }

    const usuarios = await this.prisma.user.findMany({ where: filtro as never, select: { id: true, nombre: true, email: true, rol: true } });

    if (usuarios.length === 0) {
      await this.prisma.emailCampana.update({ where: { id }, data: { estado: 'BORRADOR' } });
      throw new BadRequestException('No hay destinatarios para el filtro configurado');
    }

    const campanaVars = (campana.variables_data ?? {}) as Record<string, string>;
    let enviados = 0;

    for (const user of usuarios) {
      const recipientVars: Record<string, string> = {
        nombre: user.nombre,
        email: user.email,
        rol: ROL_LABELS[user.rol] ?? user.rol,
        ...campanaVars,
      };

      const asunto = interpolate(campana.plantilla.asunto, recipientVars);
      const bodyHtml = interpolate(campana.plantilla.cuerpo_html, recipientVars);

      try {
        const eventId = randomUUID();
        await this.prisma.emailEvento.create({
          data: {
            id: eventId,
            tenant_id: tenantId,
            campana_id: id,
            destinatario: user.email,
            tipo: 'SISTEMA',
          },
        });

        const pixel = `<img src="${this.appUrl}/api/email/track/${eventId}/open.gif" width="1" height="1" style="display:none;border:0;" alt="" />`;
        const html = this.wrapEmail(bodyHtml, pixel);

        if (this.email.isConfigured) {
          await this.email.sendHtml({ to: user.email, subject: asunto, html });
        } else {
          this.logger.warn(`Email not configured — skipping send to ${user.email}`);
        }

        enviados++;
      } catch (err) {
        this.logger.error(`Failed to send campaign email to ${user.email}: ${err}`);
      }
    }

    const estado = enviados > 0 ? 'ENVIADA' : 'FALLIDA';
    return this.prisma.emailCampana.update({
      where: { id },
      data: { estado, total_enviados: enviados, enviada_at: new Date() },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────

  private wrapEmail(bodyHtml: string, pixel = ''): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#1e293b;padding:20px 32px;">
            <span style="color:#fff;font-size:1.125rem;font-weight:700;">GestProp</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#475569;line-height:1.7;font-size:.9375rem;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;">
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">
              Recibiste este mensaje porque eres usuario de GestProp CRM.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  ${pixel}
</body>
</html>`;
  }
}
