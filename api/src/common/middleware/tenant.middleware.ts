import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContextStorage, TenantContext } from '../context/tenant-context';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TenantMiddleware
 *
 * Captures the tenant context (tenantId + RLS bypass flag) into an
 * AsyncLocalStorage store that wraps the rest of the request lifecycle.
 * PrismaService reads this store and applies `set_config('app.tenant_id', …)`
 * / `set_config('app.bypass_rls', …)` transaction-locally on the same
 * connection that executes each query — a session-level `SET` on a pooled
 * connection would not be visible to queries running on other connections.
 *
 * NestJS middleware runs BEFORE guards, so `req.user` is never populated here.
 * Instead, the JWT is decoded directly from the Authorization header to extract
 * the tenantId and rol claims. Crypto validation is left to JwtAuthGuard; we only
 * need the claims to configure the DB context.
 *
 * For unauthenticated routes (no/invalid Bearer token) the RLS bypass is enabled
 * so that login/onboarding queries can find users across tenants.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    let tenantId: string | null = null;
    let isSuperAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payloadB64 = token.split('.')[1];
        // base64url → base64 → JSON (no crypto verification — JwtAuthGuard handles that)
        const payload = JSON.parse(
          Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
        );
        if (typeof payload.tenantId === 'string' && UUID_RE.test(payload.tenantId)) {
          tenantId = payload.tenantId;
        }
        isSuperAdmin = payload.rol === 'SUPER_ADMIN';
      } catch {
        // Malformed token — let JwtAuthGuard reject the request
      }
    }

    const ctx: TenantContext = tenantId
      ? { tenantId, bypassRls: isSuperAdmin }
      : { tenantId: null, bypassRls: true };

    tenantContextStorage.run(ctx, () => next());
  }
}
