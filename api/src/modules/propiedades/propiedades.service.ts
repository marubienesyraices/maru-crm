import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  Propiedad,
  TipoPropiedad,
  TipoGestion,
  EstadoPropiedad,
} from '@prisma/client';
import {
  CreatePropiedadDto,
  UpdatePropiedadDto,
  CambiarEstadoDto,
  FiltrosPropiedadDto,
  PrecioSugeridoQueryDto,
} from './dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EmailService } from '../email/email.service';
import { StorageService } from '../storage/storage.service';

interface PrecioComparable {
  id: string;
  codigo: string;
  titulo: string;
  precio_venta: number | null;
  precio_renta: number | null;
  area_construccion_m2: number | null;
  distancia_m: number | null;
}

// Roles válidos para ser asignado como agente de una propiedad según el plan
const ROLES_AGENTE_NO_FREE = ['SENIOR'];
const ROLES_AGENTE_FREE = ['SENIOR', 'ADMIN'];

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
  private readonly frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
    private config: ConfigService,
    private storageService: StorageService,
    @Optional() private readonly emailService?: EmailService,
  ) {
    this.frontendUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  // ─── VALIDACIÓN DE AGENTE ────────────────────────────────────

  private async validateAgenteParaPropiedad(
    tenantId: string,
    agenteId: string,
    plan: string,
  ): Promise<void> {
    const agente = await this.prisma.user.findFirst({
      where: { id: agenteId, tenant_id: tenantId },
      select: { id: true, nombre: true, rol: true },
    });
    if (!agente)
      throw new BadRequestException(
        'El agente indicado no pertenece a esta empresa',
      );

    const rolesPermitidos =
      plan === 'FREE' ? ROLES_AGENTE_FREE : ROLES_AGENTE_NO_FREE;

    if (!rolesPermitidos.includes(agente.rol)) {
      if (plan === 'FREE') {
        throw new BadRequestException(
          `Solo agentes SENIOR o ADMIN pueden ser asignados a una propiedad. "${agente.nombre}" tiene rol ${agente.rol}.`,
        );
      }
      throw new BadRequestException(
        `Solo agentes SENIOR pueden ser asignados a una propiedad. "${agente.nombre}" tiene rol ${agente.rol}.`,
      );
    }

    // Para planes no FREE: verificar que exista al menos un SENIOR activo en el tenant
    if (plan !== 'FREE') {
      const seniorCount = await this.prisma.user.count({
        where: { tenant_id: tenantId, rol: 'SENIOR', estado: 'ACTIVO' },
      });
      if (seniorCount === 0) {
        throw new BadRequestException(
          'No existe ningún agente SENIOR activo en la empresa. Crea al menos un agente SENIOR antes de registrar propiedades.',
        );
      }
    }
  }

  // ─── CREATE ─────────────────────────────────────────────────

  async create(tenantId: string, dto: CreatePropiedadDto, userId: string) {
    const [tenant, planFeatures] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.tenant
        .findUnique({ where: { id: tenantId }, select: { plan: true } })
        .then((t) =>
          t
            ? this.prisma.catalogoPlan.findUnique({
                where: { plan: t.plan },
                select: { tiene_mapas: true },
              })
            : null,
        ),
    ]);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Si no se especifica agente, solo se autoasigna al creador cuando su rol
    // califica para el plan (ej. ADMIN en plan FREE); si no, la propiedad
    // queda sin agente en vez de fallar la creación con un rol que el
    // usuario nunca eligió explícitamente.
    let agenteIdFinal: string | null = dto.agenteId ?? null;
    if (!agenteIdFinal) {
      const creador = await this.prisma.user.findFirst({
        where: { id: userId, tenant_id: tenantId },
        select: { rol: true },
      });
      const rolesPermitidos =
        tenant.plan === 'FREE' ? ROLES_AGENTE_FREE : ROLES_AGENTE_NO_FREE;
      if (creador && rolesPermitidos.includes(creador.rol)) {
        agenteIdFinal = userId;
      }
    }
    if (agenteIdFinal) {
      await this.validateAgenteParaPropiedad(
        tenantId,
        agenteIdFinal,
        tenant.plan,
      );
    }

    const count = await this.prisma.propiedad.count({
      where: { tenant_id: tenantId },
    });
    if (count >= tenant.limite_propiedades) {
      throw new BadRequestException(
        `Límite de propiedades alcanzado (${tenant.limite_propiedades})`,
      );
    }

    const prefix = dto.tipo.substring(0, 4).toUpperCase();
    const nextNum = count + 1;
    const codigo = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    let latitud = dto.latitud;
    let longitud = dto.longitud;
    if (!latitud || !longitud) {
      if (planFeatures?.tiene_mapas) {
        const coords = await this.geocodeFromDto(dto);
        if (coords) {
          latitud = coords.lat;
          longitud = coords.lng;
        }
      }
    }

    const [propiedad] = await this.prisma.$transaction([
      this.prisma.propiedad.create({
        data: {
          tenant_id: tenantId,
          codigo,
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          tipo: dto.tipo as TipoPropiedad,
          gestion: dto.gestion as TipoGestion,
          mostrar_en_mapa_crm: dto.mostrarEnMapaCrm,
          mostrar_en_portal: dto.mostrarEnPortal,
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
          agente_id: agenteIdFinal,
        },
        include: {
          propietario: true,
          agente: { select: { id: true, nombre: true, email: true } },
        },
      }),
      ...(dto.propietarioId
        ? [
            this.prisma.cliente.update({
              where: { id: dto.propietarioId },
              data: { es_propietario: true },
            }),
          ]
        : []),
    ]);
    return propiedad;
  }

  // ─── FIND ALL (with filters) ────────────────────────────────

  async findAll(
    tenantId: string,
    filtros: FiltrosPropiedadDto,
    visibleUserIds?: string[] | null,
  ) {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PropiedadWhereInput = { tenant_id: tenantId };

    if (visibleUserIds) {
      where.agente_id = { in: visibleUserIds };
    }

    if (filtros.tipo) where.tipo = filtros.tipo as TipoPropiedad;
    if (filtros.gestion) where.gestion = filtros.gestion as TipoGestion;
    if (filtros.estado) where.estado = filtros.estado as EstadoPropiedad;
    if (filtros.pais) where.pais = filtros.pais;
    if (filtros.departamento) where.departamento = filtros.departamento;
    if (filtros.municipio) where.municipio = filtros.municipio;
    if (filtros.habitacionesMin)
      where.habitaciones = { gte: filtros.habitacionesMin };

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
    const [existing, tenant, planFeatures] = await Promise.all([
      this.findOne(tenantId, id),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
      }),
      this.prisma.tenant
        .findUnique({ where: { id: tenantId }, select: { plan: true } })
        .then((t) =>
          t
            ? this.prisma.catalogoPlan.findUnique({
                where: { plan: t.plan },
                select: { tiene_mapas: true },
              })
            : null,
        ),
    ]);

    // Validar rol del nuevo agente solo si se está cambiando
    if (dto.agenteId && dto.agenteId !== existing.agente_id && tenant) {
      await this.validateAgenteParaPropiedad(
        tenantId,
        dto.agenteId,
        tenant.plan,
      );
    }

    let latitud = dto.latitud;
    let longitud = dto.longitud;

    const addressChanged =
      dto.direccion !== undefined ||
      dto.municipio !== undefined ||
      dto.departamento !== undefined ||
      dto.zona !== undefined;

    if (addressChanged && !latitud && !longitud && planFeatures?.tiene_mapas) {
      const merged = {
        direccion: dto.direccion ?? existing.direccion ?? undefined,
        zona: dto.zona ?? existing.zona ?? undefined,
        municipio: dto.municipio ?? existing.municipio ?? undefined,
        departamento: dto.departamento ?? existing.departamento ?? undefined,
        pais: dto.pais ?? existing.pais ?? undefined,
      };
      const coords = await this.geocodeFromDto(merged);
      if (coords) {
        latitud = coords.lat;
        longitud = coords.lng;
      }
    }

    const propiedadUpdate = this.prisma.propiedad.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo as TipoPropiedad | undefined,
        gestion: dto.gestion as TipoGestion | undefined,
        mostrar_en_mapa_crm: dto.mostrarEnMapaCrm,
        mostrar_en_portal: dto.mostrarEnPortal,
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

    const ops: Prisma.PrismaPromise<unknown>[] = [propiedadUpdate];

    // When a new propietario is assigned, mark them as es_propietario
    if (dto.propietarioId && dto.propietarioId !== existing.propietario_id) {
      ops.push(
        this.prisma.cliente.update({
          where: { id: dto.propietarioId },
          data: { es_propietario: true },
        }),
      );
    }

    const [propiedad] = (await this.prisma.$transaction(ops)) as [
      Awaited<typeof propiedadUpdate>,
      ...unknown[],
    ];
    return propiedad;
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
    const where: Prisma.PropiedadWhereInput = { tenant_id: tenantId };
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
      porEstado: porEstadoRaw.map((r) => ({
        estado: r.estado,
        _count: r._count,
      })),
      porTipo: porTipoRaw.map((r) => ({
        tipo: r.tipo,
        _count: r._count,
      })),
    };
  }

  // ─── PRECIO SUGERIDO (PostGIS) ──────────────────────────────

  async getPrecioSugerido(tenantId: string, dto: PrecioSugeridoQueryDto) {
    const radioM = (dto.radioKm ?? 5) * 1000;

    let comparables: PrecioComparable[];
    if (dto.lat != null && dto.lng != null) {
      comparables = await this.queryComparablesByGeo(tenantId, dto, radioM);
    } else {
      comparables = await this.queryComparablesByDepartamento(tenantId, dto);
    }

    const filtered = comparables.filter((c) =>
      dto.gestion === 'VENTA'
        ? c.precio_venta != null
        : dto.gestion === 'RENTA'
          ? c.precio_renta != null
          : c.precio_venta != null || c.precio_renta != null,
    );

    if (!filtered.length) {
      return {
        precio_sugerido_venta: null,
        precio_sugerido_renta: null,
        precio_m2_sugerido: null,
        comparable_count: 0,
        radio_km: dto.radioKm ?? 5,
        confianza: 'SIN_DATOS' as const,
        usa_geo: dto.lat != null && dto.lng != null,
        comparables: [],
      };
    }

    // Promedio ponderado por distancia inversa: peso = 1 / (distancia_m + 100)
    // Propiedades sin coordenadas usan distancia ficticia de 2 500 m
    let sumWV = 0,
      sumPV = 0,
      sumWR = 0,
      sumPR = 0,
      sumWM = 0,
      sumPM = 0;
    for (const c of filtered) {
      const d = c.distancia_m ?? 2500;
      const w = 1 / (d + 100);
      if (c.precio_venta) {
        sumWV += w;
        sumPV += c.precio_venta * w;
        if (c.area_construccion_m2) {
          sumWM += w;
          sumPM += (c.precio_venta / c.area_construccion_m2) * w;
        }
      }
      if (c.precio_renta) {
        sumWR += w;
        sumPR += c.precio_renta * w;
      }
    }

    const n = filtered.length;
    return {
      precio_sugerido_venta: sumWV > 0 ? Math.round(sumPV / sumWV) : null,
      precio_sugerido_renta: sumWR > 0 ? Math.round(sumPR / sumWR) : null,
      precio_m2_sugerido: sumWM > 0 ? Math.round(sumPM / sumWM) : null,
      comparable_count: n,
      radio_km: dto.radioKm ?? 5,
      confianza:
        n >= 5
          ? ('ALTA' as const)
          : n >= 2
            ? ('MEDIA' as const)
            : ('BAJA' as const),
      usa_geo: dto.lat != null && dto.lng != null,
      comparables: filtered.slice(0, 5).map((c) => ({
        id: c.id,
        codigo: c.codigo,
        titulo: c.titulo,
        precio_venta: c.precio_venta,
        precio_renta: c.precio_renta,
        distancia_m: c.distancia_m,
        area_m2: c.area_construccion_m2,
      })),
    };
  }

  /** Haversine distance in metres — no PostGIS required. */
  private haversineM(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6_371_000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async queryComparablesByGeo(
    tenantId: string,
    dto: PrecioSugeridoQueryDto,
    radioM: number,
  ): Promise<PrecioComparable[]> {
    const gestWhere =
      dto.gestion !== 'AMBAS'
        ? {
            OR: [
              { gestion: dto.gestion as TipoGestion },
              { gestion: 'AMBAS' as TipoGestion },
            ],
          }
        : {};

    const rows = await this.prisma.propiedad.findMany({
      where: {
        tenant_id: tenantId,
        tipo: dto.tipo as TipoPropiedad,
        estado: {
          in: ['DISPONIBLE', 'VENDIDA', 'RENTADA'] as EstadoPropiedad[],
        },
        latitud: { not: null },
        longitud: { not: null },
        ...(dto.excludeId ? { id: { not: dto.excludeId } } : {}),
        ...gestWhere,
      },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        precio_venta: true,
        precio_renta: true,
        area_construccion_m2: true,
        latitud: true,
        longitud: true,
      },
    });

    return rows
      .map((r) => ({
        id: r.id,
        codigo: r.codigo,
        titulo: r.titulo,
        precio_venta: r.precio_venta ? Number(r.precio_venta) : null,
        precio_renta: r.precio_renta ? Number(r.precio_renta) : null,
        area_construccion_m2: r.area_construccion_m2
          ? Number(r.area_construccion_m2)
          : null,
        distancia_m: this.haversineM(
          dto.lat!,
          dto.lng!,
          Number(r.latitud),
          Number(r.longitud),
        ),
      }))
      .filter((r) => r.distancia_m <= radioM)
      .sort((a, b) => a.distancia_m - b.distancia_m)
      .slice(0, 20);
  }

  private async queryComparablesByDepartamento(
    tenantId: string,
    dto: PrecioSugeridoQueryDto,
  ): Promise<PrecioComparable[]> {
    const gestWhere =
      dto.gestion !== 'AMBAS'
        ? {
            OR: [
              { gestion: dto.gestion as TipoGestion },
              { gestion: 'AMBAS' as TipoGestion },
            ],
          }
        : {};

    const rows = await this.prisma.propiedad.findMany({
      where: {
        tenant_id: tenantId,
        tipo: dto.tipo as TipoPropiedad,
        estado: {
          in: ['DISPONIBLE', 'VENDIDA', 'RENTADA'] as EstadoPropiedad[],
        },
        ...(dto.departamento ? { departamento: dto.departamento } : {}),
        ...(dto.excludeId ? { id: { not: dto.excludeId } } : {}),
        ...gestWhere,
      },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        precio_venta: true,
        precio_renta: true,
        area_construccion_m2: true,
      },
      take: 20,
    });

    return rows.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      titulo: r.titulo,
      precio_venta: r.precio_venta ? Number(r.precio_venta) : null,
      precio_renta: r.precio_renta ? Number(r.precio_renta) : null,
      area_construccion_m2: r.area_construccion_m2
        ? Number(r.area_construccion_m2)
        : null,
      distancia_m: null,
    }));
  }

  // ─── DELETE ─────────────────────────────────────────────────

  async delete(tenantId: string, id: string): Promise<void> {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        imagenes: {
          select: { url: true, thumbnail_url: true, original_url: true },
        },
        documentos: { select: { url: true } },
        _count: { select: { interesados: true, firma_solicitudes: true } },
      },
    });

    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    if (!['BORRADOR', 'SUSPENDIDA'].includes(propiedad.estado)) {
      throw new BadRequestException(
        `Solo se pueden eliminar propiedades en estado BORRADOR o SUSPENDIDA. Estado actual: ${propiedad.estado}`,
      );
    }

    if (propiedad._count.interesados > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la propiedad tiene clientes interesados en el pipeline.',
      );
    }

    if (propiedad._count.firma_solicitudes > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la propiedad tiene solicitudes de firma registradas.',
      );
    }

    // Collect all file URLs before deletion
    const urlsToDelete: string[] = [];
    for (const img of propiedad.imagenes) {
      if (img.url) urlsToDelete.push(img.url);
      if (img.thumbnail_url) urlsToDelete.push(img.thumbnail_url);
      if (img.original_url) urlsToDelete.push(img.original_url);
    }
    for (const doc of propiedad.documentos) {
      if (doc.url) urlsToDelete.push(doc.url);
    }

    // Collect brochure PDF URLs (no FK, must be deleted manually)
    const brochureJobs = await this.prisma.brochureJob.findMany({
      where: { propiedad_id: id },
      select: { url: true },
    });
    for (const job of brochureJobs) {
      if (job.url) urlsToDelete.push(job.url);
    }

    // Delete orphan records (no FK) then cascade-delete the property
    await this.prisma.$transaction(async (tx) => {
      await tx.brochureJob.deleteMany({ where: { propiedad_id: id } });
      await tx.whatsappEnvio.deleteMany({ where: { propiedad_id: id } });
      await tx.propiedad.delete({ where: { id } });
    });

    // Best-effort: remove files from storage after DB commit
    await Promise.allSettled(
      urlsToDelete.map((url) => this.storageService.remove(url)),
    );
  }

  // ─── PRIVATE: geocoding ─────────────────────────────────────

  private async geocodeFromDto(
    dto: Pick<
      CreatePropiedadDto,
      'direccion' | 'zona' | 'municipio' | 'departamento' | 'pais'
    >,
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
      const json = (await res.json()) as {
        features?: { center?: [number, number] }[];
      };
      const center = json.features?.[0]?.center;
      if (!center) return null;
      return { lat: center[1], lng: center[0] };
    } catch (err) {
      this.logger.warn(`Geocoding failed: ${err}`);
      return null;
    }
  }

  // ─── PRIVATE: matching clients → notifications ──────────────

  private async notificarClientesMatching(
    tenantId: string,
    propiedad: Propiedad,
  ) {
    const andConditions: Prisma.ClienteWhereInput[] = [];

    // tipo_interes must match or be unset
    andConditions.push({
      OR: [{ tipo_interes: null }, { tipo_interes: propiedad.tipo }],
    });

    // gestion_interes must match or be unset
    if (propiedad.gestion !== 'AMBAS') {
      andConditions.push({
        OR: [
          { gestion_interes: null },
          { gestion_interes: propiedad.gestion },
          { gestion_interes: 'AMBAS' },
        ],
      });
    }

    // habitaciones_min must be <= property's habitaciones
    if (propiedad.habitaciones != null) {
      andConditions.push({
        OR: [
          { habitaciones_min: null },
          { habitaciones_min: { lte: propiedad.habitaciones } },
        ],
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
      select: { id: true, nombre: true, agente_id: true, email: true },
    });

    if (!clientes.length) return;

    // Notify agents in-app
    await Promise.all(
      clientes
        .filter((c) => c.agente_id)
        .map((c) =>
          this.notificacionesService.create({
            tenantId,
            userId: c.agente_id!,
            tipo: 'MATCH_PROPIEDAD',
            titulo: `Nueva propiedad para ${c.nombre}`,
            mensaje: `${propiedad.codigo} — ${propiedad.titulo} coincide con las preferencias de ${c.nombre}`,
            entidad: 'propiedad',
            entidadId: propiedad.id,
          }),
        ),
    );

    // Send email alert to each client that has an email address
    if (this.emailService?.isConfigured) {
      await Promise.allSettled(
        clientes
          .filter((c) => c.email)
          .map((c) =>
            this.emailService!.sendHtml({
              to: c.email!,
              subject: `Nueva propiedad disponible — ${propiedad.titulo}`,
              html: this.buildClientMatchHtml(c.nombre, propiedad),
            }),
          ),
      );
    }
  }

  private buildClientMatchHtml(nombre: string, propiedad: Propiedad): string {
    const portalUrl = `${this.frontendUrl}/portal/${propiedad.id}`;

    const precio =
      propiedad.precio_venta != null
        ? `${propiedad.moneda} ${Number(propiedad.precio_venta).toLocaleString('es-GT')} (venta)`
        : propiedad.precio_renta != null
          ? `${propiedad.moneda} ${Number(propiedad.precio_renta).toLocaleString('es-GT')}/mes (renta)`
          : '';

    const ubicacion = [
      propiedad.zona ? `Zona ${propiedad.zona}` : '',
      propiedad.municipio,
      propiedad.departamento,
    ]
      .filter(Boolean)
      .join(', ');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#0f172a;padding:20px 32px;">
            <span style="color:#fff;font-size:1.125rem;font-weight:700;">GestProp</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#475569;line-height:1.7;font-size:.9375rem;">
            <p style="font-size:2rem;margin:0 0 16px;">🏠</p>
            <h2 style="margin:0 0 8px;font-size:1.125rem;color:#0f172a;">¡Hola, ${nombre}!</h2>
            <p style="margin:0 0 20px;">
              Tenemos una propiedad disponible que coincide con lo que estás buscando:
            </p>
            <table cellpadding="0" cellspacing="0" width="100%"
                   style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px;">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:1rem;font-weight:700;color:#0f172a;">${propiedad.titulo}</p>
                  <p style="margin:0 0 4px;font-size:.8125rem;color:#64748b;">Código: ${propiedad.codigo}</p>
                  ${precio ? `<p style="margin:0 0 4px;font-size:.875rem;font-weight:600;color:#0f172a;">${precio}</p>` : ''}
                  ${ubicacion ? `<p style="margin:0;font-size:.8125rem;color:#64748b;">📍 ${ubicacion}</p>` : ''}
                </td>
              </tr>
            </table>
            <a href="${portalUrl}"
               style="display:inline-block;padding:12px 28px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:6px;font-size:.9375rem;font-weight:600;">
              Ver propiedad →
            </a>
            <p style="margin:24px 0 0;font-size:.8125rem;color:#94a3b8;">
              Recibiste este mensaje porque registraste interés en propiedades con características similares.
              Si no deseas más alertas, puedes ignorar este correo.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f8fafc;">
            <p style="margin:0;font-size:.75rem;color:#94a3b8;">GestProp · Portal público</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
