import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, UpdateConfigSeguridadDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';

@ApiTags('Empresas')
@ApiBearerAuth('JWT')
@Controller('api/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(
    private tenantsService: TenantsService,
    private readonly storage: StorageService,
  ) {}

  @Get('branding')
  @ApiOperation({ summary: 'Colores y marca del tenant del usuario autenticado' })
  getBranding(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.getBranding(tenantId);
  }

  @Get('mi-tenant')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Obtener datos del propio tenant (ADMIN)' })
  getMyTenant(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Patch('mi-tenant')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar nombre, logo y colores del propio tenant (ADMIN)' })
  updateMyTenant(@CurrentUser('tenantId') tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(tenantId, dto);
  }

  @Patch('mi-tenant/config-seguridad')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar configuración fiscal y de negocio del tenant (porcentaje IVA, comisión default, etc.)' })
  updateMyConfigSeguridad(@CurrentUser('tenantId') tenantId: string, @Body() dto: UpdateConfigSeguridadDto) {
    return this.tenantsService.updateConfigSeguridad(tenantId, dto);
  }

  @Post('mi-tenant/logo')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Subir logo de la empresa (ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException(`Tipo no permitido. Usa: JPEG, PNG, WebP o SVG`), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadLogo(
    @CurrentUser('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'image/svg+xml': 'svg',
    };
    const filename = `logos/${randomUUID()}.${extMap[file.mimetype] ?? 'jpg'}`;
    const url = await this.storage.upload(file.buffer, filename, file.mimetype);
    await this.tenantsService.update(tenantId, { logoUrl: url });
    return { url };
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Crear nueva empresa/tenant (Solo Super Admin)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Listar todas las empresas (Solo Super Admin)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Obtener empresa por ID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar datos de la empresa' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/cancelar')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Baja lógica: marca la empresa como CANCELADA y expulsa sesiones' })
  cancelar(@Param('id') id: string) {
    return this.tenantsService.cancelTenant(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar empresa y todos sus datos de forma permanente (IRREVERSIBLE)' })
  hardDelete(@Param('id') id: string) {
    return this.tenantsService.hardDeleteTenant(id);
  }
}
