import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';

// ─── Types ────────────────────────────────────────────────────

export interface ImportError {
  row: number;
  campo: string;
  mensaje: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

// ─── Constants ────────────────────────────────────────────────

const ORIGENES_VALIDOS = ['PORTAL_WEB', 'REFERIDO', 'LLAMADA', 'WHATSAPP', 'REDES_SOCIALES', 'FERIA', 'OTRO'];
const TIPOS_VALIDOS = ['CASA', 'APARTAMENTO', 'TERRENO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'FINCA', 'EDIFICIO', 'OTRO'];
const GESTIONES_VALIDAS = ['VENTA', 'RENTA', 'AMBAS'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CLIENTES = 500;
const MAX_PROPIEDADES = 200;

// ─── Column normalization ─────────────────────────────────────

function norm(s: string): string {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, '_');
}

// Map normalized column names to canonical field names
const CLIENTE_COLS: Record<string, string> = {
  nombre: 'nombre', name: 'nombre', nombre_completo: 'nombre',
  email: 'email', correo: 'email', correo_electronico: 'email',
  telefono: 'telefono', phone: 'telefono', tel: 'telefono', movil: 'telefono',
  dpi: 'dpi', cedula: 'dpi', id: 'dpi',
  origen: 'origen', fuente: 'origen', source: 'origen',
  notas: 'notas', notes: 'notas', comentarios: 'notas',
};

const PROPIEDAD_COLS: Record<string, string> = {
  titulo: 'titulo', title: 'titulo', nombre: 'titulo',
  tipo: 'tipo', type: 'tipo',
  gestion: 'gestion', gesti_n: 'gestion', operacion: 'gestion',
  precio_venta: 'precio_venta', precio: 'precio_venta', venta: 'precio_venta', sale_price: 'precio_venta',
  precio_renta: 'precio_renta', renta: 'precio_renta', rent: 'precio_renta', rent_price: 'precio_renta',
  moneda: 'moneda', currency: 'moneda',
  departamento: 'departamento', department: 'departamento',
  municipio: 'municipio', ciudad: 'municipio', city: 'municipio',
  zona: 'zona', zone: 'zona', colonia: 'zona',
  habitaciones: 'habitaciones', bedrooms: 'habitaciones', cuartos: 'habitaciones', rooms: 'habitaciones',
  banos: 'banos', ba_os: 'banos', bathrooms: 'banos',
  area_construccion_m2: 'area_construccion_m2', area: 'area_construccion_m2', construccion_m2: 'area_construccion_m2', m2: 'area_construccion_m2',
  descripcion: 'descripcion', description: 'descripcion',
  parqueos: 'parqueos', parking: 'parqueos',
  niveles: 'niveles', floors: 'niveles',
  ano_construccion: 'ano_construccion', ano: 'ano_construccion', year: 'ano_construccion',
  direccion: 'direccion', address: 'direccion',
};

// ─── Helpers ──────────────────────────────────────────────────

function parseFile(buffer: Buffer): Record<string, any>[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb.SheetNames.length) return [];
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: false, defval: '' });
}

function mapRow(raw: Record<string, any>, colMap: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const canonical = colMap[norm(key)];
    if (canonical) out[canonical] = String(val ?? '').trim();
  }
  return out;
}

function str(v: any): string { return String(v ?? '').trim(); }
function num(v: any): number | undefined {
  const n = parseFloat(String(v ?? '').replace(/,/g, '.'));
  return isNaN(n) ? undefined : n;
}
function int(v: any): number | undefined {
  const n = parseInt(String(v ?? ''));
  return isNaN(n) ? undefined : n;
}

