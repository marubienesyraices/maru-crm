import Link from 'next/link';

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Maru Bienes y Raíces';
const WA      = process.env.NEXT_PUBLIC_WHATSAPP || '';

export default function Header() {
  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <Link href="/" className="portal-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>{COMPANY}</span>
        </Link>
        <nav className="portal-nav" aria-label="Navegación principal">
          <Link href="/">Propiedades</Link>
          <Link href="/#nosotros">Nosotros</Link>
          {WA && (
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer" className="cta">
              WhatsApp
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
