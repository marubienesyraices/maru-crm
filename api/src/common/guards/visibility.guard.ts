import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../modules/users/users.service';

/**
 * VisibilityGuard
 * 
 * Injects `req.visibleUserIds` with the list of user IDs the current user
 * can see based on their hierarchy position:
 * - ADMIN/SUPER_ADMIN: all users in tenant (no filtering)
 * - SENIOR: self + full downline (recursive subordinates)
 * - JUNIOR: self only
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
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return true;

    // Admin roles see everything
    if (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') {
      request.visibleUserIds = null; // null = no filter (all visible)
      return true;
    }

    // SENIOR: self + downline
    if (user.rol === 'SENIOR') {
      const downline = await this.usersService.getDownline(user.tenantId, user.sub);
      request.visibleUserIds = [user.sub, ...downline.map((d: any) => d.id)];
      return true;
    }

    // JUNIOR: self only
    request.visibleUserIds = [user.sub];
    return true;
  }
}
