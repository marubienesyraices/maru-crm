import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PropietariosService } from './propietarios.service';
import { CreatePropietarioDto, UpdatePropietarioDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Propietarios')
@ApiBearerAuth('JWT')
@Controller('api/propietarios')
@UseGuards(JwtAuthGuard)
export class PropietariosController {
  constructor(private service: PropietariosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo propietario' })
  create(@CurrentUser() user: any, @Body() dto: CreatePropietarioDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar propietarios con búsqueda por nombre/DPI' })
  findAll(@CurrentUser() user: any, @Query('busqueda') busqueda?: string) {
    return this.service.findAll(user.tenantId, busqueda);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener propietario por ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos del propietario' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePropietarioDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}
