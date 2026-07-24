import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard } from '../../common/guards/plan.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlanFeature } from '../../common/decorators/plan-feature.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { MetaService } from './meta.service';
import {
  CreateMetaPublicacionDto,
  ProgramarMetaDto,
  UpdateMetaPublicacionDto,
} from './dto';

@ApiTags('Meta (Facebook / Instagram)')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
@PlanFeature('tiene_integraciones')
@Controller('api/meta')
export class MetaController {
  constructor(private readonly svc: MetaService) {}

  @SkipAudit()
  @Get('status')
  @ApiOperation({
    summary: 'Verifica si las credenciales de Meta están configuradas',
  })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.getStatus(user.tenantId);
  }

  @SkipAudit()
  @Get()
  @ApiOperation({ summary: 'Listar publicaciones Meta del tenant' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user.tenantId);
  }

  @SkipAudit()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener publicación Meta por ID' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear borrador de publicación Meta' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMetaPublicacionDto,
  ) {
    return this.svc.create(user.tenantId, user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar borrador (solo en estado BORRADOR)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMetaPublicacionDto,
  ) {
    return this.svc.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar publicación (no PUBLICADA)' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.delete(user.tenantId, id);
  }

  @SkipAudit()
  @Post('preview-texto/:propiedadId')
  @ApiOperation({
    summary: 'Generar texto sugerido de publicación a partir de una propiedad',
  })
  previewTexto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propiedadId') propiedadId: string,
  ) {
    return this.svc.previewTexto(user.tenantId, propiedadId);
  }

  @Post(':id/publicar')
  @ApiOperation({ summary: 'Publicar inmediatamente en Facebook / Instagram' })
  publicar(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.publicar(user.tenantId, id);
  }

  @Post(':id/programar')
  @ApiOperation({ summary: 'Programar publicación futura (mín. 10 min)' })
  programar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ProgramarMetaDto,
  ) {
    return this.svc.programar(user.tenantId, id, new Date(dto.programado_para));
  }
}
