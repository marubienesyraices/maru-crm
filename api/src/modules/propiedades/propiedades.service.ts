import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoPropiedad, TipoGestion, EstadoPropiedad } from '@prisma/client';
import { CreatePropiedadDto, UpdatePropiedadDto, CambiarEstadoDto, FiltrosPropiedadDto } from './dto';

// ─── State Machine ────────────────────────────────────────────
// Defines valid transitions from each state
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  BORRADOR: ['DISPONIBLE', 'SUSPENDIDA'],
  DISPONIBLE: ['RESERVADA', 'EN_NEGOCIACION', 'SUSPENDIDA'],
  RESERVADA: ['EN_NEGOCIACION', 'DISPONIBLE', 'SUSPENDIDA'],
  EN_NEGOCIACION: ['VENDIDA', 'RENTADA', 'DISPONIBLE', 'SUSPENDIDA'],
  VENDIDA: [],       // Terminal state
  RENTADA: ['DISPONIBLE'],  // Can be re-listed
  SUSPENDIDA: ['BORRADOR', 'DISPONIBLE'],
};

@Injectable()
export class PropiedadesService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE ─────────────────────────────────────────────────

  async create(tenantId: string, dto: CreatePropiedadDto, userId: string) {
    // Check property limit
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const count = await this.prisma.propiedad.count({ where: { tenant_id: tenantId } });
    if (count >= tenant.limite_propiedades) {
      throw new BadRequestException(`Límite de propiedades alcanzado (${tenant.limite_propiedades})`);
    }

    // Generate unique code: MARU-CASA-001
    const prefix = dto.tipo.substring(0, 4).toUpperCase();
    const nextNum = count + 1;
    const codigo = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    return this.prisma.propiedad.create({
      data: {
        tenant_id: tenantId,
        codigo,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo as TipoPropiedad,
        gestion: dto.gestion as TipoGestion,
        precio_venta: dto.precioVenta,
        precio_renta: dto.precioRenta,
        moneda: dto.moneda || 'GTQ',
        comision_porcentaje: dto.comisionPorcentaje,
        pais: dto.pais,
        departamento: dto.departamento,
        municipio: dto.municipio,
        zona: dto.zona,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        area_terreno_m2: dto.areaTerrenoM2,
        area_construccion_m2: dto.areaConstruccionM2,
        habitaciones: dto.habitaciones,
        banos: dto.banos,
        parqueos: dto.parqueos,
        niveles: dto.niveles,
        ano_construccion: dto.anoConstruccion,
        amenidades: dto.amenidades || [],
        propietario_id: dto.propietarioId,
        agente_id: dto.agenteId || userId,
      },
      include: { propietario: true, agente: { select: { id: true, nombre: true, email: true } } },
    });
  }

  // ─── FIND ALL (with filters) ────────────────────────────────

  async findAll(tenantId: string, filtros: FiltrosPropiedadDto, visibleUserIds?: string[] | null) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };

    // Hierarchy visibility: filter by agente_id if not admin
    if (visibleUserIds) {
      where.agente_id = { in: visibleUserIds };
    }

    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.gestion) where.gestion = filtros.gestion;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.pais) where.pais = filtros.pais;
    if (filtros.departamento) where.departamento = filtros.departamento;
    if (filtros.municipio) where.municipio = filtros.municipio;
    if (filtros.habitacionesMin) where.habitaciones = { gte: filtros.habitacionesMin };

    if (filtros.precioMin || filtros.precioMax) {
      where.OR = [];
      if (filtros.precioMin) {
        where.OR.push({ precio_venta: { gte: filtros.precioMin } });
        where.OR.push({ precio_renta: { gte: filtros.precioMin } });
      }
    }

    if (filtros.busqueda) {
      where.OR = [
        { titulo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { direccion: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.propiedad.findMany({
        where,
        include: {
          propietario: { select: { id: true, nombre: true } },
          agente: { select: { id: true, nombre: true } },
          imagenes: { where: { tipo: 'portada' }, take: 1 },
          _count: { select: { imagenes: true, documentos: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.propiedad.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── FIND ONE ───────────────────────────────────────────────

  async findOne(tenantId: string, id: string) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        propietario: true,
        agente: { select: { id: true, nombre: true, email: true, rol: true } },
        imagenes: { orderBy: { orden: 'asc' } },
        documentos: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');
    return propiedad;
  }

  // ─── UPDATE ─────────────────────────────────────────────────

  async update(tenantId: string, id: string, dto: UpdatePropiedadDto) {
    await this.findOne(tenantId, id);

    return this.prisma.propiedad.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo as TipoPropiedad | undefined,
        gestion: dto.gestion as TipoGestion | undefined,
        precio_venta: dto.precioVenta,
        precio_renta: dto.precioRenta,
        moneda: dto.moneda,
        comision_porcentaje: dto.comisionPorcentaje,
        pais: dto.pais,
        departamento: dto.departamento,
        municipio: dto.municipio,
        zona: dto.zona,
        direccion: dto.direccion,
        latitud: dto.latitud,
        longitud: dto.longitud,
        area_terreno_m2: dto.areaTerrenoM2,
        area_construccion_m2: dto.areaConstruccionM2,
        habitaciones: dto.habitaciones,
        banos: dto.banos,
        parqueos: dto.parqueos,
        niveles: dto.niveles,
        ano_construccion: dto.anoConstruccion,
        amenidades: dto.amenidades,
        propietario_id: dto.propietarioId,
        agente_id: dto.agenteId,
      },
      include: {
        propietario: true,
        agente: { select: { id: true, nombre: true, email: true } },
      },
    });
  }

  // ─── CAMBIAR ESTADO (State Machine) ────────────────────────

  async cambiarEstado(tenantId: string, id: string, dto: CambiarEstadoDto) {
    const propiedad = await this.findOne(tenantId, id);

    const estadoActual = propiedad.estado;
    const nuevoEstado = dto.nuevoEstado;

    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] || [];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${estadoActual} → ${nuevoEstado}. ` +
        `Transiciones permitidas: ${transicionesPermitidas.join(', ') || 'ninguna (estado terminal)'}`,
      );
    }

    return this.prisma.propiedad.update({
      where: { id },
      data: { estado: nuevoEstado as EstadoPropiedad },
    });
  }

  // ─── STATS ──────────────────────────────────────────────────

  async getStats(tenantId: string, visibleUserIds?: string[] | null) {
    const where: any = { tenant_id: tenantId };
    if (visibleUserIds) {
      where.agente_id = { in: visibleUserIds };
    }

    const [total, porEstado, porTipo] = await Promise.all([
      this.prisma.propiedad.count({ where }),
      this.prisma.propiedad.groupBy({
        by: ['estado'],
        where,
        _count: true,
      }),
      this.prisma.propiedad.groupBy({
        by: ['tipo'],
        where,
        _count: true,
      }),
    ]);

    return { total, porEstado, porTipo };
  }
}
