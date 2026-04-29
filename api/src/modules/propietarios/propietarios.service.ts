import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropietarioDto, UpdatePropietarioDto } from './dto';

@Injectable()
export class PropietariosService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePropietarioDto) {
    // Duplicate detection by DPI
    if (dto.dpi) {
      const existing = await this.prisma.propietario.findFirst({
        where: { tenant_id: tenantId, dpi: dto.dpi },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un propietario con DPI ${dto.dpi}: ${existing.nombre}`);
      }
    }

    return this.prisma.propietario.create({
      data: {
        tenant_id: tenantId,
        nombre: dto.nombre,
        telefono: dto.telefono,
        email: dto.email,
        dpi: dto.dpi,
        nit: dto.nit,
        direccion: dto.direccion,
        notas: dto.notas,
      },
      include: { propiedades: { select: { id: true, titulo: true, codigo: true } } },
    });
  }

  async findAll(tenantId: string, busqueda?: string) {
    const where: any = { tenant_id: tenantId };

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { dpi: { contains: busqueda, mode: 'insensitive' } },
        { email: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    return this.prisma.propietario.findMany({
      where,
      include: {
        _count: { select: { propiedades: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const propietario = await this.prisma.propietario.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        propiedades: {
          select: { id: true, titulo: true, codigo: true, estado: true, tipo: true },
        },
      },
    });

    if (!propietario) throw new NotFoundException('Propietario no encontrado');
    return propietario;
  }

  async update(tenantId: string, id: string, dto: UpdatePropietarioDto) {
    await this.findOne(tenantId, id);

    // Check DPI uniqueness if changing
    if (dto.dpi) {
      const existing = await this.prisma.propietario.findFirst({
        where: { tenant_id: tenantId, dpi: dto.dpi, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`DPI ${dto.dpi} ya está registrado para: ${existing.nombre}`);
      }
    }

    return this.prisma.propietario.update({
      where: { id },
      data: dto,
      include: { propiedades: { select: { id: true, titulo: true, codigo: true } } },
    });
  }
}
