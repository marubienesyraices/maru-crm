import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

const IMPORT_IP = '0.0.0.0'; // system action, no real IP

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
  warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────

const ORIGENES_VALIDOS = ['PORTAL_WEB', 'REFERIDO', 'LLAMADA', 'WHATSAPP', 'REDES_SOCIALES', 'FERIA', 'OTRO'];
const TIPOS_VALIDOS = ['CASA', 'APARTAMENTO', 'TERRENO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'FINCA', 'EDIFICIO', 'OTRO'];
const GESTIONES_VALIDAS = ['VENTA', 'RENTA', 'AMBAS'];
const MONEDAS_VALIDAS = ['GTQ', 'USD', 'EUR', 'MXN', 'HNL', 'NIO', 'CRC', 'SVC'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_INVALID_RE = /[a-df-wyzA-DF-WYZ]/; // letters that aren't part of any phone format
const DPI_RE = /^\d{13}$/;
const YEAR_MIN = 1800;
const MAX_CLIENTES = 500;
const MAX_PROPIEDADES = 500;

// ─── CSV encoding detection ──────────────────────────────────

function decodeCSV(buf: Buffer): string {
  // UTF-8 BOM (EF BB BF) — strip BOM and read as UTF-8
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  // Validate strict UTF-8; fall back to latin1 which covers Windows-1252
  // for all Spanish characters (á é í ó ú ñ ü ¡ ¿ and uppercase variants)
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return buf.toString('utf8');
  } catch {
    return buf.toString('latin1');
  }
}

// ─── Column normalization ─────────────────────────────────────

function norm(s: string): string {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_');
}

// ─── Value sanitization ──────────────────────────────────────

/** NFC normalize, strip ASCII control chars, collapse internal whitespace. */
function sanitize(v: any): string {
  return String(v ?? '')
    .normalize('NFC')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[^\S ]+/g, ' ')   // replace tabs / non-breaking spaces / etc. with regular space
    .replace(/ {2,}/g, ' ')     // collapse multiple spaces
    .trim();
}

// Map normalized column names to canonical field names
const CLIENTE_COLS: Record<string, string> = {
  // nombre
  nombre: 'nombre', name: 'nombre', nombre_completo: 'nombre',
  nombre_apellido: 'nombre', nombre_y_apellidos: 'nombre', nombre_apellidos: 'nombre',
  cliente: 'nombre', contact: 'nombre',
  // email
  email: 'email', correo: 'email', correo_electronico: 'email', e_mail: 'email',
  // telefono
  telefono: 'telefono', phone: 'telefono', tel: 'telefono', movil: 'telefono',
  celular: 'telefono', cel: 'telefono', whatsapp: 'telefono', numero: 'telefono',
  // dpi
  dpi: 'dpi', cedula: 'dpi', id: 'dpi', documento: 'dpi', num_dpi: 'dpi',
  // origen
  origen: 'origen', fuente: 'origen', source: 'origen', canal: 'origen',
  // notas
  notas: 'notas', notes: 'notas', comentarios: 'notas', observaciones: 'notas',
};

