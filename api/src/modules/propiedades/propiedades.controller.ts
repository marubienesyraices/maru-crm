import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PropiedadesService } from './propiedades.service';
import {
  CreatePropiedadDto,
  UpdatePropiedadDto,
  CambiarEstadoDto,
  FiltrosPropiedadDto,
  PrecioSugeridoQueryDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { VisibilityGuard } from '../../common/guards/visibility.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlanFeature } from '../../common/decorators/plan-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Propiedades')
@ApiBearerAuth('JWT')
@Controller('api/propiedades')
@UseGuards(JwtAuthGuard, VisibilityGuard)
export class PropiedadesController {
  constructor(private service: PropiedadesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva propiedad' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePropiedadDto) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar propiedades con filtros' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltrosPropiedadDto,
    @Req() req: any,
  ) {
    return this.service.findAll(user.tenantId, filtros, req.visibleUserIds);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de propiedades por estado y tipo' })
  getStats(@CurrentUser() user: AuthenticatedUser, @Req() req: any) {
    return this.service.getStats(user.tenantId, req.visibleUserIds);
  }

  @Get('precio-sugerido')
  @UseGuards(PlanGuard)
  @PlanFeature('tiene_mapas')
  @ApiOperation({
    summary: 'Precio sugerido basado en comparables cercanos (PostGIS)',
    description:
      'Si se proveen lat/lng usa ST_DWithin para búsqueda espacial. ' +
      'Fallback: comparables del mismo departamento. ' +
      'Requiere extensión PostGIS instalada en PostgreSQL.',
  })
  getPrecioSugerido(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: PrecioSugeridoQueryDto,
  ) {
    return this.service.getPrecioSugerido(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener propiedad por ID con imágenes y documentos',
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de una propiedad' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropiedadDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Cambiar estado (BORRADOR → DISPONIBLE → VENDIDA…)',
  })
  cambiarEstado(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.service.cambiarEstado(user.tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Eliminar propiedad (solo ADMIN). Requiere estado BORRADOR o SUSPENDIDA sin tramites.',
  })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.service.delete(user.tenantId, id);
    return { message: 'Propiedad eliminada correctamente' };
  }
}
