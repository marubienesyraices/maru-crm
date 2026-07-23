import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VisibilityGuard } from '../../common/guards/visibility.guard';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@ApiTags('Búsqueda')
@ApiBearerAuth('JWT')
@Controller('api/search')
@UseGuards(JwtAuthGuard, VisibilityGuard)
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @SkipAudit()
  @ApiOperation({
    summary: 'Búsqueda global federada: propiedades, clientes y pipeline (?q=)',
  })
  @ApiQuery({ name: 'q', description: 'Texto a buscar', required: true })
  search(@Req() req: any, @Query('q') q: string) {
    return this.service.search(req.user.tenantId, q, req.visibleUserIds);
  }
}
