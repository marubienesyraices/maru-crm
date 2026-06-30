import { create } from 'zustand';
import { apiRequest, setupApiInterceptors } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  sub: string;
  tenantId: string;
  email: string;
  rol: string;
}

interface PlanFeatures {
  tiene_correo: boolean;
  tiene_campanas: boolean;
  tiene_portal: boolean;
  tiene_sitio_propio: boolean;
  tiene_integraciones: boolean;
  tiene_meta: boolean;
  tiene_mapas: boolean;
  tiene_ranking: boolean;
  tiene_organigrama: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  plan: string | null;
  limiteUsuarios: number | null;
  limitePropiedades: number | null;
  planFeatures: PlanFeatures | null;
  tema: 'oscuro' | 'claro';
  passwordExpiresIn: number | null; // P-02: days until password expires (null = ok)
  isLoading: boolean;
  error: string | null;

  login:          (email: string, password: string) => Promise<{ requires2FA: boolean; tempToken?: string }>;
  verify2FA:      (tempToken: string, totpCode: string) => Promise<void>;
  logout:         () => Promise<void>;
  refresh:        () => Promise<string | null>;
  forceLogout:    () => void;
  clearError:     () => void;
  updateTema:     (tema: 'oscuro' | 'claro') => Promise<void>;
  refreshBranding: () => Promise<void>;
}

function parseJwt(token: string): User {
  const base64Url = token.split('.')[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonPayload);
}

function applyTema(tema: 'oscuro' | 'claro') {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('userTheme', tema);
}

interface BrandingResponse {
  plan: string;
  limite_usuarios: number;
  limite_propiedades: number;
  color_primario?: string;
  color_secundario?: string;
  color_acento?: string;
  tiene_correo?: boolean;
  tiene_campanas?: boolean;
  tiene_portal?: boolean;
  tiene_sitio_propio?: boolean;
  tiene_integraciones?: boolean;
  tiene_meta?: boolean;
  tiene_mapas?: boolean;
  tiene_ranking?: boolean;
  tiene_organigrama?: boolean;
}

function applyBrandingColors(info: BrandingResponse) {
  const root = document.documentElement;
  if (info.color_primario)   root.style.setProperty('--brand-primary',   info.color_primario);
  if (info.color_secundario) root.style.setProperty('--brand-secondary', info.color_secundario);
  if (info.color_acento)     root.style.setProperty('--brand-accent',    info.color_acento);
}

function applyBranding(info: BrandingResponse) {
  useAuthStore.setState({
    plan: info.plan ?? null,
    limiteUsuarios: info.limite_usuarios ?? null,
    limitePropiedades: info.limite_propiedades ?? null,
    planFeatures: {
      tiene_correo:        info.tiene_correo        ?? false,
      tiene_campanas:      info.tiene_campanas      ?? false,
      tiene_portal:        info.tiene_portal        ?? false,
      tiene_sitio_propio:  info.tiene_sitio_propio  ?? false,
      tiene_integraciones: info.tiene_integraciones ?? false,
      tiene_meta:          info.tiene_meta          ?? false,
      tiene_mapas:         info.tiene_mapas         ?? false,
      tiene_ranking:       info.tiene_ranking       ?? false,
      tiene_organigrama:   info.tiene_organigrama   ?? false,
    },
  });
  applyBrandingColors(info);
}

const _rawRefresh = localStorage.getItem('refreshToken');
const _initRefresh = (_rawRefresh && _rawRefresh !== 'undefined' && _rawRefresh !== 'null') ? _rawRefresh : null;

// ── Proactive token refresh timer ──────────────────────────────
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
}

