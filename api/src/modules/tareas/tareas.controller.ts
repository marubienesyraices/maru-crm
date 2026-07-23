import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TareasService } from './tareas.service';
import { CreateTareaDto, UpdateTareaDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tareas')
@ApiBearerAuth('JWT')
@Controller('api/tareas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis tareas' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.tareasService.findAll(tenantId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear tarea' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTareaDto,
  ) {
    return this.tareasService.create(tenantId, userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar tarea' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTareaDto,
  ) {
    return this.tareasService.update(tenantId, userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar tarea' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.tareasService.remove(tenantId, userId, id);
  }
}
