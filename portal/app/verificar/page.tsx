import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import VerificarClient from './VerificarClient';

export const metadata: Metadata = {
  title: 'Verificar correo',
  robots: { index: false, follow: false },
};

export default function VerificarPage() {
  return (
    <div className="verify-page">
      <Header />
      <main className="verify-main">
        <Suspense
          fallback={
            <div className="verify-card">
              <div className="verify-icon">⏳</div>
              <p className="verify-title">Cargando…</p>
            </div>
          }
        >
          <VerificarClient />
        </Suspense>
      </main>

      <footer className="portal-footer">
        <strong>Maru Bienes y Raíces</strong><br />
        © {new Date().getFullYear()} Maru Bienes y Raíces. Todos los derechos reservados.
      </footer>
    </div>
  );
}
