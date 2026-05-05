import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@ApiTags('Notificaciones')
@ApiBearerAuth('JWT')
@SkipAudit()
@Controller('api/notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private service: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario (con filtro soloNoLeidas)' })
  findAll(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('soloNoLeidas') soloNoLeidas?: string,
  ) {
    return this.service.findAll(userId, tenantId, soloNoLeidas === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contador de notificaciones no leídas' })
  countUnread(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.countUnread(userId, tenantId);
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marcar notificación específica como leída' })
  marcarLeida(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.marcarLeida(id, userId);
  }

  @Patch('leer-todas')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  marcarTodasLeidas(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.service.marcarTodasLeidas(userId, tenantId);
  }
}
