import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DEFAULT_BROCHURE_SECTIONS } from '../src/modules/config-documentos/brochure-sections.default';
import { Prisma } from '@prisma/client';

// Load .env from project root (one level up from api/)
config({ path: resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not found — check that ../.env exists');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Bypass RLS — needed because FORCE ROW LEVEL SECURITY applies even to the owner
  await prisma.$executeRawUnsafe(`SET app.bypass_rls = 'true'`);
  console.log('🌱 Seeding database...');

  // ─── 0. Catálogo de planes ───────────────────────────────
  const catalogoPlanes = [
    { plan: 'FREE'       as const, limite_usuarios: 1,  limite_propiedades: 5,   tiene_correo: false, tiene_campanas: false, tiene_portal: false, tiene_sitio_propio: false, tiene_integraciones: false, tiene_meta: false, tiene_mapas: false, tiene_ranking: false, tiene_organigrama: false },
    { plan: 'BASIC'      as const, limite_usuarios: 3,  limite_propiedades: 25,  tiene_correo: true,  tiene_campanas: true,  tiene_portal: false, tiene_sitio_propio: false, tiene_integraciones: false, tiene_meta: false, tiene_mapas: false, tiene_ranking: false, tiene_organigrama: false },
    { plan: 'PRO'        as const, limite_usuarios: 5,  limite_propiedades: 100, tiene_correo: true,  tiene_campanas: true,  tiene_portal: true,  tiene_sitio_propio: true,  tiene_integraciones: false, tiene_meta: true,  tiene_mapas: true,  tiene_ranking: true,  tiene_organigrama: true  },
    { plan: 'ENTERPRISE' as const, limite_usuarios: 25, limite_propiedades: 500, tiene_correo: true,  tiene_campanas: true,  tiene_portal: true,  tiene_sitio_propio: true,  tiene_integraciones: true,  tiene_meta: true,  tiene_mapas: true,  tiene_ranking: true,  tiene_organigrama: true  },
  ];

  for (const config of catalogoPlanes) {
    await prisma.catalogoPlan.upsert({
      where: { plan: config.plan },
      update: config,
      create: config,
    });
  }
  console.log('  ✅ Catálogo de planes inicializado (FREE, BASIC, PRO, ENTERPRISE)');

  // ─── 1. Create Super Admin (platform-level) ──────────────
  const superAdminPassword = await bcrypt.hash('SuperAdmin@2026', 12);
  const superAdminTotpSecret = randomBytes(20).toString('hex');

  const platformTenant = await prisma.tenant.upsert({
    where: { id: 'b0b17723-02ed-439d-9d3a-89f1ca875063' },
    update: {},
    create: {
      id: 'b0b17723-02ed-439d-9d3a-89f1ca875063',
      nombre: 'GestProp Platform',
      plan: 'ENTERPRISE',
      estado: 'ACTIVA',
    },
  });

  await prisma.user.upsert({
    where: { id: '479e9d73-4fb0-4ec7-96a0-d631bba37e3f' },
    update: {},
    create: {
      id: '479e9d73-4fb0-4ec7-96a0-d631bba37e3f',
      tenant_id: platformTenant.id,
      email: 'superadmin@gestprop.net',
      password_hash: superAdminPassword,
      nombre: 'Super Administrador',
      rol: 'SUPER_ADMIN',
      estado: 'ACTIVO',
      totp_secret: superAdminTotpSecret,
      totp_habilitado: false,
      password_changed_at: new Date(),
    },
  });

  console.log('  ✅ Super Admin: superadmin@gestprop.net / SuperAdmin@2026');

  // ─── 2. Create demo tenant ───────────────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { id: '7dea080e-e0b2-4536-8422-e94897821fa3' },
    update: {},
    create: {
      id: '7dea080e-e0b2-4536-8422-e94897821fa3',
      nombre: 'GestProp Demo',
      plan: 'PRO',
      moneda: 'GTQ',
      zona_horaria: 'America/Guatemala',
      limite_usuarios: 25,
      limite_propiedades: 500,
      estado: 'ACTIVA',
    },
  });

  await prisma.configSeguridad.upsert({
    where: { tenant_id: demoTenant.id },
    update: {},
    create: {
      tenant_id: demoTenant.id,
      geo_paises: ['GT', 'SV', 'HN'],
      dias_inactividad_lead: 21,
      senior_puede_ver_upline: false,
      buffer_entre_citas_min: 30,
    },
  });

  await prisma.configBrochure.upsert({
    where: { tenant_id: demoTenant.id },
    update: {},
    create: {
      tenant_id: demoTenant.id,
      secciones: DEFAULT_BROCHURE_SECTIONS as unknown as Prisma.InputJsonValue,
    },
  });

  // ─── 3. Create demo users with hierarchy ─────────────────
  const adminPassword = await bcrypt.hash('Admin@2026', 12);
  const agentPassword = await bcrypt.hash('Agent@2026', 12);

  await prisma.user.upsert({
    where: { id: '088dc652-b826-4927-ac8c-d5707ee52ad4' },
    update: {},
    create: {
      id: '088dc652-b826-4927-ac8c-d5707ee52ad4',
      tenant_id: demoTenant.id,
      email: 'admin@gestprop.net',
      password_hash: adminPassword,
      nombre: 'María García (Admin)',
      rol: 'ADMIN',
      estado: 'ACTIVO',
      totp_habilitado: false,
      password_changed_at: new Date(),
    },
  });

  const senior1 = await prisma.user.upsert({
    where: { id: '5b488971-e311-4550-8ab9-ebcaf6054445' },
    update: {},
    create: {
      id: '5b488971-e311-4550-8ab9-ebcaf6054445',
      tenant_id: demoTenant.id,
      email: 'carlos.senior@gestprop.net',
      password_hash: agentPassword,
      nombre: 'Carlos Mendoza (Senior)',
      rol: 'SENIOR',
      estado: 'ACTIVO',
      totp_habilitado: false,
      password_changed_at: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { id: 'caf2228d-dd2a-4e35-a3b2-1fdb01794e72' },
    update: {},
    create: {
      id: 'caf2228d-dd2a-4e35-a3b2-1fdb01794e72',
      tenant_id: demoTenant.id,
      email: 'ana.junior@gestprop.net',
      password_hash: agentPassword,
      nombre: 'Ana López (Junior)',
      rol: 'JUNIOR',
      estado: 'ACTIVO',
      id_supervisor: senior1.id,
      totp_habilitado: false,
      password_changed_at: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { id: '8ffbf068-cd84-4763-9b9b-71fba64f912b' },
    update: {},
    create: {
      id: '8ffbf068-cd84-4763-9b9b-71fba64f912b',
      tenant_id: demoTenant.id,
      email: 'pedro.junior@gestprop.net',
      password_hash: agentPassword,
      nombre: 'Pedro Ramírez (Junior)',
      rol: 'JUNIOR',
      estado: 'ACTIVO',
      id_supervisor: senior1.id,
      totp_habilitado: false,
      password_changed_at: new Date(),
    },
  });

  console.log('  ✅ Tenant: GestProp Demo');
  console.log('  ✅ Admin: admin@gestprop.net / Admin@2026');
  console.log('  ✅ Senior: carlos.senior@gestprop.net / Agent@2026');
  console.log('  ✅ Junior: ana.junior@gestprop.net / Agent@2026');
  console.log('  ✅ Junior: pedro.junior@gestprop.net / Agent@2026');
  console.log('  📊 Jerarquía: Carlos (Senior) → Ana, Pedro (Juniors)');
  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
