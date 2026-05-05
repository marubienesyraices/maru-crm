import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MODE = 'insensitive' as const;
const TAKE = 5;

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(tenantId: string, q: string, visibleUserIds: string[] | null) {
    const term = (q || '').trim();
    if (term.length < 2) return { propiedades: [], clientes: [], pipeline: [] };

    const clienteFilter: any = { tenant_id: tenantId };
    if (visibleUserIds) clienteFilter.agente_id = { in: visibleUserIds };

    const [propiedades, clientes, pipeline] = await Promise.all([

      // ─── Propiedades ─────────────────────────────────────────
      this.prisma.propiedad.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { codigo:      { contains: term, mode: MODE } },
            { titulo:      { contains: term, mode: MODE } },
            { zona:        { contains: term, mode: MODE } },
            { municipio:   { contains: term, mode: MODE } },
            { descripcion: { contains: term, mode: MODE } },
          ],
        },
        select: {
          id: true, codigo: true, titulo: true, tipo: true, estado: true,
          zona: true, municipio: true,
          imagenes: { where: { tipo: 'portada' }, take: 1, select: { url: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: TAKE,
      }),

      // ─── Clientes ─────────────────────────────────────────────
      this.prisma.cliente.findMany({
        where: {
          ...clienteFilter,
          OR: [
            { nombre:   { contains: term, mode: MODE } },
            { email:    { contains: term, mode: MODE } },
            { telefono: { contains: term } },
            { dpi:      { contains: term } },
          ],
        },
        select: {
          id: true, nombre: true, email: true, telefono: true, origen: true,
        },
        orderBy: { updated_at: 'desc' },
        take: TAKE,
      }),

      // ─── Pipeline ─────────────────────────────────────────────
      this.prisma.clientePropiedad.findMany({
        where: {
          cliente: clienteFilter,
          OR: [
            { cliente:   { nombre:  { contains: term, mode: MODE } } },
            { propiedad: { codigo:  { contains: term, mode: MODE } } },
            { propiedad: { titulo:  { contains: term, mode: MODE } } },
          ],
        },
        select: {
          id: true, estado: true,
          cliente:   { select: { id: true, nombre: true } },
          propiedad: { select: { id: true, codigo: true, titulo: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: TAKE,
      }),

    ]);

    return { propiedades, clientes, pipeline };
  }
}
