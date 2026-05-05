import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoNotificacion } from '@prisma/client';
import { EmailService } from '../email/email.service';

export interface CreateNotificacionDto {
  tenantId: string;
  userId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  entidad?: string;
  entidadId?: string;
}

@Injectable()
export class NotificacionesService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async create(dto: CreateNotificacionDto) {
    const notificacion = await this.prisma.notificacion.create({
      data: {
        tenant_id: dto.tenantId,
        user_id: dto.userId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
        entidad: dto.entidad,
        entidad_id: dto.entidadId,
      },
    });

    // Fire-and-forget: send email without blocking the response
    this.dispatchEmail(dto, notificacion.id).catch(() => {});

    return notificacion;
  }

  async findAll(userId: string, tenantId: string, soloNoLeidas = false) {
    const where: any = { user_id: userId, tenant_id: tenantId };
    if (soloNoLeidas) where.leida = false;

    const [items, totalNoLeidas] = await Promise.all([
      this.prisma.notificacion.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.prisma.notificacion.count({
        where: { user_id: userId, tenant_id: tenantId, leida: false },
      }),
    ]);

    return { items, totalNoLeidas };
  }

  async countUnread(userId: string, tenantId: string) {
    const count = await this.prisma.notificacion.count({
      where: { user_id: userId, tenant_id: tenantId, leida: false },
    });
    return { count };
  }

  async marcarLeida(id: string, userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { id, user_id: userId },
      data: { leida: true },
    });
  }

  async marcarTodasLeidas(userId: string, tenantId: string) {
    const { count } = await this.prisma.notificacion.updateMany({
      where: { user_id: userId, tenant_id: tenantId, leida: false },
      data: { leida: true },
    });
    return { updated: count };
  }

  // ─── Private helpers ────────────────────────────────────────

  private async dispatchEmail(dto: CreateNotificacionDto, notificacionId: string): Promise<void> {
    if (!this.email.isConfigured) return;

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { email: true },
    });

    if (!user?.email) return;

    await this.email.send({
      to: user.email,
      tipo: dto.tipo,
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      tenantId: dto.tenantId,
      notificacionId,
      entidad: dto.entidad,
      entidadId: dto.entidadId,
    });
  }
}
