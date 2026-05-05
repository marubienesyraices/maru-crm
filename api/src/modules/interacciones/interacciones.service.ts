import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoInteraccion, ResultadoInteraccion } from '@prisma/client';
import { CreateInteraccionDto } from './dto';

@Injectable()
export class InteraccionesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, usuarioId: string, dto: CreateInteraccionDto) {
    const interes = await this.findInteresWithTenantCheck(tenantId, dto.interesId);
    if (!interes) throw new NotFoundException('Trámite no encontrado');

    return this.prisma.interaccion.create({
      data: {
        interes_id: dto.interesId,
        usuario_id: usuarioId,
        tipo: dto.tipo as TipoInteraccion,
        resultado: (dto.resultado as ResultadoInteraccion) ?? 'NEUTRO',
        notas: dto.notas,
        duracion_min: dto.duracionMin,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });
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
