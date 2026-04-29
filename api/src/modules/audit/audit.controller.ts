import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('modulo') modulo?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll(tenantId, {
      userId,
      modulo,
      accion,
      entidad,
      fechaDesde,
      fechaHasta,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}
