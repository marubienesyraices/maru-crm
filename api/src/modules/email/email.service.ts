import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TipoNotificacion } from '@prisma/client';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface SendEmailParams {
  to: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  tenantId?: string;
  notificacionId?: string;
  entidad?: string;
  entidadId?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly frontendUrl: string;

  constructor(
    private config: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (apiKey) this.resend = new Resend(apiKey);
    this.from = config.get<string>('EMAIL_FROM') ?? 'CRM Maru <onboarding@resend.dev>';
    this.appUrl = (config.get<string>('APP_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    this.frontendUrl = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  }

  get isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendHtml(params: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({ from: this.from, to: [params.to], subject: params.subject, html: params.html });
    } catch (err) {
      this.logger.error(`sendHtml failed to ${params.to}: ${err}`);
    }
  }

  async send(params: SendEmailParams): Promise<void> {
    if (!this.resend) return;

    let eventId: string | undefined;

    if (this.prisma && params.tenantId) {
      try {
        eventId = randomUUID();
        await this.prisma.emailEvento.create({
          data: {
            id: eventId,
            tenant_id: params.tenantId,
            notificacion_id: params.notificacionId ?? null,
            destinatario: params.to,
            tipo: params.tipo,
          },
        });
      } catch (err) {
        this.logger.warn(`EmailEvento create failed: ${err}`);
        eventId = undefined;
      }
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: [params.to],
        subject: params.titulo,
        html: this.buildHtml(params, eventId),
      });
    } catch (err) {
      this.logger.error(`Email send failed to ${params.to}: ${err}`);
    }
  }

  // ─── Private helpers ────────────────────────────────────────

  private resolveCtaUrl(entidad?: string, entidadId?: string): string {
    if (!entidad || !entidadId) return `${this.frontendUrl}/dashboard`;
    const map: Record<string, string> = {
      propiedad: `${this.frontendUrl}/propiedades/${entidadId}`,
      PropiedadDocumento: `${this.frontendUrl}/propiedades`,
      clientePropiedad: `${this.frontendUrl}/pipeline`,
      cliente: `${this.frontendUrl}/clientes/${entidadId}`,
    };
    return map[entidad] ?? `${this.frontendUrl}/dashboard`;
  }

  private buildHtml(params: SendEmailParams, eventId?: string): string {
    const icons: Partial<Record<TipoNotificacion, string>> = {
      DOCUMENTO_POR_VENCER: '⚠️',
      DOCUMENTO_VENCIDO: '🚨',
      MATCH_PROPIEDAD: '🏠',
      SISTEMA: 'ℹ️',
      VISITA_AGENDADA: '📅',
      LEAD_INACTIVO: '👤',
    };
    const icon = icons[params.tipo] ?? 'ℹ️';

    const directUrl = this.resolveCtaUrl(params.entidad, params.entidadId);
    const ctaUrl = eventId
      ? `${this.appUrl}/api/email/track/${eventId}/click?url=${encodeURIComponent(directUrl)}`
      : directUrl;

    const pixel = eventId
      ? `<img src="${this.appUrl}/api/email/track/${eventId}/open.gif" width="1" height="1" style="display:none;border:0;" alt="" />`
      : '';

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
            <span style="color:#fff;font-size:1.125rem;font-weight:700;">Maru Bienes y Raíces</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:2rem;margin:0 0 16px;">${icon}</p>
            <h2 style="margin:0 0 12px;font-size:1.125rem;color:#0f172a;">${params.titulo}</h2>
            <p style="margin:0 0 24px;color:#475569;line-height:1.7;font-size:.9375rem;">${params.mensaje}</p>
            <a href="${ctaUrl}"
               style="display:inline-block;padding:10px 22px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:.875rem;font-weight:600;">
              Ver en CRM →
            </a>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 0;">
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;">
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">
              Recibiste este mensaje porque eres usuario de CRM Maru Bienes y Raíces.
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
