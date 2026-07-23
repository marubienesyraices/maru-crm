import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SindicacionService } from './sindicacion.service';

class PublicarDto {
  portal!: 'ENCUENTRA24' | 'MERCADOLIBRE';
}

@ApiTags('Sindicación portales')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/sindicacion')
export class SindicacionController {
  constructor(private readonly svc: SindicacionService) {}

  @Get(':propiedadId')
  @ApiOperation({ summary: 'Estado de publicaciones en portales externos' })
  getEstado(@CurrentUser() user: AuthenticatedUser, @Param('propiedadId') id: string) {
    return this.svc.getEstado(user.tenantId, id);
  }

  @Post(':propiedadId/publicar')
  @ApiOperation({
    summary:
      'Publicar propiedad en portal externo (Encuentra24 o MercadoLibre)',
  })
  publicar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propiedadId') id: string,
    @Body() body: PublicarDto,
  ) {
    return this.svc.publicar(user.tenantId, id, body.portal);
  }

  @Delete(':propiedadId/retirar/:portal')
  @ApiOperation({ summary: 'Retirar publicación de un portal externo' })
  retirar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propiedadId') id: string,
    @Param('portal') portal: 'ENCUENTRA24' | 'MERCADOLIBRE',
  ) {
    return this.svc.retirar(user.tenantId, id, portal);
  }

  // MercadoLibre webhook (no auth — verified by ML signature)
  @Post('webhook/ml')
  @ApiOperation({ summary: 'Webhook MercadoLibre — notificaciones de estado' })
  mlWebhook(@Body() body: any) {
    return this.svc.handleMlWebhook(body.topic, body.resource);
  }
}
