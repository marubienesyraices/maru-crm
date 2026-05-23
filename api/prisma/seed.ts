import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://gestpro_admin:gestpro_secret_2026@localhost:5432/gestpro_crm?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ─── 0. Catálogo de planes ───────────────────────────────
  const catalogoPlanes = [
    { plan: 'FREE'       as const, limite_usuarios: 1,  limite_propiedades: 5,   tiene_correo: false, tiene_campanas: false, tiene_portal: false, tiene_sitio_propio: false, tiene_integraciones: false, tiene_meta: false },
    { plan: 'BASIC'      as const, limite_usuarios: 3,  limite_propiedades: 25,  tiene_correo: true,  tiene_campanas: true,  tiene_portal: false, tiene_sitio_propio: false, tiene_integraciones: false, tiene_meta: false },
    { plan: 'PRO'        as const, limite_usuarios: 5,  limite_propiedades: 100, tiene_correo: true,  tiene_campanas: true,  tiene_portal: true,  tiene_sitio_propio: true,  tiene_integraciones: false, tiene_meta: true  },
    { plan: 'ENTERPRISE' as const, limite_usuarios: 25, limite_propiedades: 500, tiene_correo: true,  tiene_campanas: true,  tiene_portal: true,  tiene_sitio_propio: true,  tiene_integraciones: true,  tiene_meta: true  },
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
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'GestPro Platform',
      plan: 'ENTERPRISE',
      estado: 'ACTIVA',
    },
  });

  await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
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
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      nombre: 'GestPro Demo',
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

  // ─── 3. Create demo users with hierarchy ─────────────────
  const adminPassword = await bcrypt.hash('Admin@2026', 12);
  const agentPassword = await bcrypt.hash('Agent@2026', 12);

  await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
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
    where: { id: '00000000-0000-0000-0000-000000000030' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000030',
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
    where: { id: '00000000-0000-0000-0000-000000000040' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000040',
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
    where: { id: '00000000-0000-0000-0000-000000000050' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000050',
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

  console.log('  ✅ Tenant: GestPro Demo');
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
