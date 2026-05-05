import Link from 'next/link';

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Maru Bienes y Raíces';
const WA      = process.env.NEXT_PUBLIC_WHATSAPP || '';

export default function Header() {
  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <Link href="/" className="portal-logo">
          🏡 <span>Maru</span>&nbsp;Bienes y Raíces
        </Link>
        <nav className="portal-nav">
          <Link href="/">Propiedades</Link>
          <Link href="/#nosotros">Nosotros</Link>
          {WA && (
            <a
              href={`https://wa.me/${WA}`}
              target="_blank" rel="noreferrer"
              className="cta"
            >
              WhatsApp
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
