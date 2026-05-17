import { Suspense } from 'react';
import Header from '@/components/Header';
import VerifyLoginClient from './VerifyLoginClient';

export const metadata = { title: 'Verificando acceso', robots: { index: false, follow: false } };

export default function VerifyLoginPage() {
  return (
    <>
      <Header />
      <div className="mc-verify-wrap">
        <Suspense
          fallback={
            <>
              <div className="mc-spinner" />
              <p>Verificando tu acceso…</p>
            </>
          }
        >
          <VerifyLoginClient />
        </Suspense>
      </div>
    </>
  );
}
