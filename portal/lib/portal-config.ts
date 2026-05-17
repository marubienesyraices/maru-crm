import { cache } from 'react';
import { headers } from 'next/headers';

export interface PortalConfig {
  tenant_id?: string;
  // Identidad
  nombre_empresa?: string | null;
  slogan?: string | null;
  email_contacto?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  horario_atencion?: string | null;
  // Dominio
  dominio_personalizado?: string | null;
  subdominio?: string | null;
  portal_activo?: boolean;
  // Apariencia
  favicon_url?: string | null;
  imagen_hero?: string | null;
  titulo_hero?: string | null;
  descripcion_hero?: string | null;
  footer_texto?: string | null;
  // SEO
  seo_titulo?: string | null;
  seo_descripcion?: string | null;
  seo_keywords?: string | null;
  // Chatbot
  chatbot_activo?: boolean;
  chatbot_mensaje_bienvenida?: string | null;
  // Analytics
  google_analytics_id?: string | null;
  facebook_pixel_id?: string | null;
  // Mapa
  mapbox_token_publico?: string | null;
  mapa_lat_default?: number | null;
  mapa_lng_default?: number | null;
  mapa_zoom_default?: number | null;
  logo_url?: string | null;
  tenant_nombre?: string | null;
}

const DEFAULTS: PortalConfig = {
  nombre_empresa: 'GestPro',
  chatbot_activo:  true,
  portal_activo:   true,
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetches portal config from the API using the original request Host.
 * Wrapped with React cache() to deduplicate within a single render tree.
 */
export const getPortalConfig = cache(async (): Promise<PortalConfig> => {
  const h = headers();
  const raw = h.get('x-portal-host') ?? h.get('host') ?? '';
  const host = raw.split(':')[0].toLowerCase();

  try {
    const res = await fetch(
      `${API}/api/public/portal-config?host=${encodeURIComponent(host)}`,
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const data: PortalConfig = await res.json();
      return { ...DEFAULTS, ...data };
    }
  } catch { /* fallback to defaults */ }

  return { ...DEFAULTS };
});

/** Returns the best display name for the tenant. */
export function displayName(cfg: PortalConfig): string {
  return cfg.nombre_empresa ?? cfg.tenant_nombre ?? 'GestPro';
}
