import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTareaDto, UpdateTareaDto } from './dto';

@Injectable()
export class TareasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string) {
    return this.prisma.tarea.findMany({
      where: { tenant_id: tenantId, user_id: userId },
      orderBy: [
        { estado: 'asc' },
        { prioridad: 'desc' },
        { fecha_limite: 'asc' },
        { created_at: 'desc' },
      ],
    });
  }

  async create(tenantId: string, userId: string, dto: CreateTareaDto) {
    return this.prisma.tarea.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        prioridad: dto.prioridad,
        fecha_limite: dto.fechaLimite ? new Date(dto.fechaLimite) : undefined,
      },
    });
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateTareaDto,
  ) {
    const tarea = await this.prisma.tarea.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    if (tarea.user_id !== userId)
      throw new ForbiddenException('No puedes modificar esta tarea');

    // Solo tocar completed_at cuando el update realmente cambia el estado;
    // de lo contrario un PATCH parcial (ej. solo el título) borraría la
    // fecha de completado de una tarea ya COMPLETADA.
    const completedAt =
      dto.estado === undefined
        ? undefined
        : dto.estado === 'COMPLETADA' && tarea.estado !== 'COMPLETADA'
          ? new Date()
          : dto.estado !== 'COMPLETADA'
            ? null
            : undefined;

    return this.prisma.tarea.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        estado: dto.estado,
        prioridad: dto.prioridad,
        fecha_limite:
          dto.fechaLimite !== undefined
            ? dto.fechaLimite
              ? new Date(dto.fechaLimite)
              : null
            : undefined,
        ...(completedAt !== undefined ? { completed_at: completedAt } : {}),
      },
    });
  }

  async remove(tenantId: string, userId: string, id: string) {
    const tarea = await this.prisma.tarea.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    if (tarea.user_id !== userId)
      throw new ForbiddenException('No puedes eliminar esta tarea');
    await this.prisma.tarea.delete({ where: { id } });
    return { deleted: true };
  }
}
