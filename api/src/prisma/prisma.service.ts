import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor(config: ConfigService) {
    const connectionString =
      config.get('DATABASE_URL') ||
      'postgresql://maru_admin:maru_secret_2026@localhost:5432/maru_crm?schema=public';

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }

  /**
   * Sets the tenant context for RLS policies.
   */
  async setTenantContext(tenantId: string) {
    await this.$executeRawUnsafe(
      `SET app.tenant_id = '${tenantId}'`,
    );
  }
}
