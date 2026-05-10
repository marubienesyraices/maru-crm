import { Controller, Get, Post, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { BiService } from './bi.service';

function parseDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('Business Intelligence')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('api/bi')
export class BiController {
  constructor(private readonly bi: BiService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
  @SkipAudit()
  @Get('resumen')
  @ApiOperation({ summary: 'KPIs del período: nuevos leads, cierres, tasa de conversión, comisiones' })
  getResumen(
    @CurrentUser() user: any,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
  ) {
    return this.bi.getResumen(user.tenant_id, parseDate(desdeStr), parseDate(hastaStr));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
  @SkipAudit()
  @Get('agentes')
  @ApiOperation({ summary: 'Desempeño por agente: cierres, comisiones, conversión, visitas' })
  getAgentes(
    @CurrentUser() user: any,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
  ) {
    return this.bi.getAgentes(user.tenant_id, parseDate(desdeStr), parseDate(hastaStr));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
  @SkipAudit()
  @Get('propiedades/top')
  @ApiOperation({ summary: 'Top propiedades por número de interacciones en el período' })
  getTopPropiedades(
    @CurrentUser() user: any,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.bi.getTopPropiedades(user.tenant_id, parseDate(desdeStr), parseDate(hastaStr), limit);
  }

  @SkipAudit()
  @Get('ranking')
  @ApiOperation({ summary: 'Ranking de agentes con badges (nombres anónimos para no-admin)' })
  getRanking(
    @CurrentUser() user: any,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
  ) {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.rol);
    return this.bi.getRanking(user.tenant_id, user.id, isAdmin, parseDate(desdeStr), parseDate(hastaStr));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
  @SkipAudit()
  @Get('productividad')
  @ApiOperation({ summary: 'Contador de llamadas/emails/mensajes por agente en el período' })
  getProductividad(
    @CurrentUser() user: any,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
  ) {
    return this.bi.getProductividad(user.tenant_id, parseDate(desdeStr), parseDate(hastaStr));
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @SkipAudit()
  @Post('cache/flush')
  @ApiOperation({ summary: 'Invalidar caché BI del tenant (forzar recálculo en siguiente consulta)' })
  async flushCache(@CurrentUser() user: any) {
    await this.bi.flushTenantCache(user.tenant_id);
    return { ok: true };
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
  @Get('export/agentes')
  @ApiOperation({ summary: 'Exportar reporte de agentes a XLSX' })
  async exportAgentes(
    @Res() res: any,
    @CurrentUser() user: any,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
  ) {
    const buffer = await this.bi.exportAgentesXlsx(user.tenant_id, parseDate(desdeStr), parseDate(hastaStr));
    const filename = `agentes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }
}
