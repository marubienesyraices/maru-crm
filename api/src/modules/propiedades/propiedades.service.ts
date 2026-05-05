import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoPropiedad, TipoGestion, EstadoPropiedad } from '@prisma/client';
import { CreatePropiedadDto, UpdatePropiedadDto, CambiarEstadoDto, FiltrosPropiedadDto } from './dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

// ─── State Machine ────────────────────────────────────────────
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  BORRADOR: ['DISPONIBLE', 'SUSPENDIDA'],
  DISPONIBLE: ['RESERVADA', 'EN_NEGOCIACION', 'SUSPENDIDA'],
  RESERVADA: ['EN_NEGOCIACION', 'DISPONIBLE', 'SUSPENDIDA'],
  EN_NEGOCIACION: ['VENDIDA', 'RENTADA', 'DISPONIBLE', 'SUSPENDIDA'],
  VENDIDA: [],
  RENTADA: ['DISPONIBLE'],
  SUSPENDIDA: ['BORRADOR', 'DISPONIBLE'],
};

@Injectable()
export class PropiedadesService {
  private readonly logger = new Logger(PropiedadesService.name);

  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
    private config: ConfigService,
  ) {}

  // ─── CREATE ─────────────────────────────────────────────────

  async create(tenantId: string, dto: CreatePropiedadDto, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const count = await this.prisma.propiedad.count({ where: { tenant_id: tenantId } });
    if (count >= tenant.limite_propiedades) {
      throw new BadRequestException(`Límite de propiedades alcanzado (${tenant.limite_propiedades})`);
    }

    const prefix = dto.tipo.substring(0, 4).toUpperCase();
    const nextNum = count + 1;
    const codigo = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    let latitud = dto.latitud;
    let longitud = dto.longitud;
    if (!latitud || !longitud) {
      const coords = await this.geocodeFromDto(dto);
      if (coords) { latitud = coords.lat; longitud = coords.lng; }
    }

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
        latitud,
        longitud,
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
    const existing = await this.findOne(tenantId, id);

    let latitud = dto.latitud;
    let longitud = dto.longitud;

    const addressChanged =
      dto.direccion !== undefined || dto.municipio !== undefined ||
      dto.departamento !== undefined || dto.zona !== undefined;

    if (addressChanged && !latitud && !longitud) {
      const merged = {
        direccion: dto.direccion ?? existing.direccion ?? undefined,
        zona: dto.zona ?? existing.zona ?? undefined,
        municipio: dto.municipio ?? existing.municipio ?? undefined,
        departamento: dto.departamento ?? existing.departamento ?? undefined,
        pais: dto.pais ?? existing.pais ?? undefined,
      };
      const coords = await this.geocodeFromDto(merged as any);
      if (coords) { latitud = coords.lat; longitud = coords.lng; }
    }

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
        latitud,
        longitud,
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

    const updated = await this.prisma.propiedad.update({
      where: { id },
      data: { estado: nuevoEstado as EstadoPropiedad },
    });

    // Fire-and-forget: notify agents whose clients match this property
    if (nuevoEstado === 'DISPONIBLE') {
      this.notificarClientesMatching(tenantId, propiedad).catch(() => {});
    }

    return updated;
  }

  // ─── STATS ──────────────────────────────────────────────────

  async getStats(tenantId: string, visibleUserIds?: string[] | null) {
    const where: any = { tenant_id: tenantId };
    if (visibleUserIds) {
      where.agente_id = { in: visibleUserIds };
    }

    const [total, porEstadoRaw, porTipoRaw] = await Promise.all([
      this.prisma.propiedad.count({ where }),
      this.prisma.propiedad.groupBy({ by: ['estado'], where, _count: true }),
      this.prisma.propiedad.groupBy({ by: ['tipo'], where, _count: true }),
    ]);

    return {
      total,
      porEstado: porEstadoRaw.map((r) => ({ estado: r.estado, _count: (r._count as any)._all ?? r._count })),
      porTipo: porTipoRaw.map((r) => ({ tipo: r.tipo, _count: (r._count as any)._all ?? r._count })),
    };
  }

  // ─── PRIVATE: geocoding ─────────────────────────────────────

  private async geocodeFromDto(
    dto: Pick<CreatePropiedadDto, 'direccion' | 'zona' | 'municipio' | 'departamento' | 'pais'>,
  ): Promise<{ lat: number; lng: number } | null> {
    const token = this.config.get<string>('MAPBOX_TOKEN');
    if (!token) return null;

    const parts = [
      dto.direccion,
      dto.zona ? `Zona ${dto.zona}` : null,
      dto.municipio,
      dto.departamento,
      dto.pais ?? 'Guatemala',
    ].filter(Boolean);

    if (parts.length < 2) return null;

    const query = encodeURIComponent(parts.join(', '));
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=GT&limit=1&access_token=${token}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const json: any = await res.json();
      const center: [number, number] | undefined = json?.features?.[0]?.center;
      if (!center) return null;
      return { lat: center[1], lng: center[0] };
    } catch (err) {
      this.logger.warn(`Geocoding failed: ${err}`);
      return null;
    }
  }

  // ─── PRIVATE: matching clients → notifications ──────────────

  private async notificarClientesMatching(tenantId: string, propiedad: any) {
    const andConditions: any[] = [];

    // tipo_interes must match or be unset
    andConditions.push({
      OR: [{ tipo_interes: null }, { tipo_interes: propiedad.tipo }],
    });

    // gestion_interes must match or be unset
    if (propiedad.gestion !== 'AMBAS') {
      andConditions.push({
        OR: [{ gestion_interes: null }, { gestion_interes: propiedad.gestion }, { gestion_interes: 'AMBAS' }],
      });
    }

    // habitaciones_min must be <= property's habitaciones
    if (propiedad.habitaciones != null) {
      andConditions.push({
        OR: [{ habitaciones_min: null }, { habitaciones_min: { lte: propiedad.habitaciones } }],
      });
    } else {
      andConditions.push({ habitaciones_min: null });
    }

    // presupuesto_max must cover the property price
    const precio = propiedad.precio_venta ?? propiedad.precio_renta;
    if (precio) {
      andConditions.push({
        OR: [{ presupuesto_max: null }, { presupuesto_max: { gte: precio } }],
      });
    }

    // At least one preference must be set to avoid matching everyone
    andConditions.push({
      OR: [
        { tipo_interes: { not: null } },
        { gestion_interes: { not: null } },
        { presupuesto_max: { not: null } },
        { habitaciones_min: { not: null } },
      ],
    });

    const clientes = await this.prisma.cliente.findMany({
      where: {
        tenant_id: tenantId,
        AND: andConditions,
        NOT: { intereses: { some: { propiedad_id: propiedad.id } } },
      },
      select: { id: true, nombre: true, agente_id: true },
    });

    if (!clientes.length) return;

    await Promise.all(
      clientes
        .filter((c: any) => c.agente_id)
        .map((c: any) =>
          this.notificacionesService.create({
            tenantId,
            userId: c.agente_id,
            tipo: 'MATCH_PROPIEDAD',
            titulo: `Nueva propiedad para ${c.nombre}`,
            mensaje: `${propiedad.codigo} — ${propiedad.titulo} coincide con las preferencias de ${c.nombre}`,
            entidad: 'propiedad',
            entidadId: propiedad.id,
          }),
        ),
    );
  }
}
