import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CampanasService } from './campanas.service';
import { CreateCampanaDto, CreatePlantillaDto, UpdateCampanaDto, UpdatePlantillaDto } from './dto';

@ApiTags('Campañas de Email')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/campanas')
export class CampanasController {
  constructor(private readonly svc: CampanasService) {}

  // ─── Plantillas ──────────────────────────────────────────────

  @SkipAudit()
  @Get('plantillas')
  @ApiOperation({ summary: 'Listar plantillas de email del tenant' })
  listPlantillas(@CurrentUser() user: any) {
    return this.svc.listPlantillas(user.tenantId);
  }

  @SkipAudit()
  @Get('plantillas/:id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  getPlantilla(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getPlantilla(user.tenantId, id);
  }

  @Post('plantillas')
  @ApiOperation({ summary: 'Crear plantilla con soporte de variables {{nombre}}' })
  createPlantilla(@CurrentUser() user: any, @Body() dto: CreatePlantillaDto) {
    return this.svc.createPlantilla(user.tenantId, dto);
  }

  @Put('plantillas/:id')
  @ApiOperation({ summary: 'Actualizar plantilla' })
  updatePlantilla(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePlantillaDto) {
    return this.svc.updatePlantilla(user.tenantId, id, dto);
  }

  @Delete('plantillas/:id')
  @ApiOperation({ summary: 'Eliminar plantilla (solo si no está en uso)' })
  deletePlantilla(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.deletePlantilla(user.tenantId, id);
  }

  @SkipAudit()
  @Post('plantillas/:id/preview')
  @ApiOperation({ summary: 'Vista previa de la plantilla con variables sustituidas' })
  async previewPlantilla(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() vars: Record<string, string>,
  ) {
    const plantilla = await this.svc.getPlantilla(user.tenantId, id);
    return this.svc.previewPlantilla(plantilla, vars);
  }

  // ─── Campañas ────────────────────────────────────────────────

  @SkipAudit()
  @Get()
  @ApiOperation({ summary: 'Listar campañas con estadísticas de apertura' })
  listCampanas(@CurrentUser() user: any) {
    return this.svc.listCampanas(user.tenantId);
  }

  @SkipAudit()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener campaña por ID con tasa de apertura' })
  getCampana(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.getCampana(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear campaña en estado BORRADOR' })
  createCampana(@CurrentUser() user: any, @Body() dto: CreateCampanaDto) {
    return this.svc.createCampana(user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar campaña (solo en estado BORRADOR)' })
  updateCampana(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCampanaDto) {
    return this.svc.updateCampana(user.tenantId, id, dto);
  }

  @Post(':id/enviar')
  @ApiOperation({ summary: 'Enviar campaña a todos los destinatarios del filtro de rol' })
  enviarCampana(@CurrentUser() user: any, @Param('id') id: string) {
    return this.svc.enviarCampana(user.tenantId, id);
  }
}