const PROPIEDAD_COLS: Record<string, string> = {
  // titulo
  titulo: 'titulo', title: 'titulo', nombre: 'titulo', propiedad: 'titulo',
  nombre_propiedad: 'titulo', titulo_propiedad: 'titulo',
  // tipo
  tipo: 'tipo', type: 'tipo', tipo_propiedad: 'tipo', tipo_inmueble: 'tipo',
  // gestion
  gestion: 'gestion', operacion: 'gestion', tipo_operacion: 'gestion',
  tipo_gestion: 'gestion', modalidad: 'gestion',
  // precio venta
  precio_venta: 'precio_venta', precio: 'precio_venta', venta: 'precio_venta',
  sale_price: 'precio_venta', precio_de_venta: 'precio_venta',
  valor_venta: 'precio_venta', precio_lista: 'precio_venta',
  // precio renta
  precio_renta: 'precio_renta', renta: 'precio_renta', rent: 'precio_renta',
  rent_price: 'precio_renta', precio_de_renta: 'precio_renta',
  alquiler: 'precio_renta', precio_alquiler: 'precio_renta', mensualidad: 'precio_renta',
  // moneda
  moneda: 'moneda', currency: 'moneda', divisa: 'moneda',
  // departamento
  departamento: 'departamento', department: 'departamento', depto: 'departamento',
  estado: 'departamento', provincia: 'departamento',
  // municipio
  municipio: 'municipio', ciudad: 'municipio', city: 'municipio',
  ciudad_municipio: 'municipio', localidad: 'municipio',
  // zona
  zona: 'zona', zone: 'zona', colonia: 'zona', sector: 'zona',
  barrio: 'zona', urbanizacion: 'zona',
  // habitaciones
  habitaciones: 'habitaciones', bedrooms: 'habitaciones', cuartos: 'habitaciones',
  rooms: 'habitaciones', num_habitaciones: 'habitaciones',
  numero_habitaciones: 'habitaciones', dormitorios: 'habitaciones',
  // banos
  banos: 'banos', bathrooms: 'banos', num_banos: 'banos',
  numero_banos: 'banos', sanitarios: 'banos',
  // area
  area_construccion_m2: 'area_construccion_m2', area: 'area_construccion_m2',
  construccion_m2: 'area_construccion_m2', m2: 'area_construccion_m2',
  area_m2: 'area_construccion_m2', area_total: 'area_construccion_m2',
  m2_construccion: 'area_construccion_m2', metros_cuadrados: 'area_construccion_m2',
  // descripcion
  descripcion: 'descripcion', description: 'descripcion', detalle: 'descripcion',
  detalles: 'descripcion', descripcion_propiedad: 'descripcion',
  // parqueos
  parqueos: 'parqueos', parking: 'parqueos', estacionamiento: 'parqueos',
  garaje: 'parqueos', garage: 'parqueos',
  // niveles
  niveles: 'niveles', floors: 'niveles', pisos: 'niveles', plantas: 'niveles',
  // año construccion
  ano_construccion: 'ano_construccion', ano: 'ano_construccion', year: 'ano_construccion',
  ano_de_construccion: 'ano_construccion', anio_construccion: 'ano_construccion',
  year_built: 'ano_construccion', fecha_construccion: 'ano_construccion',
  // direccion
  direccion: 'direccion', address: 'direccion', ubicacion: 'direccion',
  dir: 'direccion', calle: 'direccion',
};

// ─── Helpers ──────────────────────────────────────────────────

/** Stringifies a cell value the way SheetJS's `raw:false` option used to. */
function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return String(v.text ?? ''); // hyperlink
    if ('result' in v) return v.result === undefined ? '' : String(v.result); // formula
  }
  return String(v);
}

/** Converts a worksheet (header row + data rows) into an array of plain objects. */
function worksheetToRows(ws: ExcelJS.Worksheet): Record<string, any>[] {
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value);
  });

  const rows: Record<string, any>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const obj: Record<string, any> = {};
    headers.forEach((h, colNumber) => {
      if (!h) return;
      obj[h] = cellToString(row.getCell(colNumber).value);
    });
    rows.push(obj);
  });
  return rows;
}

async function parseFile(buffer: Buffer, filename = ''): Promise<Record<string, any>[]> {
  const wb = new ExcelJS.Workbook();
  let ws: ExcelJS.Worksheet | undefined;
  if (/\.csv$/i.test(filename)) {
    // Decode CSV respecting its actual encoding (UTF-8, UTF-8 BOM, or Windows-1252)
    ws = await wb.csv.read(Readable.from([decodeCSV(buffer)]));
  } else {
    await wb.xlsx.load(buffer as any);
    ws = wb.worksheets[0];
  }
  if (!ws) return [];
  return worksheetToRows(ws);
}

function mapRow(raw: Record<string, any>, colMap: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const canonical = colMap[norm(key)];
    if (canonical) out[canonical] = sanitize(val);
  }
  return out;
}

/** Returns column headers from the file that don't match any known alias. */
function unknownColumns(rawRows: Record<string, any>[], colMap: Record<string, string>): string[] {
  if (!rawRows.length) return [];
  return Object.keys(rawRows[0])
    .filter((k) => k.trim() && !colMap[norm(k)])
    .map((k) => k.trim());
}

