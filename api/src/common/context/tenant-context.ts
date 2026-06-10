import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request tenant context used by PrismaService to configure the
 * PostgreSQL RLS session variables (`app.tenant_id`, `app.bypass_rls`)
 * on the exact connection/transaction that executes each query.
 *
 * Populated by TenantMiddleware for HTTP requests. Background work
 * (schedulers, BullMQ processors) runs without a store, which
 * PrismaService treats as RLS-bypassed — same effective access the app
 * had when it connected with the admin role. Use `runWithTenant()` to
 * scope background work to a single tenant instead.
 */
export interface TenantContext {
  /** Tenant UUID for RLS scoping; null when no tenant applies. */
  tenantId: string | null;
  /** When true, queries run with `app.bypass_rls = 'true'` (SUPER_ADMIN, public routes). */
  bypassRls: boolean;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export const getTenantContext = (): TenantContext | undefined =>
  tenantContextStorage.getStore();

/**
 * Run `fn` with RLS scoped to a single tenant (background jobs acting per-tenant).
 *
 * IMPORTANT: `await` the Prisma calls INSIDE `fn`. Prisma promises are lazy —
 * `runWithTenant(id, () => prisma.x.findMany())` returns the un-awaited promise
 * and the query would execute outside this context.
 */
export const runWithTenant = <T>(tenantId: string, fn: () => T): T =>
  tenantContextStorage.run({ tenantId, bypassRls: false }, fn);

/** Run `fn` with RLS bypassed (cross-tenant background work). Same await caveat as runWithTenant. */
export const runWithRlsBypass = <T>(fn: () => T): T =>
  tenantContextStorage.run({ tenantId: null, bypassRls: true }, fn);
