import Link from 'next/link';
import Header from '@/components/Header';
import { getPortalConfig, displayName } from '@/lib/portal-config';

export default async function NotFound() {
  const cfg = await getPortalConfig();
  const COMPANY = displayName(cfg);

  return (
    <>
      <Header />
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', textAlign: 'center', gap: 16,
      }}>
        <div style={{ fontSize: '4rem' }}>🏠</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 0 }}>Página no encontrada</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: 0 }}>
          La propiedad o página que buscas no existe o ya no está disponible.
        </p>
        <Link href="/" style={{
          marginTop: 8, padding: '10px 24px', borderRadius: 8,
          border: '1px solid var(--border)', color: 'var(--text)',
          textDecoration: 'none', fontSize: '0.9375rem',
          transition: 'background var(--transition)',
        }}>
          ← Ver todas las propiedades
        </Link>
      </div>
      <footer className="portal-footer">
        <strong>{COMPANY}</strong><br />
        © {new Date().getFullYear()} {COMPANY}. Todos los derechos reservados.
      </footer>
    </>
  );
}
