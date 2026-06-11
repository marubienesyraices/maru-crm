import * as dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://gestprop_admin:gestprop_secret_2026@localhost:5432/gestprop_crm?schema=public',
  },
});