function str(v: any): string { return sanitize(v); }
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

  async importClientes(tenantId: string, buffer: Buffer, filename = ''): Promise<ImportResult> {
    const rawRows = await parseFile(buffer, filename);
    if (!rawRows.length) throw new BadRequestException('El archivo está vacío');
    if (rawRows.length > MAX_CLIENTES) {
      throw new BadRequestException(`Máximo ${MAX_CLIENTES} filas por importación`);
    }

    const warnings: string[] = [];

    // Warn about unrecognized columns
    const ignored = unknownColumns(rawRows, CLIENTE_COLS);
    if (ignored.length) {
      warnings.push(`Columnas no reconocidas (se ignoraron): ${ignored.join(', ')}`);
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
    const seenEmails = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // 1-indexed + header row
      const row = mapRow(rawRows[i], CLIENTE_COLS);

      // ── nombre (required, max 200) ──
      const nombre = str(row.nombre);
      if (!nombre) {
        errors.push({ row: rowNum, campo: 'nombre', mensaje: 'El nombre es requerido' });
        continue;
      }
      if (nombre.length > 200) {
        errors.push({ row: rowNum, campo: 'nombre', mensaje: `Nombre demasiado largo (${nombre.length} chars, máx 200)` });
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

      // ── telefono (optional, warn on bad format) ──
      const telefono = str(row.telefono) || null;
      if (telefono && PHONE_INVALID_RE.test(telefono)) {
        errors.push({ row: rowNum, campo: 'telefono', mensaje: `Teléfono contiene caracteres inválidos: "${telefono}"` });
        continue;
      }

      // ── dpi (optional, warn if not 13 digits) ──
      const dpi = str(row.dpi) || null;
      if (dpi) {
        const dpiDigits = dpi.replace(/[\s\-\.]/g, '');
        if (!DPI_RE.test(dpiDigits)) {
          errors.push({ row: rowNum, campo: 'dpi', mensaje: `DPI inválido: "${dpi}" (debe tener 13 dígitos)` });
          continue;
        }
      }

      // ── origen ──
      const origenRaw = str(row.origen).toUpperCase();
      const origen = ORIGENES_VALIDOS.includes(origenRaw) ? origenRaw : 'OTRO';

      toCreate.push({
        id: randomUUID(),
        tenant_id: tenantId,
        nombre,
        email: email || null,
        telefono,
        dpi: dpi ? dpi.replace(/[\s\-\.]/g, '') : null,
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
      warnings,
    };
  }

  // ─── PROPIEDADES ────────────────────────────────────────────

  async importPropiedades(tenantId: string, buffer: Buffer, userId?: string, filename = ''): Promise<ImportResult> {
    const rawRows = await parseFile(buffer, filename);
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

    const warnings: string[] = [];

    // Warn about unrecognized columns
    const ignored = unknownColumns(rawRows, PROPIEDAD_COLS);
    if (ignored.length) {
      warnings.push(`Columnas no reconocidas (se ignoraron): ${ignored.join(', ')}`);
    }

    const errors: ImportError[] = [];
    let created = 0;
    let propOffset = currentCount;
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const row = mapRow(rawRows[i], PROPIEDAD_COLS);

      // ── titulo (required, max 300) ──
      const titulo = str(row.titulo);
      if (!titulo) {
        errors.push({ row: rowNum, campo: 'titulo', mensaje: 'El título es requerido' });
        continue;
      }
      if (titulo.length > 300) {
        errors.push({ row: rowNum, campo: 'titulo', mensaje: `Título demasiado largo (${titulo.length} chars, máx 300)` });
        continue;
      }

      // ── tipo (required) ──
      const tipoRaw = str(row.tipo).toUpperCase().replace(/\s+/g, '_');
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

      // ── precios (optional, must be positive) ──
      const precioVenta = num(row.precio_venta) ?? null;
      if (precioVenta !== null && precioVenta <= 0) {
        errors.push({ row: rowNum, campo: 'precio_venta', mensaje: `Precio de venta debe ser mayor a 0: ${precioVenta}` });
        continue;
      }
      const precioRenta = num(row.precio_renta) ?? null;
      if (precioRenta !== null && precioRenta <= 0) {
        errors.push({ row: rowNum, campo: 'precio_renta', mensaje: `Precio de renta debe ser mayor a 0: ${precioRenta}` });
        continue;
      }

      // ── moneda (optional, validate if present) ──
      const monedaRaw = str(row.moneda).toUpperCase() || tenant.moneda || 'GTQ';
      if (!MONEDAS_VALIDAS.includes(monedaRaw)) {
        errors.push({ row: rowNum, campo: 'moneda', mensaje: `Moneda no reconocida: "${row.moneda}". Válidas: ${MONEDAS_VALIDAS.join(', ')}` });
        continue;
      }

      // ── area (optional, must be positive) ──
      const areaConstruccion = num(row.area_construccion_m2) ?? null;
      if (areaConstruccion !== null && areaConstruccion <= 0) {
        errors.push({ row: rowNum, campo: 'area_construccion_m2', mensaje: `Área debe ser mayor a 0: ${areaConstruccion}` });
        continue;
      }

      // ── año construccion (optional, range check) ──
      const anoConstruccion = int(row.ano_construccion) ?? null;
      if (anoConstruccion !== null && (anoConstruccion < YEAR_MIN || anoConstruccion > currentYear)) {
        errors.push({ row: rowNum, campo: 'ano_construccion', mensaje: `Año de construcción fuera de rango: ${anoConstruccion} (válido: ${YEAR_MIN}–${currentYear})` });
        continue;
      }

      // ── habitaciones/banos/parqueos/niveles (optional, non-negative) ──
      const habitaciones = int(row.habitaciones) ?? null;
      if (habitaciones !== null && habitaciones < 0) {
        errors.push({ row: rowNum, campo: 'habitaciones', mensaje: `Habitaciones no puede ser negativo: ${habitaciones}` });
        continue;
      }
      const banos = int(row.banos) ?? null;
      if (banos !== null && banos < 0) {
        errors.push({ row: rowNum, campo: 'banos', mensaje: `Baños no puede ser negativo: ${banos}` });
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
            precio_venta: precioVenta,
            precio_renta: precioRenta,
            moneda: monedaRaw,
            departamento: str(row.departamento) || null,
            municipio: str(row.municipio) || null,
            zona: str(row.zona) || null,
            direccion: str(row.direccion) || null,
            descripcion: str(row.descripcion) || null,
            habitaciones,
            banos,
            parqueos: int(row.parqueos) ?? null,
            niveles: int(row.niveles) ?? null,
            ano_construccion: anoConstruccion,
            area_construccion_m2: areaConstruccion,
            agente_id: userId ?? null,
          },
        });
        created++;
      } catch {
        propOffset--;
        errors.push({ row: rowNum, campo: 'codigo', mensaje: `Error al crear la propiedad (código ${codigo} duplicado, reintenta)` });
      }
    }

    // P-16: Log import action in audit_logs with origin metadata
    if (created > 0 && userId) {
      this.prisma.auditLog.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          nombre_usuario: 'Importación masiva',
          accion: 'CREATE' as any,
          modulo: 'Import',
          entidad: 'Propiedad',
          entidad_id: null,
          ip_address: IMPORT_IP,
          payload_cambio: { origen: 'Importación masiva', archivo: filename ?? 'CSV/Excel', cantidad: created },
        },
      }).catch(() => {});
    }

    return {
      created,
      skipped: Math.max(0, rawRows.length - errors.length - created),
      errors,
      warnings,
    };
  }

  // ─── Templates ──────────────────────────────────────────────

  clientesTemplateCsv(): string {
    const headers = 'nombre,email,telefono,dpi,origen,notas';
    const example = 'María García,maria@email.com,5555-1234,2345678901234,REFERIDO,Cliente interesada en zona 15';
    return `${headers}\n${example}\n`;
  }

  propiedadesTemplateCsv(): string {
    const headers = 'titulo,tipo,gestion,precio_venta,precio_renta,moneda,departamento,municipio,zona,habitaciones,banos,area_construccion_m2,descripcion,direccion,parqueos,niveles,ano_construccion';
    const example = 'Casa en Zona 15,CASA,VENTA,850000,,GTQ,Guatemala,Guatemala,15,3,2,150,Casa familiar con jardín amplio,6a Avenida 10-50 Zona 15,2,2,2005';
    return `${headers}\n${example}\n`;
  }
}
