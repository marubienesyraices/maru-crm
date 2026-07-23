import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class UpdateConfigPortalDto {
  // ── Identidad ──────────────────────────────────
  @IsOptional() @IsString() nombre_empresa?: string;
  @IsOptional() @IsString() slogan?: string;
  @IsOptional() @IsEmail() email_contacto?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() horario_atencion?: string;

  // ── Dominio ────────────────────────────────────
  @IsOptional() @IsString() dominio_personalizado?: string;
  @IsOptional() @IsString() subdominio?: string;
  @IsOptional() @IsBoolean() portal_activo?: boolean;

  // ── Apariencia ─────────────────────────────────
  @IsOptional() @IsUrl() favicon_url?: string;
  @IsOptional() @IsUrl() imagen_hero?: string;
  @IsOptional() @IsString() titulo_hero?: string;
  @IsOptional() @IsString() descripcion_hero?: string;
  @IsOptional() @IsString() footer_texto?: string;

  // ── SEO ────────────────────────────────────────
  @IsOptional() @IsString() seo_titulo?: string;
  @IsOptional() @IsString() seo_descripcion?: string;
  @IsOptional() @IsString() seo_keywords?: string;

  // ── Chatbot ────────────────────────────────────
  @IsOptional() @IsBoolean() chatbot_activo?: boolean;
  @IsOptional() @IsString() chatbot_mensaje_bienvenida?: string;

  // ── Analytics ──────────────────────────────────
  @IsOptional() @IsString() google_analytics_id?: string;
  @IsOptional() @IsString() facebook_pixel_id?: string;

  // ── Mapa ───────────────────────────────────────
  @IsOptional() @IsString() mapbox_token_publico?: string;
  @IsOptional() @IsNumber() mapa_lat_default?: number;
  @IsOptional() @IsNumber() mapa_lng_default?: number;
  @IsOptional() @IsInt() @Min(1) @Max(22) mapa_zoom_default?: number;
}
