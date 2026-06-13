import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import ChatbotWidget from '@/components/ChatbotWidget';
import BackToTop from '@/components/BackToTop';
import { PortalConfigProvider } from '@/components/PortalConfigProvider';
import { getPortalConfig, displayName } from '@/lib/portal-config';

// Fuente local (no depende de Google Fonts en build time)
const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  display: 'swap',
  weight: '100 900',
});

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

  if (config.tenant_id && config.tiene_portal === false) {
    const company = displayName(config);
    return (
      <html lang="es">
        <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f1f5f9', color: '#475569' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Portal no disponible</h1>
            <p style={{ maxWidth: '400px', lineHeight: 1.7, margin: 0 }}>
              El portal público de <strong>{company}</strong> no está disponible en el plan actual.
              Contacta con tu inmobiliaria para más información.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('portal-theme')||'oscuro';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body className={inter.className}>

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
