import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ChatbotWidget from '@/components/ChatbotWidget';
import BackToTop from '@/components/BackToTop';
import { PortalConfigProvider } from '@/components/PortalConfigProvider';
import { getPortalConfig, displayName, type PortalConfig } from '@/lib/portal-config';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// ─── Color utilities ─────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function hexDarken(hex: string, amount = 0.15): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) =>
    Math.max(0, Math.round(((n >> shift) & 255) * (1 - amount))).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

function hexLighten(hex: string, amount = 0.08): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) =>
    Math.min(255, Math.round(((n >> shift) & 255) + 255 * amount)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

function buildThemeCss(cfg: PortalConfig): string {
  const pri  = cfg.color_primario        ?? '#3b82f6';
  const card = cfg.color_fondo_alterno   ?? '#0d1226';
  const bg   = cfg.color_fondo_principal ?? '#0a0e1a';
  const txt  = cfg.color_texto           ?? '#f1f5f9';

  const light = luminance(bg) > 128;

  if (light) {
    return `:root {
      --bg: ${bg};
      --bg-card: ${card};
      --bg-card-hover: ${hexDarken(card, 0.05)};
      --border: rgba(0,0,0,0.1);
      --accent: ${pri};
      --accent-dark: ${hexDarken(pri)};
      --text: ${txt};
      --text-muted: ${hexLighten(txt, 0.38)};
      --text-faint: ${hexLighten(txt, 0.62)};
      --shadow: 0 4px 24px rgba(0,0,0,0.1);
      --header-bg: ${hexToRgba(bg, 0.92)};
      --surface-hover: rgba(0,0,0,0.05);
      --input-bg: rgba(0,0,0,0.04);
      --input-border: rgba(0,0,0,0.15);
      --img-placeholder: ${hexDarken(card, 0.08)};
      --hero-from: ${hexDarken(bg, 0.04)};
      --hero-via: ${hexDarken(bg, 0.06)};
      --hero-to: ${hexDarken(bg, 0.05)};
      --hero-glow: ${hexToRgba(pri, 0.08)};
      --detail-overlay: ${hexToRgba(bg, 0.88)};
      --chatbot-bg: ${card};
      --chatbot-border: rgba(0,0,0,0.1);
      --chatbot-surface: rgba(0,0,0,0.05);
      --chatbot-divider: rgba(0,0,0,0.07);
      --chip-bg: ${hexToRgba(pri, 0.1)};
      --chip-border: ${hexToRgba(pri, 0.3)};
      --chip-color: ${hexDarken(pri, 0.2)};
    }`;
  }

  return `:root {
    --bg: ${bg};
    --bg-card: ${card};
    --bg-card-hover: ${hexLighten(card)};
    --border: rgba(255,255,255,0.08);
    --accent: ${pri};
    --accent-dark: ${hexDarken(pri)};
    --text: ${txt};
    --text-muted: ${hexDarken(txt, 0.25)};
    --text-faint: ${hexDarken(txt, 0.5)};
    --shadow: 0 4px 24px rgba(0,0,0,0.35);
    --header-bg: ${hexToRgba(bg, 0.85)};
    --surface-hover: rgba(255,255,255,0.06);
    --input-bg: rgba(255,255,255,0.06);
    --input-border: rgba(255,255,255,0.12);
    --img-placeholder: ${hexDarken(card, 0.15)};
    --hero-from: ${bg};
    --hero-via: ${hexLighten(bg, 0.03)};
    --hero-to: ${hexLighten(bg, 0.02)};
    --hero-glow: ${hexToRgba(pri, 0.12)};
    --detail-overlay: ${hexToRgba(bg, 0.9)};
    --chatbot-bg: ${hexDarken(card, 0.1)};
    --chatbot-border: rgba(255,255,255,0.1);
    --chatbot-surface: rgba(255,255,255,0.08);
    --chatbot-divider: rgba(255,255,255,0.07);
    --chip-bg: ${hexToRgba(pri, 0.1)};
    --chip-border: ${hexToRgba(pri, 0.25)};
    --chip-color: ${hexLighten(pri, 0.1)};
  }`;
}

// ─── Dynamic metadata ─────────────────────────────────────────────────────────

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getPortalConfig();
  const company = displayName(cfg);
  const desc = cfg.seo_descripcion
    ?? 'Encuentra la propiedad ideal: casas, apartamentos, locales y terrenos en Guatemala. Asesoría personalizada.';

  return {
    title:       { default: cfg.seo_titulo ?? `${company} | Propiedades en Guatemala`, template: `%s | ${company}` },
    description: desc,
    keywords:    cfg.seo_keywords ?? undefined,
    icons:       cfg.favicon_url ? [{ rel: 'icon', url: cfg.favicon_url }] : undefined,
    openGraph: {
      type:      'website',
      locale:    'es_GT',
      siteName:  company,
      images:    cfg.favicon_url ? [cfg.favicon_url] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getPortalConfig();
  const themeCss = buildThemeCss(config);

  return (
    <html lang="es">
      <body className={inter.className}>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />

        {/* Google Tag Manager */}
        {config.google_analytics_id?.startsWith('GTM-') && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${config.google_analytics_id}');`,
            }}
          />
        )}

        {/* Google Analytics 4 (direct) */}
        {config.google_analytics_id && !config.google_analytics_id.startsWith('GTM-') && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${config.google_analytics_id}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.google_analytics_id}');`,
              }}
            />
          </>
        )}

        {/* Facebook Pixel */}
        {config.facebook_pixel_id && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${config.facebook_pixel_id}');fbq('track','PageView');`,
            }}
          />
        )}

        <PortalConfigProvider config={config}>
          {children}
          {config.chatbot_activo !== false && <ChatbotWidget />}
          <BackToTop />
        </PortalConfigProvider>
      </body>
    </html>
  );
}
