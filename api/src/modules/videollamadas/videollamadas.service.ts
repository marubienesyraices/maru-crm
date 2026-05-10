import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VideollamadasService {
  private readonly logger = new Logger(VideollamadasService.name);
  private readonly accountId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.accountId    = config.get<string>('ZOOM_ACCOUNT_ID')    ?? '';
    this.clientId     = config.get<string>('ZOOM_CLIENT_ID')     ?? '';
    this.clientSecret = config.get<string>('ZOOM_CLIENT_SECRET') ?? '';
  }

  async crearMeeting(tenantId: string, visitaId: string) {
    if (!this.accountId) throw new BadRequestException('Zoom no está configurado (ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET)');

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
      throw new BadRequestException('Esta visita ya tiene una videollamada asociada');
    }

    const token = await this.getAccessToken();

    const duracionMin = Math.max(
      30,
      Math.round((visita.fecha_fin.getTime() - visita.fecha_inicio.getTime()) / 60_000),
    );

    const body = {
      topic: `Visita — ${visita.interes.propiedad.titulo}`,
      type: 2, // scheduled
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
    };

    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(`Zoom error: ${(err as any).message ?? res.status}`);
    }

    const meeting: any = await res.json();

    return this.prisma.visita.update({
      where: { id: visitaId },
      data: {
        zoom_meeting_id: String(meeting.id),
        zoom_join_url:   meeting.join_url,
      },
      select: {
        id: true, zoom_meeting_id: true, zoom_join_url: true,
        fecha_inicio: true, fecha_fin: true,
      },
    });
  }

  async eliminarMeeting(tenantId: string, visitaId: string) {
    const visita = await this.prisma.visita.findFirst({
      where: { id: visitaId },
      include: { interes: { include: { cliente: { select: { tenant_id: true } } } } },
    });

    if (!visita || visita.interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Visita no encontrada');
    }
    if (!visita.zoom_meeting_id) throw new BadRequestException('No hay videollamada asociada');

    try {
      const token = await this.getAccessToken();
      await fetch(`https://api.zoom.us/v2/meetings/${visita.zoom_meeting_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo eliminar meeting Zoom ${visita.zoom_meeting_id}: ${err?.message}`);
    }

    return this.prisma.visita.update({
      where: { id: visitaId },
      data: { zoom_meeting_id: null, zoom_join_url: null },
      select: { id: true, zoom_meeting_id: true, zoom_join_url: true },
    });
  }

  // ─── Private ─────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) return this.accessToken;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
      { method: 'POST', headers: { Authorization: `Basic ${credentials}` } },
    );

    if (!res.ok) throw new Error(`Zoom OAuth error: ${res.status}`);

    const data: any = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    return this.accessToken!;
  }
}
