import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantMiddleware
 *
 * Sets the PostgreSQL session variables `app.tenant_id` and `app.bypass_rls`
 * required by Row-Level Security policies.
 *
 * NestJS middleware runs BEFORE guards, so `req.user` is never populated here.
 * Instead, the JWT is decoded directly from the Authorization header to extract
 * the tenantId and rol claims. Crypto validation is left to JwtAuthGuard; we only
 * need the claims to configure the DB session.
 *
 * For unauthenticated routes (no Bearer token) the RLS bypass is enabled so that
 * login/onboarding queries can find users across tenants.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    let tenantId: string | undefined;
    let isSuperAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payloadB64 = token.split('.')[1];
        // base64url → base64 → JSON (no crypto verification — JwtAuthGuard handles that)
        const payload = JSON.parse(
          Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
        );
        tenantId = payload.tenantId;
        isSuperAdmin = payload.rol === 'SUPER_ADMIN';
      } catch {
        // Malformed token — let JwtAuthGuard reject the request
      }
    }

    if (tenantId) {
      await this.prisma.setTenantContext(tenantId);
      await this.prisma.$executeRawUnsafe(
        `SET app.bypass_rls = '${isSuperAdmin ? 'true' : 'false'}'`,
      );
    } else {
      // Unauthenticated route: bypass RLS so login/onboarding can cross tenants
      await this.prisma.$executeRawUnsafe(`SET app.bypass_rls = 'true'`);
      await this.prisma.$executeRawUnsafe(`SET app.tenant_id = ''`);
    }

    next();
  }
}
