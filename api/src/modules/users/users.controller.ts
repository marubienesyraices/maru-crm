import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateTemaDto, CreateAdminDto, UpdateAdminDto } from './dto';
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

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado (incluye preferencia de tema)' })
  findMe(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findMe(tenantId, userId);
  }

  @Patch('me/tema')
  @ApiOperation({ summary: 'Actualizar preferencia de tema del usuario autenticado' })
  updateTema(
    @CurrentUser('sub') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateTemaDto,
  ) {
    return this.usersService.updateTema(tenantId, userId, dto.tema);
  }

  @Patch('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar token push FCM/APNs de la app móvil' })
  registerPushToken(
    @CurrentUser('sub') userId: string,
    @Body('pushToken') pushToken: string,
  ) {
    return this.usersService.savePushToken(userId, pushToken);
  }

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

  @Get('admins')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Listar todos los administradores de empresas (Solo Super Admin)' })
  findAllAdmins() {
    return this.usersService.findAllAdmins();
  }

  @Post('admins')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Crear administrador para una empresa (Solo Super Admin)' })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.usersService.createAdmin(dto);
  }

  @Put('admins/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar administrador de empresa (Solo Super Admin)' })
  updateAdmin(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminDto) {
    return this.usersService.updateAdmin(id, dto);
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

  @Post(':id/reenviar-activacion')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar correo de activación a usuario pendiente' })
  resendActivation(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('rol') rol: string,
    @Param('id') id: string,
  ) {
    return this.usersService.resendActivation(rol === 'SUPER_ADMIN' ? null : tenantId, id);
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

  @Post(':id/reset-2fa')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar y resetear el 2FA de un usuario (Admin puede forzar re-configuración)' })
  resetTotp(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.resetTotp(tenantId, id);
  }

  @Post(':id/reasignar-subordinados')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reasignar todos los subordinados de un Senior a otro supervisor' })
  reasignarSubordinados(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('toSupervisorId', ParseUUIDPipe) toSupervisorId: string,
  ) {
    return this.usersService.reasignarSubordinados(tenantId, id, toSupervisorId);
  }

  @Post(':id/desbloquear')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desbloquear cuenta de usuario bloqueada por demasiados intentos fallidos' })
  desbloquear(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.desbloquear(tenantId, id);
  }

  @Post(':id/transferir')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Transferir propiedades y trámites a otro agente y desactivar usuario' })
  transferAndDeactivate(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.usersService.transferAndDeactivate(tenantId, id, targetUserId);
  }
}
