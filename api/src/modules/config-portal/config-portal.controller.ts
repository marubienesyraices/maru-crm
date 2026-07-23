import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigPortalService } from './config-portal.service';
import { UpdateConfigPortalDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlanFeature } from '../../common/decorators/plan-feature.decorator';

// ── Rutas privadas (ADMIN) ─────────────────────────────────────────────────

@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@PlanFeature('tiene_portal')
@Controller('api/tenants/mi-tenant/portal')
export class ConfigPortalController {
  constructor(private readonly svc: ConfigPortalService) {}

  @Get()
  find(@Req() req: any) {
    return this.svc.findOrCreate(req.user.tenantId);
  }

  @Patch()
  update(@Req() req: any, @Body() dto: UpdateConfigPortalDto) {
    return this.svc.update(req.user.tenantId, dto);
  }
}

// ── Ruta pública ───────────────────────────────────────────────────────────

@Controller('api/public/portal-config')
export class PortalConfigPublicController {
  constructor(private readonly svc: ConfigPortalService) {}

  /**
   * Devuelve la configuración pública del portal correspondiente al dominio
   * del request. El portal Next.js llama este endpoint en cada SSR request
   * usando el header Host.
   */
  @Get()
  async getByDomain(
    @Headers('host') headerHost: string,
    @Query('host') queryHost?: string,
  ) {
    const raw = queryHost ?? headerHost ?? '';
    const clean = raw.split(':')[0].toLowerCase();
    const row =
      (await this.svc.findByDomain(clean)) ?? (await this.svc.findDefault());
    return row ?? {};
  }
}
