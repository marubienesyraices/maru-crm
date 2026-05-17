import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogoPlanesService } from './catalogo-planes.service';
import { UpdateCatalogoPlanDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Catálogo de Planes')
@ApiBearerAuth('JWT')
@Controller('api/catalogo-planes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class CatalogoPlanesController {
  constructor(private readonly svc: CatalogoPlanesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar configuración de todos los planes' })
  findAll() {
    return this.svc.findAll();
  }

  @Put(':plan')
  @ApiOperation({ summary: 'Actualizar configuración de un plan' })
  update(@Param('plan') plan: string, @Body() dto: UpdateCatalogoPlanDto) {
    return this.svc.update(plan.toUpperCase(), dto);
  }
}
