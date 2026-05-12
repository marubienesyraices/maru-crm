import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ChatbotWidget from '@/components/ChatbotWidget';
import BackToTop from '@/components/BackToTop';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const API     = process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3000';
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Maru Bienes y Raíces';

export const metadata: Metadata = {
  title:       { default: `${COMPANY} | Propiedades en Guatemala`, template: `%s | ${COMPANY}` },
  description: 'Encuentra la propiedad ideal: casas, apartamentos, locales y terrenos en Guatemala. Asesoría personalizada.',
  openGraph:   { type: 'website', locale: 'es_GT', siteName: COMPANY },
  robots:      { index: true, follow: true },
};

interface Branding {
  color_primario: string;
  color_acento: string;
  color_fondo_alterno: string;
  color_fondo_principal: string;
  color_texto: string;
}

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

function buildThemeCss(b: Branding): string {
  const light = luminance(b.color_fondo_principal) > 128;
  const bg    = b.color_fondo_principal;
  const txt   = b.color_texto;
  const pri   = b.color_primario;
  const card  = b.color_fondo_alterno;

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

async function fetchBranding(): Promise<Branding | null> {
  try {
    const res = await fetch(`${API}/api/public/branding`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await fetchBranding();
  const themeCss = branding ? buildThemeCss(branding) : '';

  return (
    <html lang="es">
      <body className={inter.className}>
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        {children}
        <ChatbotWidget />
        <BackToTop />
      </body>
    </html>
  );
}
