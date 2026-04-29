import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TenantMiddleware
 *
 * Extracts the tenant_id from the authenticated user's JWT payload
 * and sets it as a PostgreSQL session variable for Row-Level Security.
 *
 * This middleware runs AFTER the JWT authentication guard has validated
 * the token and attached the user to the request.
 *
 * For unauthenticated routes (login, onboarding, etc.), it sets
 * app.bypass_rls = 'true' so the queries can proceed without tenant context.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (user?.tenantId) {
      // Authenticated request: set tenant context for RLS
      await this.prisma.setTenantContext(user.tenantId);

      // If SUPER_ADMIN, also set bypass flag for cross-tenant access
      if (user.rol === 'SUPER_ADMIN') {
        await this.prisma.$executeRawUnsafe(`SET app.bypass_rls = 'true'`);
      } else {
        await this.prisma.$executeRawUnsafe(`SET app.bypass_rls = 'false'`);
      }
    } else {
      // Unauthenticated route (login, onboarding, password reset)
      // Bypass RLS so queries can find users across tenants
      await this.prisma.$executeRawUnsafe(`SET app.bypass_rls = 'true'`);
      await this.prisma.$executeRawUnsafe(`SET app.tenant_id = ''`);
    }

    next();
  }
}
