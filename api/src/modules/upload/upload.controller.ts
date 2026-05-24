import {
  Controller, Post, Delete, Param, UseGuards, UseInterceptors,
  UploadedFiles, BadRequestException, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ImageService } from './image.service';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  @Post()
  @ApiOperation({ summary: 'Subir imágenes a una propiedad (máx. 10 archivos)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          cb(new BadRequestException(`Tipo no permitido: ${file.mimetype}. Use: ${ALLOWED_MIMES.join(', ')}`), false);
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
    if (!files?.length) throw new BadRequestException('No se enviaron archivos');

    const [propiedad, tenant] = await Promise.all([
      this.prisma.propiedad.findFirst({ where: { id: propiedadId, tenant_id: user.tenantId } }),
      this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { nombre: true } }),
    ]);
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    const tenantName = tenant?.nombre ?? 'GestProp';

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
      const processed = await this.imageService.processImage(file.buffer, tenantName);
      const filename = `${randomUUID()}.jpg`;
      const url = await this.storage.upload(processed, filename, 'image/jpeg');
      const isPortada = !hasCover && i === 0;

      const img = await this.prisma.propiedadImagen.create({
        data: {
          propiedad_id: propiedadId,
          url,
          nombre: file.originalname,
          tipo: isPortada ? 'portada' : 'galeria',
          orden: nextOrder++,
          tamano_bytes: processed.length,
        },
      });
      created.push(img);
    }

    return { uploaded: created.length, images: created };
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
      this.prisma.propiedadImagen.update({ where: { id }, data: { orden: index } }),
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
