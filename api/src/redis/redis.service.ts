import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST') ?? 'localhost',
      port: +(config.get<string>('REDIS_PORT') ?? '6379'),
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err) => this.logger.warn(`Redis: ${err.message}`));
  }

  async get(key: string): Promise<string | null> {
    try { return await this.client.get(key); }
    catch { return null; }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try { await this.client.setex(key, ttlSeconds, value); }
    catch { /* cache miss on next call */ }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(...keys);
    } catch { /* noop */ }
  }

  onModuleDestroy() {
    this.client.quit().catch(() => {});
  }
}
