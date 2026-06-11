import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require('xlsx');

const FUNNEL_ESTADOS = ['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_NEGOCIACION', 'GANADO', 'PERDIDO'] as const;
const CACHE_TTL_SEC = 15 * 60; // 15 minutes

const BADGES_DEF = [
  { id: 'top_ventas',   emoji: '🏆', label: 'Top Ventas',    desc: 'Mayor número de cierres en el período' },
  { id: 'top_comision', emoji: '💰', label: 'Top Comisión',   desc: 'Mayor comisión generada' },
  { id: 'mas_activo',   emoji: '⚡', label: 'Más Activo',     desc: 'Más interacciones registradas' },
  { id: 'tour_master',  emoji: '🏠', label: 'Tour Master',    desc: 'Más visitas realizadas' },
  { id: 'elite',        emoji: '🎯', label: 'Élite',          desc: 'Conversión ≥ 70 % con 2+ cierres' },
  { id: 'cerrador',     emoji: '⭐', label: 'Cerrador',       desc: '5 o más cierres en el período' },
  { id: 'en_racha',     emoji: '🔥', label: 'En Racha',       desc: '3 o más cierres en el período' },
];

@Injectable()
export class BiService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    // Purge stale cache entries generated before the tenant isolation fix
    // (old keys used 'undefined' as tenantId when user.tenant_id was used instead of user.tenantId)
    await this.redis.deleteByPattern('bi:undefined:*');
  }

  // ─── Cache helpers ───────────────────────────────────────────

  private cacheKey(tenantId: string, type: string, ...parts: (string | undefined)[]) {
    return `bi:${tenantId}:${type}:${parts.map((p) => p ?? '').join(':')}`;
  }

  private async fromCache<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  private async toCache(key: string, data: unknown): Promise<void> {
    await this.redis.set(key, JSON.stringify(data), CACHE_TTL_SEC);
  }

  async flushTenantCache(tenantId: string): Promise<void> {
    await this.redis.deleteByPattern(`bi:${tenantId}:*`);
  }

  // ─── Resumen del período ─────────────────────────────────────

  async getResumen(tenantId: string, desde?: Date, hasta?: Date) {
    const key = this.cacheKey(tenantId, 'resumen', desde?.toISOString(), hasta?.toISOString());
    const cached = await this.fromCache<unknown>(key);
    if (cached) return cached;

    const dateFilter = this.dateFilter(desde, hasta);

    const [
      ganados, perdidos, comisionRow,
      visitasRealizadas, interacciones, brochures,
      embudoRaw,
    ] = await Promise.all([
      this.prisma.clientePropiedad.count({
        where: { estado: 'GANADO', cliente: { tenant_id: tenantId }, ...(dateFilter && { fecha_cierre: dateFilter }) },
      }),
      this.prisma.clientePropiedad.count({
        where: { estado: 'PERDIDO', cliente: { tenant_id: tenantId }, ...(dateFilter && { fecha_cierre: dateFilter }) },
      }),
      this.prisma.clientePropiedad.aggregate({
        where: { estado: 'GANADO', cliente: { tenant_id: tenantId }, ...(dateFilter && { fecha_cierre: dateFilter }) },
        _sum: { comision_calculada: true },
      }),
      this.prisma.visita.count({
        where: { estado: 'REALIZADA', interes: { cliente: { tenant_id: tenantId } }, ...(dateFilter && { fecha_inicio: dateFilter }) },
      }),
      this.prisma.interaccion.count({
        where: { interes: { cliente: { tenant_id: tenantId } }, ...(dateFilter && { fecha: dateFilter }) },
      }),
      this.prisma.brochureDescarga.count({
        where: { tenant_id: tenantId, ...(dateFilter && { downloaded_at: dateFilter }) },
      }),
      this.prisma.clientePropiedad.groupBy({
        by: ['estado'],
        where: { cliente: { tenant_id: tenantId } },
        _count: { _all: true },
      }),
    ]);

    const total = ganados + perdidos;
    const tasaConversion = total > 0 ? Math.round((ganados / total) * 100) : 0;
    const ingresosTotales = Number(comisionRow._sum.comision_calculada ?? 0);

    const embudoMap: Record<string, number> = {};
    for (const row of embudoRaw) embudoMap[row.estado] = (row._count as any)._all ?? 0;
    const embudo = FUNNEL_ESTADOS.map((e) => ({ estado: e, count: embudoMap[e] ?? 0 }));

    const result = {
      ganados, perdidos, tasaConversion, ingresosTotales,
      visitasRealizadas, interacciones, brochures, embudo,
      cacheAt: new Date().toISOString(),
    };

    await this.toCache(key, result);
    return result;
  }

  // ─── Desempeño por agente ────────────────────────────────────

  async getAgentes(tenantId: string, desde?: Date, hasta?: Date) {
    const key = this.cacheKey(tenantId, 'agentes', desde?.toISOString(), hasta?.toISOString());
    const cached = await this.fromCache<unknown>(key);
    if (cached) return cached;

    const dateFilter = this.dateFilter(desde, hasta);

    const usuarios = await this.prisma.user.findMany({
      where: { tenant_id: tenantId, estado: 'ACTIVO', rol: { not: 'SUPER_ADMIN' } },
      select: { id: true, nombre: true, rol: true },
      orderBy: { nombre: 'asc' },
    });

    const agentes = await Promise.all(
      usuarios.map(async (u) => {
        const [ganados, perdidos, activos, comisionRow, visitasRealizadas, numInteracciones] =
          await Promise.all([
            this.prisma.clientePropiedad.count({
              where: { estado: 'GANADO', cliente: { tenant_id: tenantId, agente_id: u.id }, ...(dateFilter && { fecha_cierre: dateFilter }) },
            }),
            this.prisma.clientePropiedad.count({
              where: { estado: 'PERDIDO', cliente: { tenant_id: tenantId, agente_id: u.id }, ...(dateFilter && { fecha_cierre: dateFilter }) },
            }),
            this.prisma.clientePropiedad.count({
              where: { estado: { notIn: ['GANADO', 'PERDIDO'] }, cliente: { tenant_id: tenantId, agente_id: u.id } },
            }),
            this.prisma.clientePropiedad.aggregate({
              where: { estado: 'GANADO', cliente: { tenant_id: tenantId, agente_id: u.id } },
              _sum: { comision_calculada: true },
            }),
            this.prisma.visita.count({
              where: { agente_id: u.id, estado: 'REALIZADA', interes: { cliente: { tenant_id: tenantId } }, ...(dateFilter && { fecha_inicio: dateFilter }) },
            }),
            this.prisma.interaccion.count({
              where: { usuario_id: u.id, interes: { cliente: { tenant_id: tenantId } }, ...(dateFilter && { fecha: dateFilter }) },
            }),
          ]);

        const totalCerrados = ganados + perdidos;
        return {
          id: u.id,
          nombre: u.nombre,
          rol: u.rol,
          ganados,
          perdidos,
          activos,
          tasaConversion: totalCerrados > 0 ? Math.round((ganados / totalCerrados) * 100) : 0,
          comisionTotal: Number(comisionRow._sum.comision_calculada ?? 0),
          visitasRealizadas,
          numInteracciones,
        };
      }),
    );

    const result = { agentes, cacheAt: new Date().toISOString() };
    await this.toCache(key, result);
    return result;
  }

  // ─── Top propiedades por actividad ───────────────────────────

  async getTopPropiedades(tenantId: string, desde?: Date, hasta?: Date, limit = 10) {
    const key = this.cacheKey(tenantId, 'top', desde?.toISOString(), hasta?.toISOString(), String(limit));
    const cached = await this.fromCache<unknown>(key);
    if (cached) return cached;

    const dateFilter = this.dateFilter(desde, hasta);

    const props = await this.prisma.propiedad.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true, codigo: true, titulo: true, tipo: true, estado: true,
        agente: { select: { nombre: true } },
        interesados: {
          select: {
            id: true,
            interacciones: {
              where: dateFilter ? { fecha: dateFilter } : undefined,
              select: { id: true },
            },
            visitas: {
              where: dateFilter ? { fecha_inicio: dateFilter } : undefined,
              select: { id: true },
            },
          },
        },
      },
    });

    let brochureDateWhere: Prisma.Sql = Prisma.empty;
    if (desde && hasta) brochureDateWhere = Prisma.sql`AND bd.downloaded_at >= ${desde} AND bd.downloaded_at <= ${hasta}`;
    else if (desde)     brochureDateWhere = Prisma.sql`AND bd.downloaded_at >= ${desde}`;
    else if (hasta)     brochureDateWhere = Prisma.sql`AND bd.downloaded_at <= ${hasta}`;

    const brochureRows = await this.prisma.$queryRaw<{ propiedad_id: string; total: bigint }[]>`
      SELECT bj.propiedad_id, COUNT(bd.id) AS total
      FROM brochure_descargas bd
      JOIN brochure_jobs bj ON bd.job_id = bj.id
      WHERE bj.tenant_id = ${tenantId}
      ${brochureDateWhere}
      GROUP BY bj.propiedad_id
    `;
    const brochureMap: Record<string, number> = {};
    for (const r of brochureRows) brochureMap[r.propiedad_id] = Number(r.total);

    // §15 CA-2: Favoritos (2pts each) — count per property
    const favRows = await this.prisma.$queryRaw<{ propiedad_id: string; total: bigint }[]>`
      SELECT propiedad_id, COUNT(id) AS total
      FROM favoritos
      WHERE tenant_id = ${tenantId}
      GROUP BY propiedad_id
    `;
    const favMap: Record<string, number> = {};
    for (const r of favRows) favMap[r.propiedad_id] = Number(r.total);

    // §15 CA-2: Correos abiertos (2pts) — link email_eventos to properties via client email
    let emailDateWhere: Prisma.Sql = Prisma.empty;
    if (desde && hasta) emailDateWhere = Prisma.sql`AND ee.abierto_at >= ${desde} AND ee.abierto_at <= ${hasta}`;
    else if (desde)     emailDateWhere = Prisma.sql`AND ee.abierto_at >= ${desde}`;
    else if (hasta)     emailDateWhere = Prisma.sql`AND ee.abierto_at <= ${hasta}`;

    const emailAperturaRows = await this.prisma.$queryRaw<{ propiedad_id: string; total: bigint }[]>`
      SELECT cp.propiedad_id, COUNT(ee.id) AS total
      FROM email_eventos ee
      JOIN clientes c ON c.email = ee.destinatario AND c.tenant_id = ${tenantId}
      JOIN cliente_propiedades cp ON cp.cliente_id = c.id
      WHERE ee.tenant_id = ${tenantId} AND ee.abierto_at IS NOT NULL
      ${emailDateWhere}
      GROUP BY cp.propiedad_id
    `;
    const emailMap: Record<string, number> = {};
    for (const r of emailAperturaRows) emailMap[r.propiedad_id] = Number(r.total);

    // §15 CA-2: Score formula: leads(10) + visitas(5) + interacciones(3) + favoritos(2) + correos_abiertos(2) + brochures(1)
    const ranked = props
      .map((p) => {
        const leads = p.interesados.length;
        const visitas = p.interesados.reduce((s, i) => s + i.visitas.length, 0);
        const interacciones = p.interesados.reduce((s, i) => s + i.interacciones.length, 0);
        const favoritos = favMap[p.id] ?? 0;
        const correosAbiertos = emailMap[p.id] ?? 0;
        const brochures = brochureMap[p.id] ?? 0;
        const score = leads * 10 + visitas * 5 + interacciones * 3 + favoritos * 2 + correosAbiertos * 2 + brochures;
        return {
          id: p.id, codigo: p.codigo, titulo: p.titulo, tipo: p.tipo, estado: p.estado,
          agente: p.agente?.nombre ?? null,
          leads, visitas, interacciones, favoritos, correosAbiertos, brochures, score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const result = { propiedades: ranked, cacheAt: new Date().toISOString() };
    await this.toCache(key, result);
    return result;
  }

  // ─── Ranking con gamificación ───────────────────────────────

  async getRanking(tenantId: string, currentUserId: string, isAdmin: boolean, desde?: Date, hasta?: Date) {
    const { agentes } = await this.getAgentes(tenantId, desde, hasta) as { agentes: any[]; cacheAt: string };

    const scored = agentes.map((a) => ({
      ...a,
      puntos: Math.round(
        a.ganados * 100 +
        a.visitasRealizadas * 15 +
        a.numInteracciones * 5 +
        (a.tasaConversion >= 50 ? (a.tasaConversion - 50) * 2 : 0),
      ),
      badges: [] as string[],
    }));

    scored.sort((a, b) => b.puntos - a.puntos);

    const byGanados       = [...scored].sort((a, b) => b.ganados - a.ganados);
    const byComision      = [...scored].sort((a, b) => b.comisionTotal - a.comisionTotal);
    const byInteracciones = [...scored].sort((a, b) => b.numInteracciones - a.numInteracciones);
    const byVisitas       = [...scored].sort((a, b) => b.visitasRealizadas - a.visitasRealizadas);

    if (byGanados[0]?.ganados > 0)                byGanados[0].badges.push('top_ventas');
    if (byComision[0]?.comisionTotal > 0)          byComision[0].badges.push('top_comision');
    if (byInteracciones[0]?.numInteracciones > 0)  byInteracciones[0].badges.push('mas_activo');
    if (byVisitas[0]?.visitasRealizadas > 0)       byVisitas[0].badges.push('tour_master');

    for (const a of scored) {
      if (a.tasaConversion >= 70 && a.ganados >= 2) a.badges.push('elite');
      if (a.ganados >= 5) a.badges.push('cerrador');
      else if (a.ganados >= 3) a.badges.push('en_racha');
    }

    const ranking = scored.map((a, i) => ({
      posicion: i + 1,
      id: a.id,
      nombre: isAdmin || a.id === currentUserId ? a.nombre : `Agente ${i + 1}`,
      esYo: a.id === currentUserId,
      rol: isAdmin || a.id === currentUserId ? a.rol : null,
      puntos: a.puntos,
      ganados: a.ganados,
      tasaConversion: a.tasaConversion,
      comisionTotal: isAdmin || a.id === currentUserId ? a.comisionTotal : null,
      visitasRealizadas: a.visitasRealizadas,
      numInteracciones: a.numInteracciones,
      badges: a.badges,
    }));

    return { ranking, badgesConfig: BADGES_DEF, cacheAt: new Date().toISOString() };
  }

  // ─── Productividad — llamadas/emails por agente ──────────────

  async getProductividad(tenantId: string, desde?: Date, hasta?: Date) {
    const key = this.cacheKey(tenantId, 'prod', desde?.toISOString(), hasta?.toISOString());
    const cached = await this.fromCache<unknown>(key);
    if (cached) return cached;

    const dateFilter = this.dateFilter(desde, hasta);
    const TIPOS = ['LLAMADA', 'EMAIL', 'WHATSAPP', 'MENSAJE', 'NOTA', 'VISITA'] as const;

    const usuarios = await this.prisma.user.findMany({
      where: { tenant_id: tenantId, estado: 'ACTIVO', rol: { not: 'SUPER_ADMIN' } },
      select: { id: true, nombre: true, rol: true },
      orderBy: { nombre: 'asc' },
    });

    const agentes = await Promise.all(
      usuarios.map(async (u) => {
        const byTipo = await this.prisma.interaccion.groupBy({
          by: ['tipo'],
          where: {
            usuario_id: u.id,
            interes: { cliente: { tenant_id: tenantId } },
            ...(dateFilter && { fecha: dateFilter }),
          },
          _count: { _all: true },
        });

        const porTipo: Record<string, number> = Object.fromEntries(TIPOS.map((t) => [t, 0]));
        for (const row of byTipo) porTipo[row.tipo] = (row._count as any)._all ?? 0;
        const total = TIPOS.reduce((s, t) => s + porTipo[t], 0);

        return { id: u.id, nombre: u.nombre, rol: u.rol, porTipo, total };
      }),
    );

    let whereExtra: Prisma.Sql = Prisma.empty;
    if (desde && hasta) whereExtra = Prisma.sql`AND i.fecha >= ${desde} AND i.fecha <= ${hasta}`;
    else if (desde)     whereExtra = Prisma.sql`AND i.fecha >= ${desde}`;
    else if (hasta)     whereExtra = Prisma.sql`AND i.fecha <= ${hasta}`;

    const tendenciaRaw = await this.prisma.$queryRaw<
      { usuario_id: string; dia: Date; total: bigint }[]
    >`
      SELECT i.usuario_id, DATE(i.fecha) AS dia, COUNT(*)::int AS total
      FROM interacciones i
      JOIN cliente_propiedades cp ON cp.id = i.interes_id
      JOIN clientes c ON c.id = cp.cliente_id
      WHERE c.tenant_id = ${tenantId}
      ${whereExtra}
      GROUP BY i.usuario_id, dia
      ORDER BY i.usuario_id, dia
    `;

    const trendMap: Record<string, { fecha: string; total: number }[]> = {};
    for (const row of tendenciaRaw) {
      if (!trendMap[row.usuario_id]) trendMap[row.usuario_id] = [];
      const dia = row.dia instanceof Date ? row.dia.toISOString().slice(0, 10) : String(row.dia).slice(0, 10);
      trendMap[row.usuario_id].push({ fecha: dia, total: Number(row.total) });
    }

    const agentesConTendencia = agentes.map((a) => ({
      ...a,
      tendencia: trendMap[a.id] ?? [],
    }));

    const totalesTipo: Record<string, number> = Object.fromEntries(TIPOS.map((t) => [t, 0]));
    for (const a of agentesConTendencia) {
      for (const t of TIPOS) totalesTipo[t] += a.porTipo[t] ?? 0;
    }

    const result = {
      agentes: agentesConTendencia,
      totalesTipo,
      totalInteracciones: TIPOS.reduce((s, t) => s + totalesTipo[t], 0),
      cacheAt: new Date().toISOString(),
    };
    await this.toCache(key, result);
    return result;
  }

  // ─── Export XLSX agentes ─────────────────────────────────────

  async exportAgentesXlsx(tenantId: string, desde?: Date, hasta?: Date): Promise<Buffer> {
    const { agentes } = await this.getAgentes(tenantId, desde, hasta) as any;

    const rows = agentes.map((a: any) => ({
      Agente: a.nombre,
      Rol: a.rol,
      Ganados: a.ganados,
      Perdidos: a.perdidos,
      'Activos en pipeline': a.activos,
      'Conversión %': a.tasaConversion,
      'Comisión total (GTQ)': a.comisionTotal.toFixed(2),
      Visitas: a.visitasRealizadas,
      Interacciones: a.numInteracciones,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [20, 14, 10, 10, 18, 13, 22, 10, 15].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Desempeño Agentes');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── P-14: Comisiones proyectadas vs realizadas ─────────────

  async getComisiones(tenantId: string, desde?: Date, hasta?: Date) {
    const key = this.cacheKey(tenantId, 'comisiones', desde?.toISOString(), hasta?.toISOString());
    const cached = await this.fromCache<object>(key);
    if (cached) return cached;

    const df = this.dateFilter(desde, hasta);

    // Realizadas: GANADO con comision_calculada
    const ganados = await this.prisma.clientePropiedad.findMany({
      where: {
        propiedad: { tenant_id: tenantId },
        estado: 'GANADO',
        ...(df && { fecha_cierre: df }),
      },
      select: {
        comision_calculada: true,
        precio_cierre: true,
        fecha_cierre: true,
        cliente: { select: { nombre: true } },
        propiedad: { select: { titulo: true, codigo: true } },
      },
    });

    const realizadas = ganados.reduce(
      (sum, g) => sum + (g.comision_calculada ? Number(g.comision_calculada) : 0),
      0,
    );

    // Proyectadas: EN_NEGOCIACION + CIERRE → precio × comision_%
    const enProceso = await this.prisma.clientePropiedad.findMany({
      where: {
        propiedad: { tenant_id: tenantId },
        estado: { in: ['EN_NEGOCIACION', 'CIERRE'] },
      },
      select: {
        estado: true,
        presupuesto: true,
        propiedad: { select: { titulo: true, codigo: true, precio_venta: true, precio_renta: true, gestion: true, comision_porcentaje: true } },
        cliente: { select: { nombre: true } },
      },
    });

    let proyectadas = 0;
    const detalleProyectado: Array<{ titulo: string; codigo: string; monto: number; estado: string; tipo: string }> = [];
    for (const ep of enProceso) {
      const p = ep.propiedad;
      let monto = 0;
      let tipo = p.gestion;
      if (p.gestion === 'RENTA') {
        // CBR: proyección conservadora = 1 mes de renta (contrato 1-5 años)
        monto = p.precio_renta ? Math.round(Number(p.precio_renta) * 100) / 100 : 0;
      } else {
        // VENTA o AMBAS: usar % sobre precio de venta
        const precio = p.precio_venta;
        const pct = p.comision_porcentaje ? Number(p.comision_porcentaje) : 5.6;
        monto = precio ? Math.round(Number(precio) * (pct / 100) * 100) / 100 : 0;
      }
      proyectadas += monto;
      detalleProyectado.push({ titulo: p.titulo, codigo: p.codigo, monto, estado: ep.estado, tipo });
    }

    const result = {
      realizadas: Math.round(realizadas * 100) / 100,
      proyectadas: Math.round(proyectadas * 100) / 100,
      totalAcumulado: Math.round((realizadas + proyectadas) * 100) / 100,
      numCierres: ganados.length,
      numEnProceso: enProceso.length,
      detalleProyectado,
      cacheAt: new Date().toISOString(),
    };
    await this.toCache(key, result);
    return result;
  }

  // ─── F-22: Heatmap data (coordinates + activity score) ────────

  async getHeatmap(tenantId: string) {
    const key = this.cacheKey(tenantId, 'heatmap');
    const cached = await this.fromCache<object[]>(key);
    if (cached) return cached;

    const props = await this.prisma.propiedad.findMany({
      where: {
        tenant_id: tenantId,
        latitud: { not: null },
        longitud: { not: null },
        estado: { in: ['DISPONIBLE', 'RESERVADA', 'EN_NEGOCIACION', 'BORRADOR'] },
      },
      select: {
        id: true,
        titulo: true,
        codigo: true,
        latitud: true,
        longitud: true,
        estado: true,
        _count: { select: { interesados: true } },
      },
    });

    const result = props.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      codigo: p.codigo,
      lat: Number(p.latitud),
      lng: Number(p.longitud),
      estado: p.estado,
      leads: p._count.interesados,
      weight: Math.min(1, p._count.interesados / 10 + 0.1),
    }));

    await this.toCache(key, result);
    return result;
  }

  // ─── Private ─────────────────────────────────────────────────

  private dateFilter(desde?: Date, hasta?: Date) {
    if (!desde && !hasta) return undefined;
    return { ...(desde && { gte: desde }), ...(hasta && { lte: hasta }) };
  }
}
