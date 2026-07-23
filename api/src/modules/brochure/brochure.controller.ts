import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { BROCHURE_QUEUE, type BrochureJobData } from './brochure.processor';

@ApiTags('Brochure PDF')
@ApiBearerAuth('JWT')
@Controller('api/propiedades/:propiedadId/brochure')
@UseGuards(JwtAuthGuard)
export class BrochureController {
  constructor(
    @InjectQueue(BROCHURE_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Enqueue PDF generation ──────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Encolar generación de brochure PDF (asíncrono)' })
  async enqueue(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
      select: { id: true },
    });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    const docExistente = await this.prisma.propiedadDocumento.findFirst({
      where: {
        propiedad_id: propiedadId,
        nombre: { startsWith: 'Brochure PDF -' },
      },
      select: { id: true },
    });
    if (docExistente) {
      throw new BadRequestException(
        'Ya existe un brochure generado para esta propiedad. Elimínalo del expediente antes de generar uno nuevo.',
      );
    }

    const jobDbId = randomUUID();

    await this.prisma.brochureJob.create({
      data: {
        id: jobDbId,
        propiedad_id: propiedadId,
        tenant_id: user.tenantId,
        user_id: user.sub,
        status: 'PROCESANDO',
      },
    });

    const data: BrochureJobData = {
      jobDbId,
      propiedadId,
      tenantId: user.tenantId,
      userId: user.sub,
    };

    await this.queue.add('generate', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    return { jobId: jobDbId, status: 'PROCESANDO' };
  }

  // ─── Job status ───────────────────────────────────────────────
  @SkipAudit()
  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Consultar estado del job de generación de brochure',
  })
  async status(
    @Param('propiedadId') propiedadId: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const job = await this.prisma.brochureJob.findFirst({
      where: { id: jobId, propiedad_id: propiedadId, tenant_id: user.tenantId },
      select: { status: true, url: true, error: true, created_at: true },
    });
    if (!job) throw new NotFoundException('Job no encontrado');
    return job;
  }

  // ─── Download + tracking ──────────────────────────────────────
  @SkipAudit()
  @Get('jobs/:jobId/download')
  @ApiOperation({ summary: 'Obtener URL de descarga del brochure generado' })
  async download(
    @Param('propiedadId') propiedadId: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const job = await this.prisma.brochureJob.findFirst({
      where: { id: jobId, propiedad_id: propiedadId, tenant_id: user.tenantId },
      select: { id: true, status: true, url: true },
    });

    if (!job) throw new NotFoundException('Job no encontrado');
    if (job.status !== 'LISTO' || !job.url) {
      throw new BadRequestException(
        job.status === 'ERROR'
          ? 'La generación del brochure falló'
          : 'El brochure aún está en proceso',
      );
    }

    // Record download (fire-and-forget)
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    this.prisma.brochureDescarga
      .create({
        data: {
          id: randomUUID(),
          job_id: jobId,
          tenant_id: user.tenantId,
          user_id: user.sub,
          ip,
        },
      })
      .catch(() => {});

    // Serve from local disk or redirect to R2 public URL
    const localPath = this.storage.localPath(job.url);
    if (localPath) {
      return { url: job.url };
    }
    return { url: job.url };
  }

  // ─── Download history for a property ────────────────────────
  @SkipAudit()
  @Get('descargas')
  @ApiOperation({
    summary: 'Historial de descargas de brochures de la propiedad',
  })
  async descargas(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const rows = await this.prisma.brochureDescarga.findMany({
      where: {
        tenant_id: user.tenantId,
        job: { propiedad_id: propiedadId },
      },
      include: { job: { select: { status: true, created_at: true } } },
      orderBy: { downloaded_at: 'desc' },
      take: 100,
    });
    return { total: rows.length, descargas: rows };
  }
}
