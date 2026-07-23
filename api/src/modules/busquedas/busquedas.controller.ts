import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { BusquedasService } from './busquedas.service';

@ApiTags('Búsquedas Guardadas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('api/clientes/:clienteId/busquedas')
export class BusquedasController {
  constructor(private readonly svc: BusquedasService) {}

  @SkipAudit()
  @Get()
  @ApiOperation({ summary: 'Listar búsquedas guardadas del cliente' })
  list(@CurrentUser() user: AuthenticatedUser, @Param('clienteId') clienteId: string) {
    return this.svc.list(user.tenantId, clienteId);
  }

  @Post()
  @ApiOperation({ summary: 'Guardar una búsqueda con filtros' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clienteId') clienteId: string,
    @Body()
    body: {
      nombre: string;
      filtros: Record<string, unknown>;
      alertas?: boolean;
    },
  ) {
    return this.svc.create(
      user.tenantId,
      clienteId,
      body.nombre,
      body.filtros,
      body.alertas,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar búsqueda guardada' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clienteId') clienteId: string,
    @Param('id') id: string,
  ) {
    return this.svc.delete(user.tenantId, clienteId, id);
  }
}
