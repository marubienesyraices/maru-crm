import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateConfigIntegracionesDto {
  // ── Email ──────────────────────────────────────
  @IsOptional() @IsString() resend_api_key?: string;
  @IsOptional() @IsString() email_from?: string;

  // ── WhatsApp ───────────────────────────────────
  @IsOptional() @IsString() whatsapp_token?: string;
  @IsOptional() @IsString() whatsapp_phone_number_id?: string;

  // ── Meta ───────────────────────────────────────
  @IsOptional() @IsString() meta_page_token?: string;
  @IsOptional() @IsString() meta_page_id?: string;
  @IsOptional() @IsString() meta_ig_user_id?: string;

  // ── Zoom ───────────────────────────────────────
  @IsOptional() @IsString() zoom_account_id?: string;
  @IsOptional() @IsString() zoom_client_id?: string;
  @IsOptional() @IsString() zoom_client_secret?: string;

  // ── DocuSign ───────────────────────────────────
  @IsOptional() @IsString() docusign_integration_key?: string;
  @IsOptional() @IsString() docusign_account_id?: string;
  @IsOptional() @IsString() docusign_user_id?: string;
  @IsOptional() @IsString() docusign_rsa_private_key?: string;
  @IsOptional() @IsUrl()    docusign_base_url?: string;

  // ── Sindicación ────────────────────────────────
  @IsOptional() @IsString() encuentra24_api_key?: string;
  @IsOptional() @IsString() ml_access_token?: string;

  // ── Carta de Comisión ──────────────────────────
  @IsOptional() @IsString() carta_color_primario?: string;
  @IsOptional() @IsString() carta_tagline?: string;
  @IsOptional() @IsString() carta_logo_url?: string;
  @IsOptional() @IsString() carta_clausulas_custom?: string;
}
