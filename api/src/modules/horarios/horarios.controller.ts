import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HorariosService } from './horarios.service';
import { BulkUpsertHorariosDto } from './horarios.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Horarios')
@ApiBearerAuth('JWT')
@Controller('api/horarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  /** Get my own schedule */
  @Get('me')
  @ApiOperation({ summary: 'Obtener mi horario laboral' })
  getMySchedule(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.horariosService.findByUser(tenantId, userId);
  }

  /** Update my own schedule */
  @Put('me')
  @ApiOperation({ summary: 'Actualizar mi horario laboral' })
  updateMySchedule(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: BulkUpsertHorariosDto,
  ) {
    return this.horariosService.bulkUpsert(tenantId, userId, dto.horarios);
  }

  /** Admin: get any user's schedule */
  @Get(':userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Obtener horario de un agente (Admin)' })
  getUserSchedule(
    @CurrentUser('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.horariosService.findByUser(tenantId, userId);
  }

  /** Admin: update any user's schedule */
  @Put(':userId')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar horario de un agente (Admin)' })
  updateUserSchedule(
    @CurrentUser('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: BulkUpsertHorariosDto,
  ) {
    return this.horariosService.bulkUpsert(tenantId, userId, dto.horarios);
  }
}
