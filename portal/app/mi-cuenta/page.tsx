import { Suspense } from 'react';
import Header from '@/components/Header';
import MiCuentaClient from '@/components/MiCuentaClient';
import { getPortalConfig } from '@/lib/portal-config';

export const metadata = { title: 'Mi cuenta' };

export default async function MiCuentaPage() {
  const cfg = await getPortalConfig();

  return (
    <>
      <Header />
      <Suspense fallback={<div className="mc-loading"><div className="mc-spinner" /><span>Cargando…</span></div>}>
        <MiCuentaClient tenantId={cfg.tenant_id} />
      </Suspense>
    </>
  );
}
