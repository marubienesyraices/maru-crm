import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoInteraccion, ResultadoInteraccion } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateInteraccionDto } from './dto';
import { randomUUID } from 'crypto';

// F-18: Parse @[nombre] mentions from notes text
function parseMentions(text?: string): string[] {
  if (!text) return [];
  const matches = text.match(/@\[([^\]]+)\]/g) ?? [];
  return matches.map((m) => m.slice(2, -1).trim());
}

@Injectable()
export class InteraccionesService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  async create(tenantId: string, usuarioId: string, dto: CreateInteraccionDto) {
    const interes = await this.findInteresWithTenantCheck(tenantId, dto.interesId);
    if (!interes) throw new NotFoundException('Trámite no encontrado');

    // F-18: Resolve @mentions from notas
    const mentionNames = parseMentions(dto.notas);
    const mentionedUsers: { id: string; nombre: string }[] = [];

    if (mentionNames.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { tenant_id: tenantId, nombre: { in: mentionNames }, estado: 'ACTIVO' },
        select: { id: true, nombre: true },
      });
      mentionedUsers.push(...users);
    }

    const interaccion = await this.prisma.interaccion.create({
      data: {
        interes_id: dto.interesId,
        usuario_id: usuarioId,
        tipo: dto.tipo as TipoInteraccion,
        resultado: (dto.resultado as ResultadoInteraccion) ?? 'NEUTRO',
        notas: dto.notas,
        menciones: mentionedUsers.map((u) => ({ id: u.id, nombre: u.nombre })),
        duracion_min: dto.duracionMin,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    // Send notifications to mentioned users (fire-and-forget)
    if (mentionedUsers.length > 0) {
      const notifData = mentionedUsers
        .filter((u) => u.id !== usuarioId)
        .map((u) => ({
          id: randomUUID(),
          tenant_id: tenantId,
          user_id: u.id,
          tipo: 'MENCION' as const,
          titulo: `Te mencionaron en una nota`,
          mensaje: `${interaccion.usuario.nombre} te mencionó: ${(dto.notas ?? '').slice(0, 120)}`,
          entidad: 'Interaccion',
          entidad_id: interaccion.id,
        }));
      if (notifData.length > 0) {
        this.prisma.notificacion.createMany({ data: notifData }).catch(() => {});
      }
    }

    return interaccion;
  }

  async findByInteres(tenantId: string, interesId: string) {
    const interes = await this.findInteresWithTenantCheck(tenantId, interesId);
    if (!interes) throw new NotFoundException('Trámite no encontrado');

    return this.prisma.interaccion.findMany({
      where: { interes_id: interesId },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async delete(tenantId: string, id: string) {
    const interaccion = await this.prisma.interaccion.findFirst({
      where: { id },
      include: { interes: { include: { cliente: { select: { tenant_id: true } } } } },
    });

    if (!interaccion || interaccion.interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Interacción no encontrada');
    }

    await this.prisma.interaccion.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Private ────────────────────────────────────────────────

  private async findInteresWithTenantCheck(tenantId: string, interesId: string) {
    const interes = await this.prisma.clientePropiedad.findFirst({
      where: { id: interesId },
      include: { cliente: { select: { tenant_id: true } } },
    });
    if (!interes || interes.cliente.tenant_id !== tenantId) return null;
    return interes;
  }
}
