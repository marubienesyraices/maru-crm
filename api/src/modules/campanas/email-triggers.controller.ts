import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { EmailTriggersService } from './email-triggers.service';

@ApiTags('Email Triggers')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('api/campanas/triggers')
export class EmailTriggersController {
  constructor(private readonly svc: EmailTriggersService) {}

  @SkipAudit()
  @Get()
  @ApiOperation({ summary: 'Listar disparadores de email configurables' })
  list(@CurrentUser() user: any) {
    return this.svc.listTriggers(user.tenantId);
  }

  @Put(':evento')
  @ApiOperation({ summary: 'Activar/desactivar trigger y asignar plantilla' })
  upsert(
    @CurrentUser() user: any,
    @Param('evento') evento: string,
    @Body() body: { activo: boolean; plantillaId?: string | null },
  ) {
    return this.svc.upsertTrigger(
      user.tenantId,
      evento,
      body.activo,
      body.plantillaId,
    );
  }
}
