import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrigenCliente } from '@prisma/client';
import { CreateClienteDto, UpdateClienteDto, FiltrosClienteDto } from './dto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateClienteDto, userId: string) {
    // Duplicate detection by email within tenant
    if (dto.email) {
      const existing = await this.prisma.cliente.findFirst({
        where: { tenant_id: tenantId, email: dto.email },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un cliente con email ${dto.email}: ${existing.nombre}`);
      }
    }

    return this.prisma.cliente.create({
      data: {
        tenant_id: tenantId,
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono,
        dpi: dto.dpi,
        origen: (dto.origen as OrigenCliente) || 'OTRO',
        notas: dto.notas,
        agente_id: dto.agenteId || userId,
      },
      include: {
        agente: { select: { id: true, nombre: true } },
        _count: { select: { intereses: true } },
      },
    });
  }

  async findAll(tenantId: string, filtros: FiltrosClienteDto) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };
    if (filtros.origen) where.origen = filtros.origen;
    if (filtros.agenteId) where.agente_id = filtros.agenteId;

    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { email: { contains: filtros.busqueda, mode: 'insensitive' } },
        { telefono: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        include: {
          agente: { select: { id: true, nombre: true } },
          _count: { select: { intereses: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        agente: { select: { id: true, nombre: true, email: true } },
        intereses: {
          include: {
            propiedad: { select: { id: true, titulo: true, codigo: true, tipo: true, estado: true, precio_venta: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async update(tenantId: string, id: string, dto: UpdateClienteDto) {
    await this.findOne(tenantId, id);

    if (dto.email) {
      const existing = await this.prisma.cliente.findFirst({
        where: { tenant_id: tenantId, email: dto.email, NOT: { id } },
      });
      if (existing) throw new ConflictException(`Email ${dto.email} ya registrado para: ${existing.nombre}`);
    }

    return this.prisma.cliente.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        email: dto.email,
        telefono: dto.telefono,
        dpi: dto.dpi,
        origen: dto.origen as OrigenCliente | undefined,
        notas: dto.notas,
        agente_id: dto.agenteId,
      },
      include: { agente: { select: { id: true, nombre: true } } },
    });
  }

  async getStats(tenantId: string) {
    const [total, porOrigen] = await Promise.all([
      this.prisma.cliente.count({ where: { tenant_id: tenantId } }),
      this.prisma.cliente.groupBy({
        by: ['origen'],
        where: { tenant_id: tenantId },
        _count: true,
      }),
    ]);
    return { total, porOrigen };
  }
}
