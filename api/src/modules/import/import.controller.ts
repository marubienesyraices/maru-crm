import {
  Controller,
  Post,
  Get,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
  'application/octet-stream',
];

const fileInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      ALLOWED_MIMES.includes(file.mimetype) ||
      file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (!ok)
      cb(
        new BadRequestException('Solo se aceptan archivos .xlsx, .xls o .csv'),
        false,
      );
    else cb(null, true);
  },
});

@ApiTags('Importación')
@ApiBearerAuth('JWT')
@Controller('api/import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SENIOR', 'SUPER_ADMIN')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('clientes')
  @UseInterceptors(fileInterceptor)
  @ApiOperation({ summary: 'Importar clientes desde archivo Excel/CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  importClientes(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    return this.service.importClientes(
      user.tenantId,
      file.buffer,
      file.originalname,
    );
  }

  @Get('clientes/template')
  @ApiOperation({
    summary: 'Descargar plantilla CSV para importación de clientes',
  })
  downloadClientesTemplate(@Res() res: Response) {
    const csv = this.service.clientesTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_clientes.csv"',
    );
    res.send('﻿' + csv);
  }

  @Post('propiedades')
  @UseInterceptors(fileInterceptor)
  @ApiOperation({ summary: 'Importar propiedades desde archivo Excel/CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  importPropiedades(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    return this.service.importPropiedades(
      user.tenantId,
      file.buffer,
      user.sub,
      file.originalname,
    );
  }

  @Get('propiedades/template')
  @ApiOperation({
    summary: 'Descargar plantilla CSV para importación de propiedades',
  })
  downloadPropiedadesTemplate(@Res() res: Response) {
    const csv = this.service.propiedadesTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_propiedades.csv"',
    );
    res.send('﻿' + csv);
  }
}
