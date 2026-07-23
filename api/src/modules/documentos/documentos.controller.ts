import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TipoDocumento } from '@prisma/client';

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const VALID_TIPOS = [
  'ESCRITURA',
  'PLANO',
  'IUSI',
  'BOLETO_COMPRAVENTA',
  'CONTRATO_ARRENDAMIENTO',
  'DPI_PROPIETARIO',
  'OTRO',
];

@ApiTags('Documentos')
@ApiBearerAuth('JWT')
@Controller('api/propiedades/:propiedadId/documentos')
@UseGuards(JwtAuthGuard)
export class DocumentosController {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Subir documento legal a una propiedad (PDF, imagen, Word)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        tipo: { type: 'string' },
        nombre: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          cb(
            new BadRequestException(`Tipo no permitido: ${file.mimetype}`),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadDocumento(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('tipo') tipo: string,
    @Body('notas') notas?: string,
    @Body('fechaEmision') fechaEmision?: string,
    @Body('fechaVencimiento') fechaVencimiento?: string,
  ) {
    if (!file) throw new BadRequestException('No se envió archivo');
    if (!tipo)
      throw new BadRequestException('El tipo de documento es requerido');
    if (!VALID_TIPOS.includes(tipo))
      throw new BadRequestException(`Tipo inválido: ${tipo}`);

    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    const filename = `doc-${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const url = await this.storage.upload(file.buffer, filename, file.mimetype);

    return this.prisma.propiedadDocumento.create({
      data: {
        propiedad_id: propiedadId,
        tipo: tipo as TipoDocumento,
        nombre: file.originalname,
        url,
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
    @CurrentUser() user: AuthenticatedUser,
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
    });
    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');

    const doc = await this.prisma.propiedadDocumento.findFirst({
      where: { id: docId, propiedad_id: propiedadId },
    });
    if (!doc) throw new BadRequestException('Documento no encontrado');

    await this.storage.remove(doc.url);
    await this.prisma.propiedadDocumento.delete({ where: { id: docId } });
    return { deleted: true };
  }
}
