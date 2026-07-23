import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PLAN_FEATURE_KEY,
  PlanFeatureKey,
} from '../decorators/plan-feature.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<PlanFeatureKey>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!featureKey) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) return false;

    // SUPER_ADMIN bypasses all plan restrictions
    if (user.rol === 'SUPER_ADMIN') return true;

    const tenantId: string = user.tenantId;
    if (!tenantId) return false;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    if (!tenant) return false;

    const catalog = await this.prisma.catalogoPlan.findUnique({
      where: { plan: tenant.plan },
      select: { [featureKey]: true },
    });

    if (!catalog || !catalog[featureKey]) {
      throw new ForbiddenException(
        `Tu plan actual (${tenant.plan}) no incluye esta funcionalidad`,
      );
    }

    return true;
  }
}
