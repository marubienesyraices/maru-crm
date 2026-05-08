import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipAudit } from './common/decorators/skip-audit.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @SkipAudit()
  @ApiOperation({ summary: 'Liveness check para Docker / load balancer' })
  check() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
