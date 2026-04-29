import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, UpdateClienteDto, FiltrosClienteDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private service: ClientesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateClienteDto) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() filtros: FiltrosClienteDto) {
    return this.service.findAll(user.tenantId, filtros);
  }

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateClienteDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}
