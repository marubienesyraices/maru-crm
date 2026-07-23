import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EmailService } from '../email/email.service';
import {
  CreateVisitaDto,
  UpdateVisitaDto,
  FiltrosVisitaDto,
  ReporteVisitaDto,
  AccionReprogramarDto,
} from './dto';
import { randomUUID } from 'crypto';

const VISITA_INCLUDE = {
  interes: {
    include: {
      cliente: { select: { id: true, nombre: true, email: true } },
      propiedad: { select: { id: true, titulo: true, codigo: true } },
    },
  },
  agente: { select: { id: true, nombre: true } },
};

function fmtFecha(d: Date): string {
  return d.toLocaleString('es-GT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guatemala',
  });
}

@Injectable()
export class VisitasService {
  private readonly logger = new Logger(VisitasService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  async getConfig(tenantId: string) {
    const config = await this.prisma.configSeguridad.findUnique({
      where: { tenant_id: tenantId },
    });
    return { buffer_entre_citas_min: config?.buffer_entre_citas_min ?? 30 };
  }

  private async getBufferMs(tenantId: string): Promise<number> {
    const config = await this.prisma.configSeguridad.findUnique({
      where: { tenant_id: tenantId },
    });
    return (config?.buffer_entre_citas_min ?? 30) * 60 * 1000;
  }

  async create(tenantId: string, agenteId: string, dto: CreateVisitaDto) {
    const interes = await this.prisma.clientePropiedad.findFirst({
      where: { id: dto.interesId, cliente: { tenant_id: tenantId } },
      include: {
        cliente: { select: { nombre: true, email: true } },
        propiedad: { select: { codigo: true, titulo: true } },
      },
    });
    if (!interes) throw new NotFoundException('Trámite no encontrado');

    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);

    if (fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    const bufferMs = await this.getBufferMs(tenantId);

    const overlap = await this.prisma.visita.findFirst({
      where: {
        agente_id: agenteId,
        estado: { not: 'CANCELADA' },
        fecha_inicio: { lt: new Date(fechaFin.getTime() + bufferMs) },
        fecha_fin: { gt: new Date(fechaInicio.getTime() - bufferMs) },
      },
    });
    if (overlap) {
      const bufferMin = bufferMs / 60000;
      throw new ConflictException(
        `El agente ya tiene una visita en ese horario (incluido buffer de ${bufferMin} min)`,
      );
    }

    const rescheduleToken = randomUUID();

    const visita = await this.prisma.visita.create({
      data: {
        interes_id: dto.interesId,
        agente_id: agenteId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        ubicacion: dto.ubicacion,
        notas: dto.notas,
        reschedule_token: rescheduleToken,
        reschedule_expires: fechaInicio,
      },
      include: VISITA_INCLUDE,
    });

    const fechaStr = fmtFecha(fechaInicio);

    this.notificaciones
      .create({
        tenantId,
        userId: agenteId,
        tipo: 'VISITA_AGENDADA',
        titulo: 'Visita agendada',
        mensaje: `Visita con ${interes.cliente.nombre} en ${interes.propiedad.codigo} el ${fechaStr}`,
        entidad: 'visita',
        entidadId: visita.id,
      })
      .catch(() => {});

    if (interes.cliente.email) {
      this.sendVisitaEmail(interes.cliente.email, interes.cliente.nombre, {
        propiedad: interes.propiedad,
        fechaInicio,
        fechaFin,
        ubicacion: dto.ubicacion,
        agente: visita.agente,
        token: rescheduleToken,
        tenantId,
      }).catch((err) => this.logger.warn(`Visit email failed: ${err}`));
    }

    return visita;
  }

  async findAll(
    tenantId: string,
    visibleUserIds: string[] | null,
    filtros: FiltrosVisitaDto,
  ) {
    const where: any = { interes: { cliente: { tenant_id: tenantId } } };

    if (visibleUserIds) where.agente_id = { in: visibleUserIds };
    if (filtros.agenteId) where.agente_id = filtros.agenteId;
    if (filtros.interesId) where.interes_id = filtros.interesId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.from || filtros.to) {
      where.fecha_inicio = {};
      if (filtros.from) where.fecha_inicio.gte = new Date(filtros.from);
      if (filtros.to) where.fecha_inicio.lte = new Date(filtros.to);
    }

    return this.prisma.visita.findMany({
      where,
      include: VISITA_INCLUDE,
      orderBy: { fecha_inicio: 'asc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateVisitaDto) {
    const visita = await this.findOneWithTenantCheck(tenantId, id);

    if (dto.fechaInicio || dto.fechaFin) {
      const fechaInicio = dto.fechaInicio
        ? new Date(dto.fechaInicio)
        : visita.fecha_inicio;
      const fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : visita.fecha_fin;

      if (fechaFin <= fechaInicio) {
        throw new BadRequestException(
          'La fecha de fin debe ser posterior a la fecha de inicio',
        );
      }

      if (dto.estado !== 'CANCELADA') {
        const bufferMs = await this.getBufferMs(tenantId);
        const overlap = await this.prisma.visita.findFirst({
          where: {
            id: { not: id },
            agente_id: visita.agente_id,
            estado: { not: 'CANCELADA' },
            fecha_inicio: { lt: new Date(fechaFin.getTime() + bufferMs) },
            fecha_fin: { gt: new Date(fechaInicio.getTime() - bufferMs) },
          },
        });
        if (overlap) {
          const bufferMs2 = await this.getBufferMs(tenantId);
          throw new ConflictException(
            `El agente ya tiene una visita en ese horario (incluido buffer de ${bufferMs2 / 60000} min)`,
          );
        }
      }
    }

    const newFechaInicio = dto.fechaInicio
      ? new Date(dto.fechaInicio)
      : undefined;

    return this.prisma.visita.update({
      where: { id },
      data: {
        ...(newFechaInicio
          ? { fecha_inicio: newFechaInicio, reschedule_expires: newFechaInicio }
          : {}),
        ...(dto.fechaFin ? { fecha_fin: new Date(dto.fechaFin) } : {}),
        ...(dto.ubicacion !== undefined ? { ubicacion: dto.ubicacion } : {}),
        ...(dto.notas !== undefined ? { notas: dto.notas } : {}),
        ...(dto.estado ? { estado: dto.estado as any } : {}),
      },
      include: VISITA_INCLUDE,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOneWithTenantCheck(tenantId, id);
    await this.prisma.visita.delete({ where: { id } });
    return { deleted: true };
  }

  async generateIcs(tenantId: string, id: string): Promise<string> {
    const visita = await this.prisma.visita.findFirst({
      where: { id, interes: { cliente: { tenant_id: tenantId } } },
      include: VISITA_INCLUDE,
    });
    if (!visita) throw new NotFoundException('Visita no encontrada');

    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const esc = (s: string) =>
      s.replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

    const summary = `Visita - ${visita.interes.propiedad.codigo}`;
    const desc = esc(
      `Cliente: ${visita.interes.cliente.nombre}\n` +
        `Propiedad: ${visita.interes.propiedad.codigo} - ${visita.interes.propiedad.titulo}` +
        (visita.notas ? `\nNotas: ${visita.notas}` : ''),
    );

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GestProp CRM//CRM//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${visita.id}@maru.crm`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(visita.fecha_inicio)}`,
      `DTEND:${fmt(visita.fecha_fin)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      ...(visita.ubicacion ? [`LOCATION:${esc(visita.ubicacion)}`] : []),
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    return lines.join('\r\n');
  }

  async submitReporte(tenantId: string, id: string, dto: ReporteVisitaDto) {
    await this.findOneWithTenantCheck(tenantId, id);
    return this.prisma.visita.update({
      where: { id },
      data: {
        reporte_notas: dto.notas ?? null,
        reporte_nivel_interes: dto.nivelInteres ?? null,
        reporte_reaccion: dto.reaccion ?? null,
        reporte_siguiente_paso: dto.siguientePaso ?? null,
        reporte_fecha: new Date(),
        estado: 'REALIZADA',
        ...(dto.fotosVisita !== undefined
          ? { fotos_visita: dto.fotosVisita }
          : {}),
      },
      include: VISITA_INCLUDE,
    });
  }

  // ─── Public: client reschedule link ──────────────────────────

  async getPublicVisita(token: string) {
    const visita = await this.prisma.visita.findUnique({
      where: { reschedule_token: token },
      include: VISITA_INCLUDE,
    });

    if (!visita) throw new NotFoundException('Enlace no válido');
    this.assertTokenActive(visita);

    return {
      id: visita.id,
      estado: visita.estado,
      fecha_inicio: visita.fecha_inicio,
      fecha_fin: visita.fecha_fin,
      ubicacion: visita.ubicacion,
      propiedad: visita.interes.propiedad,
      cliente_nombre: visita.interes.cliente.nombre,
      agente_nombre: visita.agente.nombre,
      reschedule_propuesta_inicio: visita.reschedule_propuesta_inicio,
      reschedule_propuesta_fin: visita.reschedule_propuesta_fin,
      reschedule_notas: visita.reschedule_notas,
      reschedule_solicitado_at: visita.reschedule_solicitado_at,
    };
  }

  async procesarAccionCliente(token: string, dto: AccionReprogramarDto) {
    const visita = await this.prisma.visita.findUnique({
      where: { reschedule_token: token },
      include: VISITA_INCLUDE,
    });

    if (!visita) throw new NotFoundException('Enlace no válido');
    this.assertTokenActive(visita);

    const tenantId = await this.getTenantId(visita);
    const agenteId = visita.agente_id;
    const clienteNombre = visita.interes.cliente.nombre;
    const propCodigo = visita.interes.propiedad.codigo;
    const fechaOriginal = fmtFecha(visita.fecha_inicio);

    if (dto.accion === 'CONFIRMAR') {
      await this.prisma.visita.update({
        where: { id: visita.id },
        data: { estado: 'CONFIRMADA' },
      });

      this.notificaciones
        .create({
          tenantId,
          userId: agenteId,
          tipo: 'VISITA_AGENDADA',
          titulo: 'Visita confirmada por el cliente',
          mensaje: `${clienteNombre} confirmó la visita del ${fechaOriginal} (${propCodigo})`,
          entidad: 'visita',
          entidadId: visita.id,
        })
        .catch(() => {});

      return { success: true, accion: 'CONFIRMAR' };
    }

    if (dto.accion === 'CANCELAR') {
      await this.prisma.visita.update({
        where: { id: visita.id },
        data: {
          estado: 'CANCELADA',
          reschedule_token: null,
          reschedule_expires: null,
          reschedule_notas: dto.notas ?? null,
        },
      });

      this.notificaciones
        .create({
          tenantId,
          userId: agenteId,
          tipo: 'SISTEMA',
          titulo: 'Visita cancelada por el cliente',
          mensaje: `${clienteNombre} canceló la visita del ${fechaOriginal} (${propCodigo})${dto.notas ? ': ' + dto.notas : ''}`,
          entidad: 'visita',
          entidadId: visita.id,
        })
        .catch(() => {});

      return { success: true, accion: 'CANCELAR' };
    }

    // REPROGRAMAR
    if (!dto.fecha_inicio || !dto.fecha_fin) {
      throw new BadRequestException(
        'Se requiere fecha_inicio y fecha_fin para reprogramar',
      );
    }

    const propInicio = new Date(dto.fecha_inicio);
    const propFin = new Date(dto.fecha_fin);

    if (propFin <= propInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }
    if (propInicio <= new Date()) {
      throw new BadRequestException('La fecha propuesta debe ser futura');
    }

    await this.prisma.visita.update({
      where: { id: visita.id },
      data: {
        reschedule_propuesta_inicio: propInicio,
        reschedule_propuesta_fin: propFin,
        reschedule_notas: dto.notas ?? null,
        reschedule_solicitado_at: new Date(),
      },
    });

    const nuevaFecha = fmtFecha(propInicio);

    this.notificaciones
      .create({
        tenantId,
        userId: agenteId,
        tipo: 'VISITA_AGENDADA',
        titulo: 'Solicitud de reprogramación de visita',
        mensaje: `${clienteNombre} solicita reprogramar la visita del ${fechaOriginal} → propone ${nuevaFecha} (${propCodigo})`,
        entidad: 'visita',
        entidadId: visita.id,
      })
      .catch(() => {});

    return { success: true, accion: 'REPROGRAMAR' };
  }

  // ─── Private helpers ─────────────────────────────────────────

  private assertTokenActive(visita: {
    reschedule_expires: Date | null;
    estado: string;
  }) {
    if (visita.estado === 'CANCELADA' || visita.estado === 'REALIZADA') {
      throw new BadRequestException(
        'Esta visita ya fue ' +
          (visita.estado === 'CANCELADA' ? 'cancelada' : 'realizada'),
      );
    }
    if (!visita.reschedule_expires || visita.reschedule_expires < new Date()) {
      throw new BadRequestException(
        'El enlace ha expirado. Contacta al agente para reagendar.',
      );
    }
  }

  private async getTenantId(visita: {
    interes: { propiedad: { id: string } };
  }) {
    const prop = await this.prisma.propiedad.findUnique({
      where: { id: visita.interes.propiedad.id },
      select: { tenant_id: true },
    });
    return prop!.tenant_id;
  }

  // ─── P-10: Enviar resumen de visita al propietario ───────────

  async enviarResumenPropietario(tenantId: string, id: string) {
    const visita = await this.prisma.visita.findFirst({
      where: { id, interes: { cliente: { tenant_id: tenantId } } },
      include: {
        agente: { select: { nombre: true, email: true } },
        interes: {
          include: {
            propiedad: {
              include: {
                propietario: {
                  select: { nombre: true, email: true, telefono: true },
                },
                tenant: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!visita) throw new NotFoundException('Visita no encontrada');

    const propietario = visita.interes.propiedad.propietario;
    if (!propietario?.email) {
      return {
        sent: false,
        reason: 'El propietario no tiene email registrado',
      };
    }

    const propiedad = visita.interes.propiedad;
    const tenantName = propiedad.tenant.nombre;
    const fechaStr = fmtFecha(visita.fecha_inicio);
    const nivelMap: Record<string, string> = {
      1: '1 — Muy bajo',
      2: '2 — Bajo',
      3: '3 — Medio',
      4: '4 — Alto',
      5: '5 — Muy alto',
    };
    const nivelTexto = visita.reporte_nivel_interes
      ? (nivelMap[visita.reporte_nivel_interes] ??
        String(visita.reporte_nivel_interes))
      : 'No registrado';

    await this.email.sendHtml({
      to: propietario.email,
      subject: `Informe de visita — ${propiedad.codigo} — ${tenantName}`,
      html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <tr><td style="padding:28px 32px;background:#1e3a5f;">
        <h2 style="margin:0;color:#fff;font-size:1.25rem;">${tenantName}</h2>
        <p style="margin:6px 0 0;color:#93c5fd;font-size:.875rem;">Informe de visita</p>
      </td></tr>
      <tr><td style="padding:24px 32px;">
        <p style="margin:0 0 16px;color:#0f172a;">Estimado/a <strong>${propietario.nombre}</strong>,</p>
        <p style="margin:0 0 20px;color:#475569;">Se realizó una visita a su propiedad <strong>${propiedad.codigo} — ${propiedad.titulo}</strong>. A continuación el resumen del agente:</p>
        <table width="100%" cellpadding="10" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <tr><td style="font-size:.8125rem;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e2e8f0;" colspan="2">Detalles</td></tr>
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="color:#64748b;font-size:.875rem;">Fecha</td><td style="color:#0f172a;font-size:.875rem;font-weight:600;">${fechaStr}</td></tr>
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="color:#64748b;font-size:.875rem;">Agente</td><td style="color:#0f172a;font-size:.875rem;font-weight:600;">${visita.agente?.nombre ?? '—'}</td></tr>
          <tr style="border-bottom:1px solid #f1f5f9;"><td style="color:#64748b;font-size:.875rem;">Nivel de interés</td><td style="color:#0f172a;font-size:.875rem;font-weight:600;">${nivelTexto}</td></tr>
          ${visita.reporte_reaccion ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="color:#64748b;font-size:.875rem;">Reacción</td><td style="color:#0f172a;font-size:.875rem;font-weight:600;">${visita.reporte_reaccion}</td></tr>` : ''}
          ${visita.reporte_siguiente_paso ? `<tr><td style="color:#64748b;font-size:.875rem;">Próximo paso</td><td style="color:#0f172a;font-size:.875rem;font-weight:600;">${visita.reporte_siguiente_paso}</td></tr>` : ''}
        </table>
        ${visita.reporte_notas ? `<div style="margin-top:20px;padding:16px;background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;"><p style="margin:0;font-size:.875rem;color:#1e40af;font-weight:600;">Observaciones del agente</p><p style="margin:8px 0 0;color:#1e3a5f;font-size:.9375rem;">${visita.reporte_notas}</p></div>` : ''}
        <p style="margin:24px 0 0;font-size:.8125rem;color:#94a3b8;">Este resumen fue generado automáticamente por ${tenantName} CRM. No incluye datos personales del visitante.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    });

    return { sent: true };
  }

  private async findOneWithTenantCheck(tenantId: string, id: string) {
    const visita = await this.prisma.visita.findFirst({
      where: { id, interes: { cliente: { tenant_id: tenantId } } },
    });
    if (!visita) throw new NotFoundException('Visita no encontrada');
    return visita;
  }

  private async sendVisitaEmail(
    to: string,
    nombre: string,
    info: {
      propiedad: { codigo: string; titulo: string };
      fechaInicio: Date;
      fechaFin: Date;
      ubicacion?: string;
      agente: { nombre: string };
      token: string;
      tenantId: string;
    },
  ) {
    const url = `${this.frontendUrl}/portal/reprogramar/${info.token}`;
    const fechaStr = fmtFecha(info.fechaInicio);
    const horaFin = info.fechaFin.toLocaleString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Guatemala',
    });

    await this.email.sendHtml({
      to,
      subject: `Tu visita ha sido agendada — ${info.propiedad.codigo}`,
      tenantId: info.tenantId,
      html: `<!DOCTYPE html>
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
            <p style="font-size:2rem;margin:0 0 16px;">📅</p>
            <h2 style="margin:0 0 4px;font-size:1.125rem;color:#0f172a;">¡Hola, ${nombre}!</h2>
            <p style="margin:0 0 24px;">Tu visita para la propiedad <strong>${info.propiedad.codigo} — ${info.propiedad.titulo}</strong> ha sido agendada.</p>

            <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border-radius:8px;margin:0 0 24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;font-size:.8125rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Detalles de la visita</p>
                <p style="margin:0 0 4px;color:#0f172a;">📅 <strong>${fechaStr}</strong> – ${horaFin}</p>
                ${info.ubicacion ? `<p style="margin:0 0 4px;color:#475569;">📍 ${info.ubicacion}</p>` : ''}
                <p style="margin:0;color:#475569;">👤 Agente: ${info.agente.nombre}</p>
              </td></tr>
            </table>

            <p style="margin:0 0 20px;color:#64748b;">Si necesitas confirmar, proponer otra fecha o cancelar, usa el botón a continuación:</p>
            <a href="${url}"
               style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:.9375rem;font-weight:600;">
              Gestionar mi visita →
            </a>
            <p style="margin:20px 0 0;font-size:.8125rem;color:#94a3b8;">
              Este enlace es personal y expira cuando inicie la visita. Si tienes dudas, contacta directamente con ${info.agente.nombre}.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;">
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">GestProp · Portal de clientes</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  }
}
