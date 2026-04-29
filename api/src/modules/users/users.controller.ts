import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(tenantId, dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get('hierarchy')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getHierarchy(@CurrentUser('tenantId') tenantId: string) {
    return this.usersService.getHierarchyTree(tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.findOne(tenantId, id);
  }

  @Get(':id/downline')
  getDownline(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.getDownline(tenantId, id);
  }

  @Get(':id/upline')
  getUpline(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.usersService.getUpline(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }
}
