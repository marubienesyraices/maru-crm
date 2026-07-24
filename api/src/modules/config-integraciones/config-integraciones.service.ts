import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { UpdateConfigIntegracionesDto } from './dto';
import { ConfigService } from '@nestjs/config';

/** Fields that must be encrypted before DB storage. */
const ENCRYPTED_FIELDS = [
  'resend_api_key',
  'whatsapp_token',
  'meta_page_token',
  'zoom_client_secret',
  'docusign_rsa_private_key',
  'ml_access_token',
  'encuentra24_api_key',
] as const;

@Injectable()
export class ConfigIntegracionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: EncryptionService,
    private readonly config: ConfigService,
  ) {}

  async findOrCreate(tenantId: string) {
    let row = await this.prisma.configIntegraciones.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!row) {
      row = await this.prisma.configIntegraciones.create({
        data: { tenant_id: tenantId },
      });
    }
    return this.maskForResponse(row);
  }

  async update(tenantId: string, dto: UpdateConfigIntegracionesDto) {
    const data: Record<string, unknown> = { ...dto };

    for (const field of ENCRYPTED_FIELDS) {
      if (field in data && data[field] != null) {
        data[field] = this.enc.encrypt(data[field] as string);
      }
    }

    const row = await this.prisma.configIntegraciones.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, ...data },
      update: data,
    });

    return this.maskForResponse(row);
  }

  /**
   * Returns decrypted credentials for internal service use.
   * Falls back to global env vars when the tenant has no config.
   */
  async getCredentials(tenantId: string) {
    const row = await this.prisma.configIntegraciones.findUnique({
      where: { tenant_id: tenantId },
    });

    const dec = (val: string | null | undefined, envKey: string) =>
      val ? this.enc.decrypt(val) : (this.config.get<string>(envKey) ?? null);

    const plain = (val: string | null | undefined, envKey: string) =>
      val ?? this.config.get<string>(envKey) ?? null;

    return {
      resend_api_key: dec(row?.resend_api_key, 'RESEND_API_KEY'),
      email_from: plain(row?.email_from, 'EMAIL_FROM'),
      whatsapp_token: dec(row?.whatsapp_token, 'WHATSAPP_API_TOKEN'),
      whatsapp_phone_number_id: plain(
        row?.whatsapp_phone_number_id,
        'WHATSAPP_PHONE_NUMBER_ID',
      ),
      meta_page_token: dec(row?.meta_page_token, 'META_PAGE_ACCESS_TOKEN'),
      meta_page_id: plain(row?.meta_page_id, 'META_PAGE_ID'),
      meta_ig_user_id: plain(row?.meta_ig_user_id, 'META_IG_USER_ID'),
      zoom_account_id: plain(row?.zoom_account_id, 'ZOOM_ACCOUNT_ID'),
      zoom_client_id: plain(row?.zoom_client_id, 'ZOOM_CLIENT_ID'),
      zoom_client_secret: dec(row?.zoom_client_secret, 'ZOOM_CLIENT_SECRET'),
      docusign_integration_key: plain(
        row?.docusign_integration_key,
        'DOCUSIGN_INTEGRATION_KEY',
      ),
      docusign_account_id: plain(
        row?.docusign_account_id,
        'DOCUSIGN_ACCOUNT_ID',
      ),
      docusign_user_id: plain(row?.docusign_user_id, 'DOCUSIGN_USER_ID'),
      docusign_rsa_private_key: dec(
        row?.docusign_rsa_private_key,
        'DOCUSIGN_RSA_PRIVATE_KEY',
      ),
      docusign_base_url: plain(row?.docusign_base_url, 'DOCUSIGN_BASE_URL'),
      encuentra24_api_key: dec(row?.encuentra24_api_key, 'ENCUENTRA24_API_KEY'),
      ml_access_token: dec(row?.ml_access_token, 'ML_ACCESS_TOKEN'),
    };
  }

  async getCartaConfig(tenantId: string) {
    const row = await this.prisma.configIntegraciones.findUnique({
      where: { tenant_id: tenantId },
      select: {
        carta_color_primario: true,
        carta_tagline: true,
        carta_logo_url: true,
        carta_clausulas_custom: true,
      },
    });
    return (
      row ?? {
        carta_color_primario: null,
        carta_tagline: null,
        carta_logo_url: null,
        carta_clausulas_custom: null,
      }
    );
  }

  async updateCartaConfig(tenantId: string, dto: UpdateConfigIntegracionesDto) {
    const data: Record<string, unknown> = {};
    if (dto.carta_color_primario !== undefined)
      data.carta_color_primario = dto.carta_color_primario || null;
    if (dto.carta_tagline !== undefined)
      data.carta_tagline = dto.carta_tagline || null;
    if (dto.carta_logo_url !== undefined)
      data.carta_logo_url = dto.carta_logo_url || null;
    if (dto.carta_clausulas_custom !== undefined)
      data.carta_clausulas_custom = dto.carta_clausulas_custom || null;

    await this.prisma.configIntegraciones.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, ...data },
      update: data,
    });
    return this.getCartaConfig(tenantId);
  }

  /** Returns a safe view: masked values so the client knows what is configured. */
  private maskForResponse(row: Record<string, unknown>) {
    const masked: Record<string, unknown> = { ...row };
    for (const field of ENCRYPTED_FIELDS) {
      if (masked[field]) masked[field] = '••••••••';
    }
    return masked;
  }
}
