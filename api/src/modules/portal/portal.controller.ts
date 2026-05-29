import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { ClienteJwtGuard } from './cliente-jwt.guard';
import { ChatbotLeadDto, FiltrosPublicasDto, RegistroPortalDto, SolicitarAccesoDto, VerificarEmailDto } from './portal.dto';
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

  // ─── Panel del cliente ────────────────────────────────────────

  @Post('cliente/solicitar-acceso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar enlace mágico de acceso al panel del cliente' })
  solicitarAcceso(@Body() dto: SolicitarAccesoDto) {
    return this.service.solicitarAcceso(dto.email, dto.tenantId);
  }

  @Post('cliente/acceder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Canjear token de magic link por JWT de cliente' })
  accederConToken(@Body() dto: VerificarEmailDto) {
    return this.service.accederConToken(dto.token);
  }

  @Get('cliente/mi-cuenta')
  @UseGuards(ClienteJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard del cliente: perfil + propiedades de interés + visitas próximas' })
  getMiCuenta(@Request() req: any) {
    return this.service.getMiCuenta(req.clienteId);
  }

  @Post('cliente/favoritos/:propiedadId')
  @UseGuards(ClienteJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Agregar propiedad a favoritos del cliente' })
  addFavorito(@Request() req: any, @Param('propiedadId') propiedadId: string) {
    return this.service.addFavorito(req.clienteId, req.clienteTenantId, propiedadId);
  }

  @Delete('cliente/favoritos/:propiedadId')
  @UseGuards(ClienteJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar propiedad de favoritos del cliente' })
  removeFavorito(@Request() req: any, @Param('propiedadId') propiedadId: string) {
    return this.service.removeFavorito(req.clienteId, propiedadId);
  }

  @Get('cliente/favoritos')
  @UseGuards(ClienteJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar propiedades favoritas del cliente' })
  getFavoritos(@Request() req: any) {
    return this.service.getFavoritos(req.clienteId);
  }
}
