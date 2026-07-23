import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    filters: {
      userId?: string;
      modulo?: string;
      accion?: string;
      entidad?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId };

    if (filters.userId) where.user_id = filters.userId;
    if (filters.modulo) where.modulo = filters.modulo;
    if (filters.accion) where.accion = filters.accion;
    if (filters.entidad) where.entidad = filters.entidad;
    if (filters.fechaDesde || filters.fechaHasta) {
      where.created_at = {};
      if (filters.fechaDesde)
        where.created_at.gte = new Date(filters.fechaDesde);
      if (filters.fechaHasta)
        where.created_at.lte = new Date(filters.fechaHasta);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async log(data: {
    tenantId: string;
    userId: string;
    nombreUsuario: string;
    accion: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
    modulo: string;
    entidad: string;
    entidadId?: string;
    ipAddress: string;
    userAgent?: string;
    payloadCambio?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenant_id: data.tenantId,
        user_id: data.userId,
        nombre_usuario: data.nombreUsuario,
        accion: data.accion,
        modulo: data.modulo,
        entidad: data.entidad,
        entidad_id: data.entidadId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        payload_cambio: data.payloadCambio,
      },
    });
  }
}
