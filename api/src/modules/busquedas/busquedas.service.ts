import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class BusquedasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, clienteId: string) {
    return this.prisma.busquedaGuardada.findMany({
      where: { tenant_id: tenantId, cliente_id: clienteId },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(
    tenantId: string,
    clienteId: string,
    nombre: string,
    filtros: Record<string, unknown>,
    alertas = true,
  ) {
    return this.prisma.busquedaGuardada.create({
      data: {
        id: randomUUID(),
        tenant_id: tenantId,
        cliente_id: clienteId,
        nombre,
        filtros: filtros as Prisma.InputJsonValue,
        alertas,
      },
    });
  }

  async delete(tenantId: string, clienteId: string, id: string) {
    const b = await this.prisma.busquedaGuardada.findFirst({
      where: { id, tenant_id: tenantId, cliente_id: clienteId },
    });
    if (!b) throw new NotFoundException('Búsqueda no encontrada');
    await this.prisma.busquedaGuardada.delete({ where: { id } });
    return { deleted: true };
  }
}
