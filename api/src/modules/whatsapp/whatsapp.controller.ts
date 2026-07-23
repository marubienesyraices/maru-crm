import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { WhatsappService } from './whatsapp.service';
import { EnviarWhatsappDto } from './dto';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT')
@Controller('api/propiedades/:propiedadId/whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @Post('enviar')
  @ApiOperation({
    summary: 'Enviar brochure PDF por WhatsApp',
    description:
      'Si WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID están configurados, ' +
      'sube el PDF a la Media API y envía un mensaje con documento adjunto. ' +
      'Si no, retorna un `wa_link` (wa.me) con texto prefirmado para abrir en el cliente.',
  })
  enviar(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
    @Body() dto: EnviarWhatsappDto,
  ) {
    return this.service.enviarBrochure(
      user.tenantId,
      user.sub,
      propiedadId,
      dto,
    );
  }

  @SkipAudit()
  @Get('envios')
  @ApiOperation({ summary: 'Historial de envíos WhatsApp de la propiedad' })
  getEnvios(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getEnvios(user.tenantId, propiedadId);
  }
}
