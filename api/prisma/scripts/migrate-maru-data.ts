/**
 * One-shot data migration: imports clientemaru.csv and propiedadesMaru.csv
 * into the demo tenant (or a tenant specified via TENANT_ID env var).
 *
 * Usage (from repo root):
 *   TENANT_ID=<uuid> npx ts-node -r tsconfig-paths/register api/prisma/scripts/migrate-maru-data.ts
 *
 * If TENANT_ID is not set, defaults to the demo tenant seed ID.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://gestprop_admin:gestprop_secret_2026@localhost:5432/gestprop_crm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000002';
const TENANT_ID = process.env.TENANT_ID || DEMO_TENANT_ID;

const ROOT = path.resolve(__dirname, '../../..');
const CLIENTES_CSV = path.join(ROOT, 'clientemaru.csv');
const PROPIEDADES_CSV = path.join(ROOT, 'propiedadesMaru.csv');

// ─── helpers ─────────────────────────────────────────────────────────────────

function readCsv(filePath: string): Record<string, string>[] {
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf.toString('utf8'), { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: '' });
}

function s(v: any): string { return String(v ?? '').trim(); }
function n(v: any): number | null {
  const x = parseFloat(String(v ?? '').replace(/,/g, '.'));
  return isNaN(x) || x <= 0 ? null : x;
}
function i(v: any): number | null {
  const x = parseInt(String(v ?? ''));
  return isNaN(x) || x < 0 ? null : x;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // RLS bypass — migration runs as privileged seed context
  await prisma.$executeRawUnsafe(`SET app.bypass_rls = 'true'`);

  console.log(`\n📦 Tenant: ${TENANT_ID}`);

  // ── 1. Import clientes ──────────────────────────────────────────────────────

  if (!fs.existsSync(CLIENTES_CSV)) {
    console.warn(`⚠️  ${CLIENTES_CSV} no encontrado, saltando clientes.`);
  } else {
    const rows = readCsv(CLIENTES_CSV);
    console.log(`\n👥 Importando ${rows.length} clientes…`);

    const existingEmails = new Set(
      (await prisma.cliente.findMany({
        where: { tenant_id: TENANT_ID, email: { not: null } },
        select: { email: true },
      })).map((c) => c.email!.toLowerCase()),
    );

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const nombre = s(row.nombre);
      if (!nombre) { skipped++; continue; }

      const email = s(row.email).toLowerCase() || null;
      if (email && existingEmails.has(email)) {
        console.log(`  ⏭  Skipped (email ya existe): ${email}`);
        skipped++;
        continue;
      }

      const origenes: Record<string, string> = {
        PORTAL_WEB: 'PORTAL_WEB', REFERIDO: 'REFERIDO', LLAMADA: 'LLAMADA',
        WHATSAPP: 'WHATSAPP', REDES_SOCIALES: 'REDES_SOCIALES', FERIA: 'FERIA', OTRO: 'OTRO',
      };
      const origen = origenes[s(row.origen).toUpperCase()] ?? 'OTRO';

      const dpiRaw = s(row.dpi).replace(/[\s\-.]/g, '');
      const dpi = /^\d{13}$/.test(dpiRaw) ? dpiRaw : null;

      await prisma.cliente.create({
        data: {
          id: randomUUID(),
          tenant_id: TENANT_ID,
          nombre,
          email,
          telefono: s(row.telefono) || null,
          dpi,
          origen: origen as any,
          notas: s(row.notas) || null,
        },
      });

      if (email) existingEmails.add(email);
      created++;
      console.log(`  ✅ ${nombre}`);
    }

    console.log(`  → Creados: ${created} | Saltados: ${skipped}`);
  }

  // ── 2. Import propiedades ───────────────────────────────────────────────────

  if (!fs.existsSync(PROPIEDADES_CSV)) {
    console.warn(`⚠️  ${PROPIEDADES_CSV} no encontrado, saltando propiedades.`);
  } else {
    const rows = readCsv(PROPIEDADES_CSV);
    console.log(`\n🏠 Importando ${rows.length} propiedades…`);

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: TENANT_ID } });
    const currentCount = await prisma.propiedad.count({ where: { tenant_id: TENANT_ID } });
    let propOffset = currentCount;
    let created = 0;
    let skipped = 0;

    const TIPOS_MAP: Record<string, string> = {
      CASA: 'CASA', APARTAMENTO: 'APARTAMENTO', TERRENO: 'TERRENO',
      LOCAL_COMERCIAL: 'LOCAL_COMERCIAL', OFICINA: 'OFICINA', BODEGA: 'BODEGA',
      FINCA: 'FINCA', EDIFICIO: 'EDIFICIO', OTRO: 'OTRO',
    };
    const GESTIONES = new Set(['VENTA', 'RENTA', 'AMBAS']);

    for (const row of rows) {
      const titulo = s(row.titulo);
      if (!titulo) { skipped++; continue; }

      const tipo = TIPOS_MAP[s(row.tipo).toUpperCase().replace(/\s+/g, '_')];
      if (!tipo) { console.log(`  ⚠️  Tipo inválido "${row.tipo}", saltando: ${titulo}`); skipped++; continue; }

      const gestion = s(row.gestion).toUpperCase();
      if (!GESTIONES.has(gestion)) { console.log(`  ⚠️  Gestión inválida "${row.gestion}", saltando: ${titulo}`); skipped++; continue; }

      propOffset++;
      const codigo = `${tipo.substring(0, 4)}-${String(propOffset).padStart(4, '0')}`;

      await prisma.propiedad.create({
        data: {
          tenant_id: TENANT_ID,
          codigo,
          titulo,
          tipo: tipo as any,
          gestion: gestion as any,
          estado: 'BORRADOR',
          precio_venta: n(row.precio_venta),
          precio_renta: n(row.precio_renta),
          moneda: s(row.moneda).toUpperCase() || tenant.moneda || 'GTQ',
          departamento: s(row.departamento) || null,
          municipio: s(row.municipio) || null,
          zona: s(row.zona) || null,
          direccion: s(row.direccion) || null,
          descripcion: s(row.descripcion) || null,
          habitaciones: i(row.habitaciones),
          banos: i(row.banos),
          parqueos: i(row.parqueos),
          niveles: i(row.niveles),
          ano_construccion: i(row.ano_construccion),
          area_construccion_m2: n(row.area_construccion_m2),
        },
      });

      created++;
      console.log(`  ✅ [${codigo}] ${titulo}`);
    }

    console.log(`  → Creados: ${created} | Saltados: ${skipped}`);
  }

  console.log('\n✅ Migración completada.\n');
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
