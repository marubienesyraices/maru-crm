import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ConfigIntegracionesService } from './config-integraciones.service';
import { UpdateConfigIntegracionesDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlanFeature } from '../../common/decorators/plan-feature.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@PlanFeature('tiene_integraciones')
@Controller('api/tenants/mi-tenant/integraciones')
export class ConfigIntegracionesController {
  constructor(private readonly svc: ConfigIntegracionesService) {}

  @Get()
  find(@Req() req: any) {
    return this.svc.findOrCreate(req.user.tenantId);
  }

  @Patch()
  update(@Req() req: any, @Body() dto: UpdateConfigIntegracionesDto) {
    return this.svc.update(req.user.tenantId, dto);
  }
}

/** Carta de Comisión config — accessible to all ADMIN regardless of plan */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/tenants/mi-tenant/carta-config')
export class CartaConfigController {
  constructor(private readonly svc: ConfigIntegracionesService) {}

  @Get()
  find(@Req() req: any) {
    return this.svc.getCartaConfig(req.user.tenantId);
  }

  @Patch()
  update(@Req() req: any, @Body() dto: UpdateConfigIntegracionesDto) {
    return this.svc.updateCartaConfig(req.user.tenantId, dto);
  }
}
