import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ConfigSistemaService } from './config-sistema.service';
import { UpdateConfigSistemaDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('api/superadmin/config-sistema')
export class ConfigSistemaController {
  constructor(private readonly svc: ConfigSistemaService) {}

  @Get()
  find() {
    return this.svc.findOrCreate();
  }

  @Patch()
  update(@Req() req: any, @Body() dto: UpdateConfigSistemaDto) {
    return this.svc.update(dto, req.user.sub);
  }
}
