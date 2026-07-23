import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { VisitasService } from './visitas.service';
import { CreateVisitaDto, UpdateVisitaDto, ReporteVisitaDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VisibilityGuard } from '../../common/guards/visibility.guard';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@ApiTags('Visitas')
@ApiBearerAuth('JWT')
@Controller('api/visitas')
@UseGuards(JwtAuthGuard, VisibilityGuard)
export class VisitasController {
  constructor(private readonly service: VisitasService) {}

  @Post()
  @ApiOperation({
    summary:
      'Agendar nueva visita (envía email al cliente con enlace de gestión)',
  })
  create(@Req() req: any, @Body() dto: CreateVisitaDto) {
    return this.service.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get('config')
  @SkipAudit()
  @ApiOperation({
    summary: 'Configuración de visitas del tenant (buffer entre citas)',
  })
  getConfig(@Req() req: any) {
    return this.service.getConfig(req.user.tenantId);
  }

  @Get()
  @SkipAudit()
  @ApiOperation({
    summary: 'Listar visitas con filtros de fecha, agente y estado',
  })
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, req.visibleUserIds, {
      from: query.from,
      to: query.to,
      agenteId: query.agenteId,
      interesId: query.interesId,
      estado: query.estado,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar fecha, ubicación o estado de una visita',
  })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVisitaDto,
  ) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar visita' })
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }

  @Patch(':id/reporte')
  @ApiOperation({
    summary: 'Registrar reporte post-visita (marca como REALIZADA)',
  })
  submitReporte(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReporteVisitaDto,
  ) {
    return this.service.submitReporte(req.user.tenantId, id, dto);
  }

  @Post(':id/resumen-propietario')
  @ApiOperation({
    summary:
      'Enviar resumen de la visita (sin datos del cliente) al propietario por email',
  })
  enviarResumenPropietario(@Req() req: any, @Param('id') id: string) {
    return this.service.enviarResumenPropietario(req.user.tenantId, id);
  }

  @Get(':id/ics')
  @SkipAudit()
  @ApiOperation({
    summary: 'Descargar archivo .ics para agregar al calendario',
  })
  async downloadIcs(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const ics = await this.service.generateIcs(req.user.tenantId, id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="visita-${id}.ics"`,
    );
    res.send(ics);
  }
}
