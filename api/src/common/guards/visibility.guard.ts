import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UsersService } from '../../modules/users/users.service';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

type VisibilityRequest = Request & {
  user?: AuthenticatedUser;
  visibleUserIds?: string[] | null;
};

/**
 * VisibilityGuard
 *
 * Injects `req.visibleUserIds` with the list of user IDs the current user
 * can see based on their hierarchy position:
 * - ADMIN/SUPER_ADMIN: all users in tenant (no filtering)
 * - SENIOR: self + full downline (recursive subordinates)
 * - JUNIOR: self + upline (their supervisor chain, typically the SENIOR they report to)
 *
 * Services can use `req.visibleUserIds` to filter agente_id in queries.
 */
@Injectable()
export class VisibilityGuard implements CanActivate {
  constructor(
    private usersService: UsersService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<VisibilityRequest>();
    const user = request.user;

    if (!user) return true;

    // Admin roles see everything
    if (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') {
      request.visibleUserIds = null; // null = no filter (all visible)
      return true;
    }

    // SENIOR: self + downline
    if (user.rol === 'SENIOR') {
      const downline = await this.usersService.getDownline(
        user.tenantId,
        user.sub,
      );
      request.visibleUserIds = [user.sub, ...downline.map((d) => d.id)];
      return true;
    }

    // JUNIOR: self + upline (supervisor chain, typically the SENIOR they report to)
    const upline = await this.usersService.getUpline(user.tenantId, user.sub);
    request.visibleUserIds = [user.sub, ...upline.map((u) => u.id)];
    return true;
  }
}
