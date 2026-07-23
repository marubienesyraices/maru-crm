import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { VideollamadasService } from './videollamadas.service';

@ApiTags('Videollamadas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('api/videollamadas')
export class VideollamadasController {
  constructor(private readonly svc: VideollamadasService) {}

  @Post('visitas/:visitaId')
  @ApiOperation({ summary: 'Crear reunión Zoom para una visita' })
  crearMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitaId') id: string,
  ) {
    return this.svc.crearMeeting(user.tenantId, id);
  }

  @Delete('visitas/:visitaId')
  @ApiOperation({ summary: 'Eliminar reunión Zoom asociada a una visita' })
  eliminarMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('visitaId') id: string,
  ) {
    return this.svc.eliminarMeeting(user.tenantId, id);
  }
}
