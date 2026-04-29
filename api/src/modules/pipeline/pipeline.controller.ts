import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreateInteresDto, CambiarEstadoInteresDto, UpdateInteresDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineController {
  constructor(private service: PipelineService) {}

  @Post()
  crearInteres(@CurrentUser() user: any, @Body() dto: CreateInteresDto) {
    return this.service.crearInteres(user.tenantId, dto);
  }

  @Get()
  getPipeline(@CurrentUser() user: any) {
    return this.service.getPipeline(user.tenantId);
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user.tenantId);
  }

  @Get('propiedad/:propiedadId')
  getByPropiedad(@CurrentUser() user: any, @Param('propiedadId') propiedadId: string) {
    return this.service.getByPropiedad(user.tenantId, propiedadId);
  }

  @Patch(':id/estado')
  cambiarEstado(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CambiarEstadoInteresDto) {
    return this.service.cambiarEstado(user.tenantId, id, dto);
  }

  @Put(':id')
  updateInteres(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateInteresDto) {
    return this.service.updateInteres(user.tenantId, id, dto);
  }

  @Delete(':id')
  deleteInteres(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteInteres(user.tenantId, id);
  }
}
