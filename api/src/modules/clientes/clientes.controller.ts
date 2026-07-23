import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto, UpdateClienteDto, FiltrosClienteDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Clientes')
@ApiBearerAuth('JWT')
@Controller('api/clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private service: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  create(@CurrentUser() user: any, @Body() dto: CreateClienteDto) {
    return this.service.create(user.tenantId, dto, user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar contactos (clientes y/o propietarios) con filtros',
  })
  findAll(@CurrentUser() user: any, @Query() filtros: FiltrosClienteDto) {
    return this.service.findAll(user.tenantId, filtros);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de clientes por origen' })
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }

  @Get(':id/matching')
  @ApiOperation({
    summary: 'Propiedades que coinciden con las preferencias del cliente',
  })
  findMatchingProperties(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findMatchingProperties(user.tenantId, id);
  }
}