function scheduleRefresh(token: string) {
  clearRefreshTimer();
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return;
    // Fire 60s before expiry; clamp to 0 if already past that window
    const delay = Math.max(0, payload.exp * 1000 - Date.now() - 60_000);
    _refreshTimer = setTimeout(() => {
      useAuthStore.getState().refresh().then((newToken) => {
        if (newToken) scheduleRefresh(newToken);
      });
    }, delay);
  } catch { /* malformed token — ignore */ }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:              null,
  accessToken:       localStorage.getItem('accessToken'),
  refreshToken:      _initRefresh,
  plan:              null,
  limiteUsuarios:    null,
  limitePropiedades: null,
  planFeatures:      null,
  tema:              (localStorage.getItem('userTheme') as 'oscuro' | 'claro') || 'oscuro',
  passwordExpiresIn: null,
  isLoading:    false,
  error:        null,

  // ── Login ────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<any>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (data.requires2FA) {
        set({ isLoading: false });
        return { requires2FA: true, tempToken: data.tempToken };
      }

      const user = parseJwt(data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({ user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
      scheduleRefresh(data.accessToken);
      // Fetch user preferences (tema) and tenant plan after login
      apiRequest<{ tema: 'oscuro' | 'claro' }>('/api/users/me', { token: data.accessToken })
        .then((profile) => { applyTema(profile.tema); set({ tema: profile.tema }); })
        .catch(() => {});
      apiRequest<BrandingResponse>('/api/tenants/branding', { token: data.accessToken })
        .then(applyBranding)
        .catch(() => {});
      return { requires2FA: false };
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // ── 2FA ──────────────────────────────────────────────────────────
  verify2FA: async (tempToken, totpCode) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest<any>('/api/auth/verify-2fa', {
        method: 'POST',
        body: { tempToken, totpCode },
      });
      const user = parseJwt(data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({
        user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false,
        passwordExpiresIn: data.passwordExpiresIn ?? null, // P-02
      });
      scheduleRefresh(data.accessToken);
      apiRequest<{ tema: 'oscuro' | 'claro' }>('/api/users/me', { token: data.accessToken })
        .then((profile) => { applyTema(profile.tema); set({ tema: profile.tema }); })
        .catch(() => {});
      apiRequest<BrandingResponse>('/api/tenants/branding', { token: data.accessToken })
        .then(applyBranding)
        .catch(() => {});
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // ── Logout ───────────────────────────────────────────────────────
  logout: async () => {
    const { accessToken, refreshToken } = get();
    try {
      if (accessToken && refreshToken) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          token: accessToken,
          body: { refreshToken },
        });
      }
    } catch { /* best-effort */ }
    clearRefreshTimer();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, plan: null, limiteUsuarios: null, limitePropiedades: null, planFeatures: null, tema: 'oscuro' });
  },

  // ── Silent refresh ───────────────────────────────────────────────
  refresh: async (): Promise<string | null> => {
    const { refreshToken } = get();
    // Guard against missing or corrupted "undefined" string from a previous bug
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
      localStorage.removeItem('refreshToken');
      get().forceLogout();
      return null;
    }
    try {
      // Use raw fetch to avoid going through apiRequest (which would loop back here on 401)
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        get().forceLogout();
        return null;
      }

      const data = await res.json();
      const user = parseJwt(data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      // API uses sliding-window: only issues a new refreshToken when close to expiry.
      // Never overwrite the stored refreshToken with undefined.
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
        set({ user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      } else {
        set({ user, accessToken: data.accessToken });
      }
      scheduleRefresh(data.accessToken);
      return data.accessToken;
    } catch {
      get().forceLogout();
      return null;
    }
  },

  // ── Force logout (expired / invalid refresh token) ───────────────
  forceLogout: () => {
    clearRefreshTimer();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, plan: null, limiteUsuarios: null, limitePropiedades: null, planFeatures: null });
    window.location.href = '/login';
  },

  clearError: () => set({ error: null }),

  // ── Refresh branding (name, logo, plan features) ─────────────────
  refreshBranding: async () => {
    const { accessToken } = get();
    if (!accessToken) return;
    try {
      const info = await apiRequest<BrandingResponse>('/api/tenants/branding', { token: accessToken });
      applyBranding(info);
    } catch { /* best-effort */ }
  },

  // ── Update theme preference ──────────────────────────────────────
  updateTema: async (tema) => {
    const { accessToken } = get();
    applyTema(tema);
    set({ tema });
    if (accessToken) {
      apiRequest('/api/users/me/tema', { method: 'PATCH', token: accessToken, body: { tema } })
        .catch(() => {});
    }
  },
}));

// Register interceptors so apiRequest can refresh silently on 401
setupApiInterceptors(
  () => useAuthStore.getState().refresh(),
  () => useAuthStore.getState().forceLogout(),
);

// ── Apply saved theme on page load ───────────────────────────────
const savedTheme = localStorage.getItem('userTheme') as 'oscuro' | 'claro' | null;
if (savedTheme === 'claro' || savedTheme === 'oscuro') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// ── Restore session on page load ──────────────────────────────────
const storedToken   = localStorage.getItem('accessToken');
const storedRefreshRaw = localStorage.getItem('refreshToken');
// Sanitize corrupted values written by earlier bug (stored literal "undefined")
const storedRefresh = (storedRefreshRaw && storedRefreshRaw !== 'undefined' && storedRefreshRaw !== 'null')
  ? storedRefreshRaw
  : null;
if (!storedRefresh && storedRefreshRaw) localStorage.removeItem('refreshToken');

if (storedToken) {
  try {
    const payload = parseJwt(storedToken) as User & { exp?: number };
    const tokenAlive = !payload.exp || payload.exp * 1000 > Date.now();

    if (tokenAlive) {
      useAuthStore.setState({ user: payload });
      scheduleRefresh(storedToken);
      // Restore plan from branding endpoint (non-blocking)
      apiRequest<BrandingResponse>('/api/tenants/branding', { token: storedToken })
        .then(applyBranding)
        .catch(() => {});
    } else if (storedRefresh) {
      // Access token expired but refresh token still exists — try silent refresh immediately
      useAuthStore.getState().refresh();
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}
