import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { UpdateConfigSistemaDto } from './dto';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class ConfigSistemaService {
  private cache: { resend_api_key: string | null; email_from: string } | null = null;
  private cacheExpiresAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  async findOrCreate() {
    let row = await this.prisma.configSistema.findUnique({ where: { id: 'singleton' } });
    if (!row) {
      row = await this.prisma.configSistema.create({ data: { id: 'singleton' } });
    }
    return this.maskForResponse(row);
  }

  async update(dto: UpdateConfigSistemaDto, updatedBy: string) {
    const data: Record<string, unknown> = {};
    if (dto.resend_api_key !== undefined) {
      data.resend_api_key = dto.resend_api_key ? this.enc.encrypt(dto.resend_api_key) : null;
    }
    if (dto.email_from !== undefined) data.email_from = dto.email_from || null;
    data.updated_by = updatedBy;

    const row = await this.prisma.configSistema.upsert({
      where:  { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });

    this.invalidateCache();
    return this.maskForResponse(row);
  }

  /** Returns decrypted credentials for EmailService — falls back to env vars. */
  async getSystemCredentials(): Promise<{ resend_api_key: string | null; email_from: string }> {
    if (this.cache && Date.now() < this.cacheExpiresAt) {
      return this.cache;
    }

    const row = await this.prisma.configSistema.findUnique({ where: { id: 'singleton' } });

    const resend_api_key = row?.resend_api_key
      ? this.enc.decrypt(row.resend_api_key)
      : (this.config.get<string>('RESEND_API_KEY') ?? null);

    const email_from =
      row?.email_from ?? (this.config.get<string>('EMAIL_FROM') ?? 'GestProp CRM <onboarding@resend.dev>');

    this.cache = { resend_api_key, email_from };
    this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return this.cache;
  }

  invalidateCache() {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  private maskForResponse(row: Record<string, unknown>) {
    const masked = { ...row };
    if (masked.resend_api_key) masked.resend_api_key = '••••••••';
    return masked;
  }
}
