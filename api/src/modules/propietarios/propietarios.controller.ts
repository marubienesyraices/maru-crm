import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PropietariosService } from './propietarios.service';
import { CreatePropietarioDto, UpdatePropietarioDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/propietarios')
@UseGuards(JwtAuthGuard)
export class PropietariosController {
  constructor(private service: PropietariosService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePropietarioDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query('busqueda') busqueda?: string) {
    return this.service.findAll(user.tenantId, busqueda);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePropietarioDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}
