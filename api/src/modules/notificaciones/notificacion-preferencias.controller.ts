import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificacionPreferenciasService } from './notificacion-preferencias.service';

@ApiTags('Notificaciones')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('api/notificaciones/preferencias')
export class NotificacionPreferenciasController {
  constructor(private readonly svc: NotificacionPreferenciasService) {}

  @SkipAudit()
  @Get()
  @ApiOperation({ summary: 'Obtener preferencias de notificación del usuario actual' })
  getPreferencias(@CurrentUser() user: any) {
    return this.svc.getPreferencias(user.tenantId, user.sub);
  }

  @Put(':tipo')
  @ApiOperation({ summary: 'Actualizar preferencia de canal para un tipo de notificación' })
  updatePreferencia(
    @CurrentUser() user: any,
    @Param('tipo') tipo: string,
    @Body() body: { canal_inapp?: boolean; canal_email?: boolean; canal_push?: boolean; activa?: boolean },
  ) {
    return this.svc.upsertPreferencia(user.tenantId, user.sub, tipo, body);
  }
}
