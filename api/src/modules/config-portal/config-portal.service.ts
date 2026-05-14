import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UpdateConfigPortalDto } from './dto';

const CACHE_TTL = 300; // 5 min

@Injectable()
export class ConfigPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findOrCreate(tenantId: string) {
    let row = await this.prisma.configPortal.findUnique({ where: { tenant_id: tenantId } });
    if (!row) {
      row = await this.prisma.configPortal.create({ data: { tenant_id: tenantId } });
    }
    return row;
  }

  async update(tenantId: string, dto: UpdateConfigPortalDto) {
    const row = await this.prisma.configPortal.upsert({
      where:  { tenant_id: tenantId },
      create: { tenant_id: tenantId, ...dto },
      update: dto,
    });
    await this.invalidateCache(tenantId, row.dominio_personalizado, row.subdominio);
    return row;
  }

  /**
   * Resolves portal config from a public hostname.
   * Lookup order:
   *   1. Exact match on dominio_personalizado
   *   2. subdominio match (first label of the hostname)
   *   3. PORTAL_TENANT_ID env var
   *   4. First active tenant
   * Uses Redis cache; reads DB with bypass_rls so RLS doesn't block the lookup.
   */
  async findByDomain(host: string): Promise<Record<string, unknown> | null> {
    const cacheKey = `portal:domain:${host}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const subdomain = host.split('.')[0];

    // SET LOCAL must run in the same transaction as the SELECT (prepared statements
    // don't allow multiple commands in one call).
    const queryWithBypass = (q: Prisma.Sql) =>
      this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
        return tx.$queryRaw<any[]>(q);
      });

    const domainSql = Prisma.sql`
      SELECT cp.*, t.color_primario, t.color_secundario, t.color_acento,
             t.color_fondo_alterno, t.color_fondo_principal, t.color_texto,
             t.logo_url, t.nombre AS tenant_nombre
      FROM config_portal cp
      JOIN tenants t ON t.id = cp.tenant_id
      WHERE cp.dominio_personalizado = ${host}
        AND cp.portal_activo = true
        AND t.estado = 'ACTIVA'
      LIMIT 1`;

    const subdomainSql = Prisma.sql`
      SELECT cp.*, t.color_primario, t.color_secundario, t.color_acento,
             t.color_fondo_alterno, t.color_fondo_principal, t.color_texto,
             t.logo_url, t.nombre AS tenant_nombre
      FROM config_portal cp
      JOIN tenants t ON t.id = cp.tenant_id
      WHERE cp.subdominio = ${subdomain}
        AND cp.portal_activo = true
        AND t.estado = 'ACTIVA'
      LIMIT 1`;

    const [byDomain, bySubdomain] = await Promise.all([
      queryWithBypass(domainSql),
      queryWithBypass(subdomainSql),
    ]);

    const row = byDomain[0] ?? bySubdomain[0] ?? null;

    if (row) {
      await this.redis.set(cacheKey, JSON.stringify(row), CACHE_TTL);
    }

    return row;
  }

  /** Called when tenant has no domain config — returns first active tenant. */
  async findDefault(): Promise<Record<string, unknown> | null> {
    const cacheKey = 'portal:domain:__default__';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'true'`);
      return tx.$queryRaw<any[]>`
        SELECT cp.*, t.color_primario, t.color_secundario, t.color_acento,
               t.color_fondo_alterno, t.color_fondo_principal, t.color_texto,
               t.logo_url, t.nombre AS tenant_nombre
        FROM config_portal cp
        JOIN tenants t ON t.id = cp.tenant_id
        WHERE cp.portal_activo = true AND t.estado = 'ACTIVA'
        ORDER BY t.created_at ASC
        LIMIT 1
      `;
    });

    const row = rows[0] ?? null;
    if (row) await this.redis.set(cacheKey, JSON.stringify(row), CACHE_TTL);
    return row;
  }

  private async invalidateCache(
    tenantId: string,
    dominio: string | null,
    subdominio: string | null,
  ) {
    const keys = [`portal:domain:__default__`];
    if (dominio)   keys.push(`portal:domain:${dominio}`);
    if (subdominio) keys.push(`portal:domain:${subdominio}`);
    await Promise.all(keys.map(k => this.redis.set(k, '', 0)));
    await this.redis.deleteByPattern('portal:domain:*');
  }
}
