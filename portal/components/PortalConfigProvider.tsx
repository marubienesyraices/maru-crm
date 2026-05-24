'use client';

import { createContext, useContext } from 'react';
import type { PortalConfig } from '@/lib/portal-config';

export type { PortalConfig };

const Ctx = createContext<PortalConfig>({});

export function PortalConfigProvider({
  config,
  children,
}: {
  config: PortalConfig;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export function usePortalConfig(): PortalConfig {
  return useContext(Ctx);
}

export function displayName(cfg: PortalConfig): string {
  return cfg.nombre_empresa ?? cfg.tenant_nombre ?? 'GestProp';
}
