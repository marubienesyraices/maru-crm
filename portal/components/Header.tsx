import Link from 'next/link';
import { getPortalConfig, displayName } from '@/lib/portal-config';
import ThemeToggle from '@/components/ThemeToggle';

export default async function Header() {
  const cfg = await getPortalConfig();
  const company = displayName(cfg);
  const wa = cfg.whatsapp ?? '';

  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <Link href="/" className="portal-logo">
          {cfg.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.logo_url} alt={company} style={{ height: 28, objectFit: 'contain' }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          )}
          <span>{company}</span>
        </Link>
        <nav className="portal-nav" aria-label="Navegación principal">
          <Link href="/">Propiedades</Link>
          <Link href="/#nosotros">Nosotros</Link>
          <ThemeToggle />
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="cta">
              WhatsApp
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
