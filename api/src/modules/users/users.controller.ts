import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT')
@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Crear nuevo usuario en el tenant' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(tenantId, dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Listar todos los usuarios del tenant' })
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get('hierarchy')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Árbol jerárquico de usuarios (supervisores → subordinados)' })
  getHierarchy(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.getHierarchyTree(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Get(':id/downline')
  @ApiOperation({ summary: 'Subordinados recursivos de un usuario' })
  getDownline(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.getDownline(tenantId, id);
  }

  @Get(':id/upline')
  @ApiOperation({ summary: 'Cadena de supervisores de un usuario' })
  getUpline(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.getUpline(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar datos del usuario' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }
}
