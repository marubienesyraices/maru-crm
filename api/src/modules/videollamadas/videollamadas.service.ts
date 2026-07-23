import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigIntegracionesService } from '../config-integraciones/config-integraciones.service';

interface ZoomToken {
  token: string;
  expiry: number;
}

@Injectable()
export class VideollamadasService {
  private readonly logger = new Logger(VideollamadasService.name);
  /** Per-tenant Zoom token cache: tenantId → { token, expiry } */
  private readonly tokenCache = new Map<string, ZoomToken>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly integraciones: ConfigIntegracionesService,
  ) {}

  async crearMeeting(tenantId: string, visitaId: string) {
    const creds = await this.integraciones.getCredentials(tenantId);
    if (!creds.zoom_account_id) {
      throw new BadRequestException(
        'Zoom no está configurado para este tenant (zoom_account_id / zoom_client_id / zoom_client_secret)',
      );
    }

    const visita = await this.prisma.visita.findFirst({
      where: { id: visitaId },
      include: {
        interes: {
          include: {
            cliente: { select: { tenant_id: true, nombre: true } },
            propiedad: { select: { titulo: true } },
          },
        },
        agente: { select: { nombre: true } },
      },
    });

    if (!visita || visita.interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Visita no encontrada');
    }
    if (visita.zoom_meeting_id) {
      throw new BadRequestException(
        'Esta visita ya tiene una videollamada asociada',
      );
    }

    const token = await this.getAccessToken(tenantId, creds);
    const duracionMin = Math.max(
      30,
      Math.round(
        (visita.fecha_fin.getTime() - visita.fecha_inicio.getTime()) / 60_000,
      ),
    );

    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        topic: `Visita — ${visita.interes.propiedad.titulo}`,
        type: 2,
        start_time: visita.fecha_inicio.toISOString(),
        duration: duracionMin,
        timezone: 'America/Guatemala',
        agenda: `Visita de propiedad con ${visita.interes.cliente.nombre}. Agente: ${visita.agente.nombre}.`,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
          auto_recording: 'none',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(`Zoom error: ${err.message ?? res.status}`);
    }

    const meeting: any = await res.json();

    return this.prisma.visita.update({
      where: { id: visitaId },
      data: {
        zoom_meeting_id: String(meeting.id),
        zoom_join_url: meeting.join_url,
      },
      select: {
        id: true,
        zoom_meeting_id: true,
        zoom_join_url: true,
        fecha_inicio: true,
        fecha_fin: true,
      },
    });
  }

  async eliminarMeeting(tenantId: string, visitaId: string) {
    const visita = await this.prisma.visita.findFirst({
      where: { id: visitaId },
      include: {
        interes: { include: { cliente: { select: { tenant_id: true } } } },
      },
    });

    if (!visita || visita.interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Visita no encontrada');
    }
    if (!visita.zoom_meeting_id)
      throw new BadRequestException('No hay videollamada asociada');

    try {
      const creds = await this.integraciones.getCredentials(tenantId);
      const token = await this.getAccessToken(tenantId, creds);
      await fetch(`https://api.zoom.us/v2/meetings/${visita.zoom_meeting_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: any) {
      this.logger.warn(
        `No se pudo eliminar meeting Zoom ${visita.zoom_meeting_id}: ${err?.message}`,
      );
    }

    return this.prisma.visita.update({
      where: { id: visitaId },
      data: { zoom_meeting_id: null, zoom_join_url: null },
      select: { id: true, zoom_meeting_id: true, zoom_join_url: true },
    });
  }

  // ─── Private ─────────────────────────────────────────────────

  private async getAccessToken(
    tenantId: string,
    creds: Awaited<ReturnType<ConfigIntegracionesService['getCredentials']>>,
  ): Promise<string> {
    const cached = this.tokenCache.get(tenantId);
    if (cached && Date.now() < cached.expiry - 60_000) return cached.token;

    const credentials = Buffer.from(
      `${creds.zoom_client_id}:${creds.zoom_client_secret}`,
    ).toString('base64');
    const res = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${creds.zoom_account_id}`,
      { method: 'POST', headers: { Authorization: `Basic ${credentials}` } },
    );

    if (!res.ok) throw new Error(`Zoom OAuth error: ${res.status}`);

    const data: any = await res.json();
    this.tokenCache.set(tenantId, {
      token: data.access_token,
      expiry: Date.now() + data.expires_in * 1000,
    });
    return data.access_token;
  }
}
