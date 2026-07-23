import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { FirmaDigitalService } from './firma-digital.service';

class SolicitarFirmaDto {
  firmanteNombre!: string;
  firmanteEmail!: string;
  documentoBase64?: string;
  documentoNombre?: string;
}

@ApiTags('Firma digital')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('api/firma')
export class FirmaDigitalController {
  constructor(private readonly svc: FirmaDigitalService) {}

  @Get(':propiedadId')
  @ApiOperation({ summary: 'Solicitudes de firma para una propiedad' })
  getSolicitudes(@CurrentUser() user: any, @Param('propiedadId') id: string) {
    return this.svc.getSolicitudes(user.tenant_id, id);
  }

  @Post(':propiedadId/solicitar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Enviar solicitud de firma digital vía DocuSign' })
  solicitarFirma(
    @CurrentUser() user: any,
    @Param('propiedadId') id: string,
    @Body() dto: SolicitarFirmaDto,
  ) {
    return this.svc.solicitarFirma(user.tenant_id, id, user.id, dto);
  }

  // DocuSign Connect webhook (unauthenticated)
  @SkipAudit()
  @Post('webhook/docusign')
  @ApiOperation({
    summary: 'Webhook DocuSign Connect — actualiza estado de sobres',
  })
  webhook(@Body() body: any) {
    return this.svc.handleWebhook(body);
  }
}
