import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { ChatbotLeadDto, FiltrosPublicasDto, RegistroPortalDto, VerificarEmailDto } from './portal.dto';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

/** All routes under /api/public are unauthenticated — no JwtAuthGuard */
@ApiTags('Portal Público')
@Controller('api/public')
@SkipAudit()
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('branding')
  @ApiOperation({ summary: 'Colores y nombre del tenant del portal (empresa por defecto)' })
  getBranding() {
    return this.service.getDefaultBranding();
  }

  @Get('propiedades')
  @ApiOperation({ summary: 'Listar propiedades públicas con filtros' })
  findAll(@Query() filtros: FiltrosPublicasDto) {
    return this.service.findPublicProperties(filtros);
  }

  @Get('propiedades/:id')
  @ApiOperation({ summary: 'Obtener detalle público de una propiedad' })
  findOne(@Param('id') id: string) {
    return this.service.findPublicProperty(id);
  }

  @Post('registro')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar interés de cliente en una propiedad (inicia verificación de email)' })
  registrar(@Body() dto: RegistroPortalDto) {
    return this.service.registrarCliente(dto);
  }

  @Post('verificar-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email de cliente con token de activación' })
  verificar(@Body() dto: VerificarEmailDto) {
    return this.service.verificarEmail(dto.token);
  }

  @Post('chatbot-lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar lead capturado por el chatbot del portal' })
  chatbotLead(@Body() dto: ChatbotLeadDto) {
    return this.service.crearLeadChatbot(dto);
  }
}
