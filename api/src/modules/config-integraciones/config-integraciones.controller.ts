import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ConfigIntegracionesService } from './config-integraciones.service';
import { UpdateConfigIntegracionesDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
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
