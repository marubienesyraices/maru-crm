import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PipelineService } from './pipeline.service';
import {
  CreateInteresDto,
  CambiarEstadoInteresDto,
  UpdateInteresDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VisibilityGuard } from '../../common/guards/visibility.guard';
import type { VisibilityRequest } from '../../common/guards/visibility.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Pipeline')
@ApiBearerAuth('JWT')
@Controller('api/pipeline')
@UseGuards(JwtAuthGuard, VisibilityGuard)
export class PipelineController {
  constructor(private service: PipelineService) {}

  @Post()
  @ApiOperation({ summary: 'Crear interés (vincular cliente con propiedad)' })
  crearInteres(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInteresDto,
  ) {
    return this.service.crearInteres(user.tenantId, dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los intereses del pipeline (vista Kanban)',
  })
  getPipeline(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: VisibilityRequest,
  ) {
    return this.service.getPipeline(user.tenantId, req.visibleUserIds);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del embudo de ventas' })
  getStats(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: VisibilityRequest,
  ) {
    return this.service.getStats(user.tenantId, req.visibleUserIds);
  }

  @Get('propiedad/:propiedadId')
  @ApiOperation({ summary: 'Obtener intereses de una propiedad específica' })
  getByPropiedad(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propiedadId') propiedadId: string,
  ) {
    return this.service.getByPropiedad(user.tenantId, propiedadId);
  }

  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Cambiar estado del interés (NUEVO → CONTACTADO → GANADO…)',
  })
  cambiarEstado(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: VisibilityRequest,
    @Param('id') id: string,
    @Body() dto: CambiarEstadoInteresDto,
  ) {
    return this.service.cambiarEstado(
      user.tenantId,
      id,
      dto,
      user.rol,
      user.sub,
      req.visibleUserIds ?? null,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de un interés' })
  updateInteres(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInteresDto,
  ) {
    return this.service.updateInteres(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar interés del pipeline' })
  deleteInteres(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteInteres(user.tenantId, id);
  }
}
