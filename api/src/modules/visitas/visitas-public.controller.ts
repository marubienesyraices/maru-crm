import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VisitasService } from './visitas.service';
import { AccionReprogramarDto } from './dto';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

/** Unauthenticated — client reschedule links */
@ApiTags('Portal Público')
@Controller('api/public/reprogramar')
@SkipAudit()
export class VisitasPublicController {
  constructor(private readonly service: VisitasService) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Obtener información de la visita por token seguro',
  })
  getVisita(@Param('token') token: string) {
    return this.service.getPublicVisita(token);
  }

  @Post(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar, reprogramar o cancelar visita (acción del cliente)',
  })
  procesarAccion(
    @Param('token') token: string,
    @Body() dto: AccionReprogramarDto,
  ) {
    return this.service.procesarAccionCliente(token, dto);
  }
}