// ─── Service ──────────────────────────────────────────────────

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  // ─── CLIENTES ───────────────────────────────────────────────

  async importClientes(tenantId: string, buffer: Buffer): Promise<ImportResult> {
    const rawRows = parseFile(buffer);
    if (!rawRows.length) throw new BadRequestException('El archivo está vacío');
    if (rawRows.length > MAX_CLIENTES) {
      throw new BadRequestException(`Máximo ${MAX_CLIENTES} filas por importación`);
    }

    // Prefetch existing emails for this tenant to detect duplicates fast
    const existingEmails = new Set(
      (await this.prisma.cliente.findMany({
        where: { tenant_id: tenantId, email: { not: null } },
        select: { email: true },
      })).map((c) => c.email!.toLowerCase()),
    );

    const errors: ImportError[] = [];
    const toCreate: any[] = [];
    const seenEmails = new Set<string>(); // within-batch deduplication

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // 1-indexed + header row
      const row = mapRow(rawRows[i], CLIENTE_COLS);

      // ── nombre (required) ──
      const nombre = str(row.nombre);
      if (!nombre) {
        errors.push({ row: rowNum, campo: 'nombre', mensaje: 'El nombre es requerido' });
        continue;
      }

      // ── email (optional, unique) ──
      const email = str(row.email).toLowerCase() || undefined;
      if (email) {
        if (!EMAIL_RE.test(email)) {
          errors.push({ row: rowNum, campo: 'email', mensaje: `Email inválido: ${email}` });
          continue;
        }
        if (existingEmails.has(email) || seenEmails.has(email)) {
          errors.push({ row: rowNum, campo: 'email', mensaje: `Email duplicado: ${email}` });
          continue;
        }
        seenEmails.add(email);
      }

      // ── origen ──
      const origenRaw = str(row.origen).toUpperCase();
      const origen = ORIGENES_VALIDOS.includes(origenRaw) ? origenRaw : 'OTRO';

      toCreate.push({
        id: randomUUID(),
        tenant_id: tenantId,
        nombre,
        email: email || null,
        telefono: str(row.telefono) || null,
        dpi: str(row.dpi) || null,
        origen,
        notas: str(row.notas) || null,
      });
    }

    let created = 0;
    if (toCreate.length) {
      const result = await this.prisma.cliente.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      created = result.count;
    }
    return {
      created,
      skipped: Math.max(0, rawRows.length - errors.length - created),
      errors,
    };
  }

  // ─── PROPIEDADES ────────────────────────────────────────────

  async importPropiedades(tenantId: string, buffer: Buffer, userId?: string): Promise<ImportResult> {
    const rawRows = parseFile(buffer);
    if (!rawRows.length) throw new BadRequestException('El archivo está vacío');
    if (rawRows.length > MAX_PROPIEDADES) {
      throw new BadRequestException(`Máximo ${MAX_PROPIEDADES} filas por importación`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant no encontrado');

    const currentCount = await this.prisma.propiedad.count({ where: { tenant_id: tenantId } });
    if (currentCount >= tenant.limite_propiedades) {
      throw new BadRequestException(`Límite de propiedades alcanzado (${tenant.limite_propiedades})`);
    }

    const errors: ImportError[] = [];
    let created = 0;
    let propOffset = currentCount;

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const row = mapRow(rawRows[i], PROPIEDAD_COLS);

      // ── titulo (required) ──
      const titulo = str(row.titulo);
      if (!titulo) {
        errors.push({ row: rowNum, campo: 'titulo', mensaje: 'El título es requerido' });
        continue;
      }

      // ── tipo (required) ──
      const tipoRaw = str(row.tipo).toUpperCase();
      if (!TIPOS_VALIDOS.includes(tipoRaw)) {
        errors.push({ row: rowNum, campo: 'tipo', mensaje: `Tipo inválido: "${row.tipo}". Válidos: ${TIPOS_VALIDOS.join(', ')}` });
        continue;
      }

      // ── gestion (required) ──
      const gestionRaw = str(row.gestion).toUpperCase();
      if (!GESTIONES_VALIDAS.includes(gestionRaw)) {
        errors.push({ row: rowNum, campo: 'gestion', mensaje: `Gestión inválida: "${row.gestion}". Válidas: ${GESTIONES_VALIDAS.join(', ')}` });
        continue;
      }

      // ── Limit check ──
      if (currentCount + created >= tenant.limite_propiedades) {
        errors.push({ row: rowNum, campo: 'limite', mensaje: 'Límite de propiedades del tenant alcanzado' });
        continue;
      }

      // ── Generate unique code ──
      propOffset++;
      const prefix = tipoRaw.substring(0, 4);
      const codigo = `${prefix}-${String(propOffset).padStart(4, '0')}`;

      try {
        await this.prisma.propiedad.create({
          data: {
            tenant_id: tenantId,
            codigo,
            titulo,
            tipo: tipoRaw as any,
            gestion: gestionRaw as any,
            estado: 'BORRADOR',
            precio_venta: num(row.precio_venta) ?? null,
            precio_renta: num(row.precio_renta) ?? null,
            moneda: str(row.moneda) || tenant.moneda || 'GTQ',
            departamento: str(row.departamento) || null,
            municipio: str(row.municipio) || null,
            zona: str(row.zona) || null,
            direccion: str(row.direccion) || null,
            descripcion: str(row.descripcion) || null,
            habitaciones: int(row.habitaciones) ?? null,
            banos: int(row.banos) ?? null,
            parqueos: int(row.parqueos) ?? null,
            niveles: int(row.niveles) ?? null,
            ano_construccion: int(row.ano_construccion) ?? null,
            area_construccion_m2: num(row.area_construccion_m2) ?? null,
            agente_id: userId ?? null,
          },
        });
        created++;
      } catch {
        propOffset--;
        errors.push({ row: rowNum, campo: 'codigo', mensaje: `Error al crear la propiedad (código ${codigo} duplicado, reintenta)` });
      }
    }

    return {
      created,
      skipped: Math.max(0, rawRows.length - errors.length - created),
      errors,
    };
  }

  // ─── Templates ──────────────────────────────────────────────

  clientesTemplateCsv(): string {
    const headers = 'nombre,email,telefono,dpi,origen,notas';
    const example = 'Juan García,juan@email.com,5555-1234,2345678901234,REFERIDO,Cliente potencial';
    return `${headers}\n${example}\n`;
  }

  propiedadesTemplateCsv(): string {
    const headers = 'titulo,tipo,gestion,precio_venta,precio_renta,moneda,departamento,municipio,zona,habitaciones,banos,area_construccion_m2,descripcion';
    const example = 'Casa en Zona 15,CASA,VENTA,850000,,GTQ,Guatemala,Guatemala,15,3,2,150,Casa familiar con jardín';
    return `${headers}\n${example}\n`;
  }
}
