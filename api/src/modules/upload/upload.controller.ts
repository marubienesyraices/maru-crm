import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ImageService } from './image.service';

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_FILE_SIZE = MAX_IMAGE_SIZE; // legacy alias used by FilesInterceptor below
const MAX_IMAGENES = 30;
const MAX_VIDEOS = 3;

@ApiTags('Imágenes')
@ApiBearerAuth('JWT')
@Controller('api/propiedades/:propiedadId/imagenes')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private imageService: ImageService,
  ) {}

  // ─── helpers ──────────────────────────────────────────────

  private async assertPropiedad(propiedadId: string, tenantId: string) {
    const p = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
    });
    if (!p) throw new BadRequestException('Propiedad no encontrada');
    return p;
  }

  // ─── Images ───────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: `Subir imágenes a una propiedad (máx. ${MAX_IMAGENES} en total, 10 por petición)`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              `Tipo no permitido: ${file.mimetype}. Use: ${ALLOWED_IMAGE_MIMES.join(', ')}`,
            ),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadImages(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length)
      throw new BadRequestException('No se enviaron archivos');

    await this.assertPropiedad(propiedadId, user.tenantId);

    const existingCount = await this.prisma.propiedadImagen.count({
      where: {
        propiedad_id: propiedadId,
        tipo: { in: ['portada', 'galeria'] },
      },
    });
    if (existingCount + files.length > MAX_IMAGENES) {
      throw new BadRequestException(
        `Límite de imágenes alcanzado. Tienes ${existingCount}/${MAX_IMAGENES}. Solo puedes agregar ${MAX_IMAGENES - existingCount} más.`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { nombre: true, logo_url: true },
    });
    const tenantName = tenant?.nombre ?? 'GestProp';
    const tenantLogoBuffer = tenant?.logo_url
      ? await this.storage.readBuffer(tenant.logo_url).catch(() => null)
      : null;

    const maxOrder = await this.prisma.propiedadImagen.aggregate({
      where: { propiedad_id: propiedadId },
      _max: { orden: true },
    });
    let nextOrder = (maxOrder._max.orden ?? -1) + 1;

    const hasCover = await this.prisma.propiedadImagen.findFirst({
      where: { propiedad_id: propiedadId, tipo: 'portada' },
    });

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { processed, thumbnail, original } =
        await this.imageService.processImageFull(
          file.buffer,
          tenantName,
          tenantLogoBuffer,
        );
      const base = randomUUID();
      const [url, thumbnailUrl, originalUrl] = await Promise.all([
        this.storage.upload(processed, `${base}.jpg`, 'image/jpeg'),
        this.storage.upload(thumbnail, `${base}_thumb.jpg`, 'image/jpeg'),
        this.storage.upload(
          original,
          `${base}_original${this.ext(file.mimetype)}`,
          file.mimetype,
        ),
      ]);
      const isPortada = !hasCover && i === 0;

      const img = await this.prisma.propiedadImagen.create({
        data: {
          propiedad_id: propiedadId,
          url,
          thumbnail_url: thumbnailUrl,
          original_url: originalUrl,
          nombre: file.originalname,
          tipo: isPortada ? 'portada' : 'galeria',
          orden: nextOrder++,
          tamano_bytes: processed.length,
        },
      });
      created.push(img);
    }

    return {
      uploaded: created.length,
      total: existingCount + created.length,
      limite: MAX_IMAGENES,
      images: created,
    };
  }

  private ext(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return map[mime] ?? '.bin';
  }

  // ─── Videos ───────────────────────────────────────────────

  @Post('videos')
  @ApiOperation({
    summary: `Subir videos a una propiedad (máx. ${MAX_VIDEOS} en total, 1 por petición)`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_VIDEO_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
          cb(
            new BadRequestException(
              `Tipo no permitido: ${file.mimetype}. Use: ${ALLOWED_VIDEO_MIMES.join(', ')}`,
            ),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadVideos(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length)
      throw new BadRequestException('No se enviaron archivos');

    await this.assertPropiedad(propiedadId, user.tenantId);

    const existingCount = await this.prisma.propiedadImagen.count({
      where: { propiedad_id: propiedadId, tipo: 'video' },
    });
    if (existingCount + files.length > MAX_VIDEOS) {
      throw new BadRequestException(
        `Límite de videos alcanzado. Tienes ${existingCount}/${MAX_VIDEOS}. Solo puedes agregar ${MAX_VIDEOS - existingCount} más.`,
      );
    }

    const maxOrder = await this.prisma.propiedadImagen.aggregate({
      where: { propiedad_id: propiedadId },
      _max: { orden: true },
    });
    let nextOrder = (maxOrder._max.orden ?? -1) + 1;

    const ext: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };

    const created = [];
    for (const file of files) {
      const filename = `${randomUUID()}.${ext[file.mimetype] ?? 'mp4'}`;
      const url = await this.storage.upload(
        file.buffer,
        filename,
        file.mimetype,
      );

      const vid = await this.prisma.propiedadImagen.create({
        data: {
          propiedad_id: propiedadId,
          url,
          nombre: file.originalname,
          tipo: 'video',
          orden: nextOrder++,
          tamano_bytes: file.size,
        },
      });
      created.push(vid);
    }

    return {
      uploaded: created.length,
      total: existingCount + created.length,
      limite: MAX_VIDEOS,
      videos: created,
    };
  }

  @Post(':imagenId/portada')
  @ApiOperation({ summary: 'Marcar imagen como portada de la propiedad' })
  async setPortada(
    @Param('propiedadId') propiedadId: string,
    @Param('imagenId') imagenId: string,
    @CurrentUser() user: any,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    await this.prisma.propiedadImagen.updateMany({
      where: { propiedad_id: propiedadId, tipo: 'portada' },
      data: { tipo: 'galeria' },
    });

    return this.prisma.propiedadImagen.update({
      where: { id: imagenId },
      data: { tipo: 'portada' },
    });
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reordenar imágenes de la propiedad' })
  async reorder(
    @Param('propiedadId') propiedadId: string,
    @Body('imageIds') imageIds: string[],
    @CurrentUser() user: any,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    const updates = imageIds.map((id, index) =>
      this.prisma.propiedadImagen.update({
        where: { id },
        data: { orden: index },
      }),
    );
    await this.prisma.$transaction(updates);

    return { reordered: imageIds.length };
  }

  @Delete(':imagenId')
  @ApiOperation({ summary: 'Eliminar imagen de una propiedad' })
  async deleteImage(
    @Param('propiedadId') propiedadId: string,
    @Param('imagenId') imagenId: string,
    @CurrentUser() user: any,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    const imagen = await this.prisma.propiedadImagen.findFirst({
      where: { id: imagenId, propiedad_id: propiedadId },
    });
    if (!imagen) throw new BadRequestException('Imagen no encontrada');

    await this.storage.remove(imagen.url);
    await this.prisma.propiedadImagen.delete({ where: { id: imagenId } });

    return { deleted: true };
  }
}
