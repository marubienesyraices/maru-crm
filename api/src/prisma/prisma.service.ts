import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getTenantContext } from '../common/context/tenant-context';

/**
 * RLS plumbing
 *
 * The runtime DB role (`gestprop_app`) is subject to Row-Level Security, and
 * the policies read `current_setting('app.tenant_id')` / `app.bypass_rls`.
 * Those GUCs are per-connection, but queries go through a pg connection Pool,
 * so a session-level `SET` issued by middleware lands on ONE connection while
 * the actual queries may run on others. The fix: every operation is wrapped in
 * a transaction that first runs `set_config(…, is_local := true)` so the GUCs
 * are guaranteed to be on the same connection as the query and evaporate at
 * COMMIT/ROLLBACK (no stale context leaks between pooled connections).
 *
 * - Single operations (model ops and raw queries) are wrapped by the client
 *   extension below in a 2-statement batch transaction.
 * - `$transaction()` calls are intercepted by PrismaService so the set_config
 *   runs INSIDE the caller's transaction (atomicity is preserved); the
 *   `rlsApplied` flag stops the extension from double-wrapping the batched
 *   operations in nested transactions of their own.
 * - Code running outside an HTTP request (schedulers, BullMQ processors,
 *   bootstrap) has no tenant context and runs with bypass_rls=true — the same
 *   effective access the app had when it connected with the admin role. Use
 *   `runWithTenant()` from common/context/tenant-context to scope such work.
 */
const rlsApplied = new AsyncLocalStorage<boolean>();

function resolveRlsSettings(): { tenantId: string; bypass: 'true' | 'false' } {
  const ctx = getTenantContext();
  if (!ctx) {
    return { tenantId: '', bypass: 'true' };
  }
  return {
    tenantId: ctx.tenantId ?? '',
    bypass: ctx.bypassRls ? 'true' : 'false',
  };
}

function createRlsClient(base: PrismaClient) {
  return base.$extends({
    query: {
      async $allOperations({ args, query }): Promise<unknown> {
        // Already inside an RLS-configured transaction (see $transaction below)
        if (rlsApplied.getStore()) {
          return query(args) as Promise<unknown>;
        }
        const { tenantId, bypass } = resolveRlsSettings();
        // Batch form guarantees setCfg and query(args) share the same connection
        // and transaction. maxWait/timeout come from PrismaClient transactionOptions.
        const [, result] = await rlsApplied.run(true, () =>
          base.$transaction([
            base.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true), set_config('app.bypass_rls', ${bypass}, true)`,
            query(args) as Prisma.PrismaPromise<unknown>,
          ]),
        );
        return result;
      },
    },
  });
}

// Declaration merging: exposes PrismaClient's model delegates/$-methods on the
// PrismaService type so callers get full autocomplete/typing even though they
// are actually served at runtime by the Proxy in the constructor below.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging
export interface PrismaService extends Omit<PrismaClient, '$transaction'> {}

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly base: PrismaClient;
  private readonly extended: ReturnType<typeof createRlsClient>;

  constructor(config: ConfigService) {
    // Runtime: prefer DATABASE_APP_URL (gestprop_app, RLS-restricted)
    // Fallback: DATABASE_URL (admin/owner role, for dev/migrations)
    const connectionString =
      config.get<string>('DATABASE_APP_URL') ||
      config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error(
        'DATABASE_APP_URL or DATABASE_URL environment variable is required',
      );
    }

    this.pool = new Pool({
      connectionString,
      max: 25,
      idleTimeoutMillis: 30_000,
    });
    this.base = new PrismaClient({
      adapter: new PrismaPg(this.pool),
      transactionOptions: { maxWait: 5_000, timeout: 10_000 },
    });
    this.extended = createRlsClient(this.base);

    // Model delegates and $-methods not defined on this class are served by
    // the RLS-extended client.
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        const value: unknown = Reflect.get(target.extended, prop);
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target.extended)
          : value;
      },
    });
  }

  async onModuleInit() {
    await this.base.$connect();
  }

  async onModuleDestroy() {
    await this.base.$disconnect();
    await this.pool.end();
  }

  /**
   * RLS-aware $transaction. Injects the tenant GUCs as the first statement of
   * the transaction so every operation inside shares the same RLS context.
   * Supports both the batch (array) and interactive (callback) forms.
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(
    operations: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<{ [K in keyof P]: Awaited<P[K]> }>;
  $transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<R>;
  $transaction(
    input:
      | Prisma.PrismaPromise<unknown>[]
      | ((tx: Prisma.TransactionClient) => Promise<unknown>),
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<unknown> {
    const { tenantId, bypass } = resolveRlsSettings();

    if (typeof input === 'function') {
      return this.base.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true), set_config('app.bypass_rls', ${bypass}, true)`;
        return input(tx);
      }, options);
    }

    const setCfg = this.base
      .$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true), set_config('app.bypass_rls', ${bypass}, true)`;
    return rlsApplied
      .run(true, () => this.base.$transaction([setCfg, ...input], options))
      .then((results) => results.slice(1));
  }
}
