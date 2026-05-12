import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Plan, EstadoTenant } from '@prisma/client';
import { CreateTenantDto, UpdateTenantDto } from './dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const tenant = await this.prisma.tenant.create({
      data: {
        nombre: dto.nombre,
        logo_url: dto.logoUrl,
        color_primario: dto.colorPrimario || '#3b82f6',
        color_secundario: dto.colorSecundario || '#1e293b',
        color_acento: dto.colorAcento || '#8b5cf6',
        color_fondo_alterno: dto.colorFondoAlterno || '#111827',
        color_fondo_principal: dto.colorFondoPrincipal || '#0a0e1a',
        color_texto: dto.colorTexto || '#f1f5f9',
        plan: (dto.plan as Plan) || 'FREE',
        moneda: dto.moneda || 'GTQ',
        zona_horaria: dto.zonaHoraria || 'America/Guatemala',
        limite_usuarios: dto.limiteUsuarios || 10,
        limite_propiedades: dto.limitePropiedades || 100,
      },
    });

    await this.prisma.configSeguridad.create({
      data: {
        tenant_id: tenant.id,
        geo_paises: ['GT', 'SV'],
        dias_inactividad_lead: 21,
      },
    });

    const activationToken = randomUUID();
    const tempPassword = await bcrypt.hash('temp-will-be-changed', 12);

    const admin = await this.prisma.user.create({
      data: {
        tenant_id: tenant.id,
        email: dto.adminEmail,
        password_hash: tempPassword,
        nombre: dto.adminNombre,
        rol: 'ADMIN',
        estado: 'PENDIENTE',
        activation_token: activationToken,
        activation_expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    console.log(`[DEV] Activation link: ${process.env.FRONTEND_URL}/onboarding?token=${activationToken}`);

    return { tenant, admin: { id: admin.id, email: admin.email, activationToken } };
  }

  async getBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { nombre: true, logo_url: true, color_primario: true, color_secundario: true, color_acento: true, color_fondo_alterno: true, color_fondo_principal: true, color_texto: true },
    });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      include: { _count: { select: { usuarios: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { config_seguridad: true, _count: { select: { usuarios: true } } },
    });
    if (!tenant) throw new NotFoundException('Empresa no encontrada');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        logo_url: dto.logoUrl,
        color_primario: dto.colorPrimario,
        color_secundario: dto.colorSecundario,
        color_acento: dto.colorAcento,
        color_fondo_alterno: dto.colorFondoAlterno,
        color_fondo_principal: dto.colorFondoPrincipal,
        color_texto: dto.colorTexto,
        plan: dto.plan as Plan | undefined,
        moneda: dto.moneda,
        zona_horaria: dto.zonaHoraria,
        limite_usuarios: dto.limiteUsuarios,
        limite_propiedades: dto.limitePropiedades,
        estado: dto.estado as EstadoTenant | undefined,
      },
    });
  }
}
