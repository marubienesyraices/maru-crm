import { Body, Controller, Delete, Get, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfigDocumentosService } from './config-documentos.service';
import { UpdateBrochureConfigDto, UpdateCartaPlantillaDto } from './dto';

@ApiTags('Config Documentos')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/tenants/mi-tenant')
export class ConfigDocumentosController {
  constructor(private readonly svc: ConfigDocumentosService) {}

  // ── Carta plantilla ────────────────────────────────────────────

  @Get('carta-plantilla')
  @ApiOperation({ summary: 'Obtener plantilla HTML de la carta de comisión' })
  getCartaPlantilla(@Req() req: any) {
    return this.svc.getCartaPlantilla(req.user.tenantId);
  }

  @Put('carta-plantilla')
  @ApiOperation({ summary: 'Guardar plantilla HTML de la carta de comisión' })
  updateCartaPlantilla(@Req() req: any, @Body() dto: UpdateCartaPlantillaDto) {
    return this.svc.updateCartaPlantilla(req.user.tenantId, dto);
  }

  @Delete('carta-plantilla')
  @ApiOperation({ summary: 'Restaurar plantilla de carta a la versión por defecto' })
  resetCartaPlantilla(@Req() req: any) {
    return this.svc.resetCartaPlantilla(req.user.tenantId);
  }

  // ── Brochure config ────────────────────────────────────────────

  @Get('brochure-config')
  @ApiOperation({ summary: 'Obtener configuración de secciones del brochure' })
  getBrochureConfig(@Req() req: any) {
    return this.svc.getBrochureConfig(req.user.tenantId);
  }

  @Patch('brochure-config')
  @ApiOperation({ summary: 'Actualizar configuración de secciones del brochure' })
  updateBrochureConfig(@Req() req: any, @Body() dto: UpdateBrochureConfigDto) {
    return this.svc.updateBrochureConfig(req.user.tenantId, dto);
  }

  @Post('brochure-config/reset')
  @ApiOperation({ summary: 'Restaurar configuración del brochure a valores por defecto' })
  resetBrochureConfig(@Req() req: any) {
    return this.svc.resetBrochureConfig(req.user.tenantId);
  }
}
