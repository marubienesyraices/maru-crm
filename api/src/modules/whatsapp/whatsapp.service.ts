import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrochureService } from '../brochure/brochure.service';
import { EnviarWhatsappDto } from './dto';

type PropiedadParaWhatsapp = Prisma.PropiedadGetPayload<{
  select: {
    titulo: true;
    codigo: true;
    gestion: true;
    moneda: true;
    precio_venta: true;
    precio_renta: true;
    agente: { select: { nombre: true; email: true } };
  };
}>;

interface GraphApiError {
  error?: { message?: string };
}
interface MediaUploadResult {
  id: string;
}
interface SendMessageResult {
  messages?: { id: string }[];
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly apiBase = 'https://graph.facebook.com/v19.0';

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private brochure: BrochureService,
  ) {
    this.apiToken = config.get<string>('WHATSAPP_API_TOKEN') ?? null;
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? null;
  }

  get isConfigured(): boolean {
    return !!(this.apiToken && this.phoneNumberId);
  }

  // ─── Enviar brochure ────────────────────────────────────────

  async enviarBrochure(
    tenantId: string,
    userId: string,
    propiedadId: string,
    dto: EnviarWhatsappDto,
  ) {
    const telefono = this.normalizePhone(dto.telefono);

    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
      select: {
        titulo: true,
        codigo: true,
        gestion: true,
        moneda: true,
        precio_venta: true,
        precio_renta: true,
        agente: { select: { nombre: true, email: true } },
      },
    });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    if (!this.isConfigured) {
      return this.fallbackLink(
        tenantId,
        propiedadId,
        userId,
        telefono,
        propiedad,
        dto.mensaje,
      );
    }

    return this.enviarViaApi(
      tenantId,
      propiedadId,
      userId,
      telefono,
      propiedad,
      dto.mensaje,
    );
  }

  // ─── Historial ──────────────────────────────────────────────

  async getEnvios(tenantId: string, propiedadId: string) {
    const envios = await this.prisma.whatsappEnvio.findMany({
      where: { tenant_id: tenantId, propiedad_id: propiedadId },
      orderBy: { enviado_at: 'desc' },
      take: 50,
    });
    return { total: envios.length, envios };
  }

  // ─── Private: Cloud API path ────────────────────────────────

  private async enviarViaApi(
    tenantId: string,
    propiedadId: string,
    userId: string,
    telefono: string,
    propiedad: PropiedadParaWhatsapp,
    customMsg?: string,
  ) {
    const { buffer, codigo } = await this.brochure.generateBuffer(
      propiedadId,
      tenantId,
    );
    const filename = `Brochure-${codigo}.pdf`;
    const caption = customMsg ?? this.buildCaption(propiedad);

    let mediaId: string;
    try {
      mediaId = await this.uploadMedia(buffer, filename);
    } catch (err) {
      await this.registrar(
        tenantId,
        propiedadId,
        userId,
        telefono,
        customMsg,
        'FALLIDO',
        null,
        toErrorMessage(err),
      );
      throw new BadRequestException(
        `Error al subir PDF a WhatsApp Media API: ${toErrorMessage(err)}`,
      );
    }

    let messageId: string;
    try {
      messageId = await this.sendDocument(telefono, mediaId, filename, caption);
    } catch (err) {
      await this.registrar(
        tenantId,
        propiedadId,
        userId,
        telefono,
        customMsg,
        'FALLIDO',
        null,
        toErrorMessage(err),
      );
      throw new BadRequestException(
        `Error al enviar mensaje WhatsApp: ${toErrorMessage(err)}`,
      );
    }

    await this.registrar(
      tenantId,
      propiedadId,
      userId,
      telefono,
      customMsg,
      'ENVIADO',
      messageId,
      null,
    );
    return { status: 'ENVIADO', message_id: messageId, telefono };
  }

  // ─── Private: wa.me fallback ────────────────────────────────

  private async fallbackLink(
    tenantId: string,
    propiedadId: string,
    userId: string,
    telefono: string,
    propiedad: PropiedadParaWhatsapp,
    customMsg?: string,
  ) {
    const texto = customMsg ?? this.buildTextoLink(propiedad);
    const waLink = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;

    await this.registrar(
      tenantId,
      propiedadId,
      userId,
      telefono,
      customMsg,
      'LINK',
      null,
      null,
    );
    return { status: 'LINK_GENERADO', wa_link: waLink, telefono };
  }

  // ─── Private: WhatsApp Cloud API calls ──────────────────────

  private async uploadMedia(buffer: Buffer, filename: string): Promise<string> {
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/pdf',
    });
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'application/pdf');
    form.append('file', blob, filename);

    const res = await fetch(`${this.apiBase}/${this.phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiToken}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GraphApiError;
      throw new Error(err.error?.message ?? `HTTP ${res.status}`);
    }
    const json = (await res.json()) as MediaUploadResult;
    return json.id;
  }

  private async sendDocument(
    to: string,
    mediaId: string,
    filename: string,
    caption: string,
  ): Promise<string> {
    const res = await fetch(`${this.apiBase}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { id: mediaId, filename, caption },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GraphApiError;
      throw new Error(err.error?.message ?? `HTTP ${res.status}`);
    }
    const json = (await res.json()) as SendMessageResult;
    return json.messages?.[0]?.id ?? 'unknown';
  }

  // ─── Private: helpers ────────────────────────────────────────

  private normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) throw new BadRequestException('Número de teléfono inválido');
    // Strip leading 00 (international prefix)
    return digits.startsWith('00') ? digits.slice(2) : digits;
  }

  private buildCaption(p: PropiedadParaWhatsapp): string {
    const lines = [`*${p.titulo}*`];
    if (p.precio_venta)
      lines.push(
        `Precio venta: ${p.moneda} ${Number(p.precio_venta).toLocaleString('es-GT')}`,
      );
    if (p.precio_renta)
      lines.push(
        `Renta mensual: ${p.moneda} ${Number(p.precio_renta).toLocaleString('es-GT')}`,
      );
    lines.push('\nSi te interesa, contáctanos para agendar una visita.');
    return lines.join('\n');
  }

  private buildTextoLink(p: PropiedadParaWhatsapp): string {
    const lines = [`*${p.titulo}*`, `Código: ${p.codigo}`];
    if (p.precio_venta)
      lines.push(
        `Precio venta: ${p.moneda} ${Number(p.precio_venta).toLocaleString('es-GT')}`,
      );
    if (p.precio_renta)
      lines.push(
        `Renta mensual: ${p.moneda} ${Number(p.precio_renta).toLocaleString('es-GT')}`,
      );
    if (p.agente?.nombre) lines.push(`\nAgente: ${p.agente.nombre}`);
    lines.push('\n¿Te gustaría agendar una visita?');
    return lines.join('\n');
  }

  private async registrar(
    tenantId: string,
    propiedadId: string,
    userId: string,
    telefono: string,
    mensaje: string | undefined,
    status: string,
    wabaId: string | null,
    error: string | null,
  ) {
    await this.prisma.whatsappEnvio
      .create({
        data: {
          id: randomUUID(),
          tenant_id: tenantId,
          propiedad_id: propiedadId,
          user_id: userId,
          telefono_destino: telefono,
          mensaje: mensaje ?? null,
          status,
          waba_message_id: wabaId,
          error,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`WhatsappEnvio.create failed: ${toErrorMessage(err)}`),
      );
  }
}
