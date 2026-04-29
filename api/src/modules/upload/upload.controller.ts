import {
  Controller, Post, Delete, Param, UseGuards, UseInterceptors,
  UploadedFiles, BadRequestException, Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = diskStorage({
  destination: join(__dirname, '..', '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

@Controller('api/propiedades/:propiedadId/imagenes')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private prisma: PrismaService) {}

  /**
   * Upload up to 10 images at once for a property.
   * Sets the first image as "portada" if none exists.
   */
  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
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

    // Verify property exists and belongs to tenant
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    // Get current max order
    const maxOrder = await this.prisma.propiedadImagen.aggregate({
      where: { propiedad_id: propiedadId },
      _max: { orden: true },
    });
    let nextOrder = (maxOrder._max.orden ?? -1) + 1;

    // Check if property has a cover image
    const hasCover = await this.prisma.propiedadImagen.findFirst({
      where: { propiedad_id: propiedadId, tipo: 'portada' },
    });

    const created = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPortada = !hasCover && i === 0;

      const img = await this.prisma.propiedadImagen.create({
        data: {
          propiedad_id: propiedadId,
          url: `/uploads/${file.filename}`,
          nombre: file.originalname,
          tipo: isPortada ? 'portada' : 'galeria',
          orden: nextOrder++,
          tamano_bytes: file.size,
        },
      });
      created.push(img);
    }

    return { uploaded: created.length, images: created };
  }

  /**
   * Set a specific image as the cover photo.
   */
  @Post(':imagenId/portada')
  async setPortada(
    @Param('propiedadId') propiedadId: string,
    @Param('imagenId') imagenId: string,
    @CurrentUser() user: any,
  ) {
    // Verify ownership
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    // Remove current portada
    await this.prisma.propiedadImagen.updateMany({
      where: { propiedad_id: propiedadId, tipo: 'portada' },
      data: { tipo: 'galeria' },
    });

    // Set new portada
    return this.prisma.propiedadImagen.update({
      where: { id: imagenId },
      data: { tipo: 'portada' },
    });
  }

  /**
   * Reorder images via a list of IDs.
   */
  @Post('reorder')
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

  /**
   * Delete an image (removes file from disk too).
   */
  @Delete(':imagenId')
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

    // Delete file from disk
    const filePath = join(__dirname, '..', '..', '..', imagen.url);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await this.prisma.propiedadImagen.delete({ where: { id: imagenId } });

    return { deleted: true };
  }
}
