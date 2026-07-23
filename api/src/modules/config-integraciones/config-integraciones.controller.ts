import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ConfigIntegracionesService } from './config-integraciones.service';
import { UpdateConfigIntegracionesDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlanFeature } from '../../common/decorators/plan-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@PlanFeature('tiene_integraciones')
@Controller('api/tenants/mi-tenant/integraciones')
export class ConfigIntegracionesController {
  constructor(private readonly svc: ConfigIntegracionesService) {}

  @Get()
  find(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.findOrCreate(user.tenantId);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConfigIntegracionesDto,
  ) {
    return this.svc.update(user.tenantId, dto);
  }
}

/** Carta de Comisión config — accessible to all ADMIN regardless of plan */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/tenants/mi-tenant/carta-config')
export class CartaConfigController {
  constructor(private readonly svc: ConfigIntegracionesService) {}

  @Get()
  find(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.getCartaConfig(user.tenantId);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConfigIntegracionesDto,
  ) {
    return this.svc.updateCartaConfig(user.tenantId, dto);
  }
}
