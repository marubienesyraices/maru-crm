import {
  Controller, Get, Post, Put, Patch, Body, Param, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PropiedadesService } from './propiedades.service';
import { CreatePropiedadDto, UpdatePropiedadDto, CambiarEstadoDto, FiltrosPropiedadDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VisibilityGuard } from '../../common/guards/visibility.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Propiedades')
@ApiBearerAuth('JWT')
@Controller('api/propiedades')
@UseGuards(JwtAuthGuard, VisibilityGuard)
export class PropiedadesController {
  constructor(private service: PropiedadesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva propiedad' })
  create(@CurrentUser() user: any, @Body() dto: CreatePropiedadDto) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar propiedades con filtros' })
  findAll(@CurrentUser() user: any, @Query() filtros: FiltrosPropiedadDto, @Req() req: any) {
    return this.service.findAll(user.tenantId, filtros, req.visibleUserIds);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de propiedades por estado y tipo' })
  getStats(@CurrentUser() user: any, @Req() req: any) {
    return this.service.getStats(user.tenantId, req.visibleUserIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener propiedad por ID con imágenes y documentos' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de una propiedad' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePropiedadDto) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado (BORRADOR → DISPONIBLE → VENDIDA…)' })
  cambiarEstado(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CambiarEstadoDto) {
    return this.service.cambiarEstado(user.tenantId, id, dto);
  }
}
