import {
  Controller, Post, Get, Delete, Param, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoDocumento } from '@prisma/client';

const ALLOWED_MIMES = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const storage = diskStorage({
  destination: join(__dirname, '..', '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    cb(null, `doc-${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

@Controller('api/propiedades/:propiedadId/documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          cb(new BadRequestException(`Tipo no permitido: ${file.mimetype}`), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadDocumento(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('tipo') tipo: string,
    @Body('notas') notas?: string,
    @Body('fechaEmision') fechaEmision?: string,
    @Body('fechaVencimiento') fechaVencimiento?: string,
  ) {
    if (!file) throw new BadRequestException('No se envió archivo');
    if (!tipo) throw new BadRequestException('El tipo de documento es requerido');

    const validTipos = ['ESCRITURA', 'PLANO', 'IUSI', 'BOLETO_COMPRAVENTA', 'CONTRATO_ARRENDAMIENTO', 'DPI_PROPIETARIO', 'OTRO'];
    if (!validTipos.includes(tipo)) throw new BadRequestException(`Tipo inválido: ${tipo}`);

    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    return this.prisma.propiedadDocumento.create({
      data: {
        propiedad_id: propiedadId,
        tipo: tipo as TipoDocumento,
        nombre: file.originalname,
        url: `/uploads/${file.filename}`,
        tamano_bytes: file.size,
        notas,
        fecha_emision: fechaEmision ? new Date(fechaEmision) : null,
        fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      },
    });
  }

  @Get()
  async listDocumentos(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    return this.prisma.propiedadDocumento.findMany({
      where: { propiedad_id: propiedadId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Delete(':docId')
  async deleteDocumento(
    @Param('propiedadId') propiedadId: string,
    @Param('docId') docId: string,
    @CurrentUser() user: any,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    const doc = await this.prisma.propiedadDocumento.findFirst({
      where: { id: docId, propiedad_id: propiedadId },
    });
    if (!doc) throw new BadRequestException('Documento no encontrado');

    const filePath = join(__dirname, '..', '..', '..', doc.url);
    if (existsSync(filePath)) unlinkSync(filePath);

    await this.prisma.propiedadDocumento.delete({ where: { id: docId } });
    return { deleted: true };
  }
}
