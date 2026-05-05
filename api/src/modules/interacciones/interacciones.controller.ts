import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InteraccionesService } from './interacciones.service';
import { CreateInteraccionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Interacciones')
@ApiBearerAuth('JWT')
@Controller('api/interacciones')
@UseGuards(JwtAuthGuard)
export class InteraccionesController {
  constructor(private service: InteraccionesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar interacción (llamada, visita, mensaje…)' })
  create(@CurrentUser() user: any, @Body() dto: CreateInteraccionDto) {
    return this.service.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar interacciones de un interés (?interesId=)' })
  findByInteres(@CurrentUser() user: any, @Query('interesId') interesId: string) {
    return this.service.findByInteres(user.tenantId, interesId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar interacción' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.delete(user.tenantId, id);
  }
}
