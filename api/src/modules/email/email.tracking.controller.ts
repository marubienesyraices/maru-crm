import { Controller, Get, Logger, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

// Minimal 1×1 transparent GIF (43 bytes)
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@ApiTags('Email Tracking')
@SkipAudit()
@Controller('api/email/track')
export class EmailTrackingController {
  private readonly logger = new Logger(EmailTrackingController.name);
  private readonly frontendUrl: string;

  private readonly frontendHost: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    try {
      this.frontendHost = new URL(this.frontendUrl).host;
    } catch {
      this.frontendHost = '';
    }
  }

  private isSafeRedirectUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      // Only allow http/https schemes
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        return false;
      // Allow our frontend host or localhost (for development)
      return (
        parsed.host === this.frontendHost || parsed.hostname === 'localhost'
      );
    } catch {
      return false;
    }
  }

  @Get(':id/open.gif')
  async trackOpen(@Param('id') id: string, @Res() res: any) {
    // Fire-and-forget: record first open without blocking response
    this.prisma.emailEvento
      .updateMany({
        where: { id, abierto_at: null },
        data: { abierto_at: new Date() },
      })
      .catch((err) => this.logger.warn(`Track open failed [${id}]: ${err}`));

    res.set({
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.send(PIXEL_GIF);
  }

  @Get(':id/click')
  async trackClick(
    @Param('id') id: string,
    @Query('url') url: string,
    @Res() res: any,
  ) {
    const isSafe = this.isSafeRedirectUrl(url);
    const target = isSafe ? url : this.frontendUrl;

    if (isSafe) {
      this.prisma.emailEvento
        .updateMany({
          where: { id, primer_clic_at: null },
          data: { primer_clic_at: new Date() },
        })
        .catch((err) => this.logger.warn(`Track click failed [${id}]: ${err}`));
    }

    res.redirect(302, target);
  }
}
