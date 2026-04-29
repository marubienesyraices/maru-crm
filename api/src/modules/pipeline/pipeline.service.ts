import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoInteres, NivelInteres } from '@prisma/client';
import { CreateInteresDto, CambiarEstadoInteresDto, UpdateInteresDto, FiltrosPipelineDto } from './dto';

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  NUEVO: ['CONTACTADO', 'PERDIDO'],
  CONTACTADO: ['INTERESADO', 'PERDIDO'],
  INTERESADO: ['EN_NEGOCIACION', 'PERDIDO'],
  EN_NEGOCIACION: ['GANADO', 'PERDIDO'],
  GANADO: [],      // terminal
  PERDIDO: ['NUEVO'], // reapertura
};

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async crearInteres(tenantId: string, dto: CreateInteresDto) {
    // Verify client belongs to tenant
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, tenant_id: tenantId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    // Verify property belongs to tenant
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: dto.propiedadId, tenant_id: tenantId },
    });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    // Check uniqueness
    const existing = await this.prisma.clientePropiedad.findFirst({
      where: { cliente_id: dto.clienteId, propiedad_id: dto.propiedadId },
    });
    if (existing) throw new ConflictException('Este cliente ya tiene un interés registrado en esta propiedad');

    return this.prisma.clientePropiedad.create({
      data: {
        cliente_id: dto.clienteId,
        propiedad_id: dto.propiedadId,
        nivel_interes: (dto.nivelInteres as NivelInteres) || 'MEDIO',
        presupuesto: dto.presupuesto,
        notas: dto.notas,
      },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
        propiedad: { select: { id: true, titulo: true, codigo: true, tipo: true, precio_venta: true } },
      },
    });
  }

  async cambiarEstado(tenantId: string, id: string, dto: CambiarEstadoInteresDto) {
    const interes = await this.findOneWithTenantCheck(tenantId, id);

    const estadoActual = interes.estado;
    const nuevoEstado = dto.nuevoEstado;

    const permitidas = TRANSICIONES_VALIDAS[estadoActual] || [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${estadoActual} → ${nuevoEstado}. Permitidas: ${permitidas.join(', ') || 'ninguna (estado terminal)'}`,
      );
    }

    if (nuevoEstado === 'PERDIDO' && !dto.motivoPerdida) {
      throw new BadRequestException('Debe indicar el motivo de pérdida');
    }

    const data: any = { estado: nuevoEstado as EstadoInteres };
    if (nuevoEstado === 'CONTACTADO' && !interes.fecha_contacto) {
      data.fecha_contacto = new Date();
    }
    if (nuevoEstado === 'GANADO' || nuevoEstado === 'PERDIDO') {
      data.fecha_cierre = new Date();
    }
    if (dto.motivoPerdida) data.motivo_perdida = dto.motivoPerdida;
    if (nuevoEstado === 'NUEVO') {
      data.motivo_perdida = null;
      data.fecha_cierre = null;
    }

    return this.prisma.clientePropiedad.update({
      where: { id },
      data,
      include: {
        cliente: { select: { id: true, nombre: true } },
        propiedad: { select: { id: true, titulo: true, codigo: true } },
      },
    });
  }

  async updateInteres(tenantId: string, id: string, dto: UpdateInteresDto) {
    await this.findOneWithTenantCheck(tenantId, id);

    return this.prisma.clientePropiedad.update({
      where: { id },
      data: {
        nivel_interes: dto.nivelInteres as NivelInteres | undefined,
        presupuesto: dto.presupuesto,
        notas: dto.notas,
      },
    });
  }

  async deleteInteres(tenantId: string, id: string) {
    await this.findOneWithTenantCheck(tenantId, id);
    await this.prisma.clientePropiedad.delete({ where: { id } });
    return { deleted: true };
  }

  async getPipeline(tenantId: string) {
    const items = await this.prisma.clientePropiedad.findMany({
      where: {
        cliente: { tenant_id: tenantId },
      },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true, origen: true } },
        propiedad: { select: { id: true, titulo: true, codigo: true, tipo: true, gestion: true, precio_venta: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Group by estado for Kanban columns
    const pipeline: Record<string, typeof items> = {
      NUEVO: [], CONTACTADO: [], INTERESADO: [], EN_NEGOCIACION: [], GANADO: [], PERDIDO: [],
    };
    for (const item of items) {
      pipeline[item.estado]?.push(item);
    }

    return pipeline;
  }

  async getByPropiedad(tenantId: string, propiedadId: string) {
    return this.prisma.clientePropiedad.findMany({
      where: {
        propiedad_id: propiedadId,
        cliente: { tenant_id: tenantId },
      },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStats(tenantId: string) {
    const items = await this.prisma.clientePropiedad.findMany({
      where: { cliente: { tenant_id: tenantId } },
      select: { estado: true, nivel_interes: true },
    });

    const porEstado: Record<string, number> = {};
    const porNivel: Record<string, number> = {};
    for (const item of items) {
      porEstado[item.estado] = (porEstado[item.estado] || 0) + 1;
      porNivel[item.nivel_interes] = (porNivel[item.nivel_interes] || 0) + 1;
    }

    return { total: items.length, porEstado, porNivel };
  }

  private async findOneWithTenantCheck(tenantId: string, id: string) {
    const interes = await this.prisma.clientePropiedad.findFirst({
      where: { id },
      include: { cliente: { select: { tenant_id: true } } },
    });
    if (!interes || interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Interés no encontrado');
    }
    return interes;
  }
}
