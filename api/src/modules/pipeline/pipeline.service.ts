import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
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

  async crearInteres(tenantId: string, dto: CreateInteresDto, userId?: string) {
    // Verify client belongs to tenant
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, tenant_id: tenantId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    // If client has no agent, assign the one who is creating the interest
    if (!cliente.agente_id && userId) {
      await this.prisma.cliente.update({
        where: { id: cliente.id },
        data: { agente_id: userId },
      });
    }

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

  async cambiarEstado(
    tenantId: string,
    id: string,
    dto: CambiarEstadoInteresDto,
    usuarioRol: string = 'ADMIN',
    usuarioId: string = '',
    visibleUserIds: string[] | null = null,
  ) {
    const interes = await this.findOneWithTenantCheck(tenantId, id);

    // ─── RBAC ─────────────────────────────────────────────────
    const clienteAgenteId = interes.cliente?.agente_id ?? null;
    if (usuarioRol === 'JUNIOR') {
      if (clienteAgenteId !== usuarioId)
        throw new ForbiddenException('Solo puedes modificar trámites de tus propios clientes');
      if (dto.nuevoEstado === 'GANADO')
        throw new ForbiddenException('JUNIOR no puede cerrar trámites como Ganados. Solicita aprobación a tu supervisor.');
    } else if (usuarioRol === 'SENIOR') {
      if (visibleUserIds && clienteAgenteId && !visibleUserIds.includes(clienteAgenteId))
        throw new ForbiddenException('No tienes permiso para modificar este trámite');
    }

    // ─── State machine ─────────────────────────────────────────
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

    // ─── Pipeline data ─────────────────────────────────────────
    const pipelineData: any = { estado: nuevoEstado as EstadoInteres };
    if (nuevoEstado === 'CONTACTADO' && !interes.fecha_contacto) {
      pipelineData.fecha_contacto = new Date();
    }
    if (nuevoEstado === 'GANADO' || nuevoEstado === 'PERDIDO') {
      pipelineData.fecha_cierre = new Date();
    }
    if (dto.motivoPerdida) pipelineData.motivo_perdida = dto.motivoPerdida;
    if (nuevoEstado === 'NUEVO') {
      pipelineData.motivo_perdida = null;
      pipelineData.fecha_cierre = null;
    }

    const pipelineInclude = {
      cliente: { select: { id: true, nombre: true } },
      propiedad: { select: { id: true, titulo: true, codigo: true } },
    };

    const propiedadId = interes.propiedad_id;

    // ─── Concurrency: INTERESADO → EN_NEGOCIACION ──────────────
    // Lock property atomically: DISPONIBLE → RESERVADA
    if (estadoActual === 'INTERESADO' && nuevoEstado === 'EN_NEGOCIACION') {
      return this.prisma.$transaction(async (tx) => {
        const prop = await tx.propiedad.findUnique({
          where: { id: propiedadId },
          select: { estado: true },
        });

        if (!prop) throw new NotFoundException('Propiedad no encontrada');
        if (prop.estado !== 'DISPONIBLE') {
          throw new ConflictException(
            `La propiedad ya está en "${prop.estado}" y no puede entrar en negociación`,
          );
        }

        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: 'RESERVADA' } });
        return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
      });
    }

    // ─── Concurrency: EN_NEGOCIACION → GANADO ─────────────────
    // Close property (RESERVADA → VENDIDA/RENTADA) and calculate commission
    if (estadoActual === 'EN_NEGOCIACION' && nuevoEstado === 'GANADO') {
      return this.prisma.$transaction(async (tx) => {
        const prop = await tx.propiedad.findUnique({
          where: { id: propiedadId },
          select: { gestion: true, precio_venta: true, precio_renta: true, comision_porcentaje: true },
        });

        const estadoPropFinal = prop?.gestion === 'RENTA' ? 'RENTADA' : 'VENDIDA';

        // Determine closing price: agent-provided override or listed price
        const precioLista = prop?.gestion === 'RENTA' ? prop?.precio_renta : prop?.precio_venta;
        const precioCierre = dto.precioAcordado != null
          ? dto.precioAcordado
          : precioLista != null ? Number(precioLista) : null;

        if (precioCierre != null) pipelineData.precio_cierre = precioCierre;

        if (precioCierre != null && prop?.comision_porcentaje != null) {
          const pct = Number(prop.comision_porcentaje);
          pipelineData.comision_calculada = Math.round(precioCierre * (pct / 100) * 100) / 100;
        }

        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: estadoPropFinal } });
        return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
      });
    }

    // ─── Concurrency: EN_NEGOCIACION → PERDIDO ────────────────
    // Release property: RESERVADA → DISPONIBLE
    if (estadoActual === 'EN_NEGOCIACION' && nuevoEstado === 'PERDIDO') {
      return this.prisma.$transaction(async (tx) => {
        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: 'DISPONIBLE' } });
        return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
      });
    }

    // ─── Default: no property side-effect ─────────────────────
    return this.prisma.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
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

  async getPipeline(tenantId: string, visibleUserIds: string[] | null = null) {
    const clienteFilter: any = { tenant_id: tenantId };
    if (visibleUserIds) {
      clienteFilter.OR = [
        { agente_id: { in: visibleUserIds } },
        { agente_id: null },
      ];
    }

    const items = await this.prisma.clientePropiedad.findMany({
      where: { cliente: clienteFilter },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true, origen: true } },
        propiedad: {
          select: {
            id: true, titulo: true, codigo: true, tipo: true, gestion: true,
            precio_venta: true, precio_renta: true, comision_porcentaje: true, moneda: true,
          },
        },
        _count: { select: { interacciones: true } },
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

  async getStats(tenantId: string, visibleUserIds: string[] | null = null) {
    const clienteFilter: any = { tenant_id: tenantId };
    if (visibleUserIds) clienteFilter.agente_id = { in: visibleUserIds };

    const items = await this.prisma.clientePropiedad.findMany({
      where: { cliente: clienteFilter },
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
      include: { cliente: { select: { tenant_id: true, agente_id: true } } },
    });
    if (!interes || interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Interés no encontrado');
    }
    return interes;
  }
}
