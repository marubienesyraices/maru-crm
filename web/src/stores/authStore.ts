import { create } from 'zustand';
import { apiRequest, setupApiInterceptors } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  sub: string;
  tenantId: string;
  email: string;
  rol: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  login:        (email: string, password: string) => Promise<{ requires2FA: boolean; tempToken?: string }>;
  verify2FA:    (tempToken: string, totpCode: string) => Promise<void>;
  logout:       () => Promise<void>;
  refresh:      () => Promise<string | null>;
  forceLogout:  () => void;
  clearError:   () => void;
}

function parseJwt(token: string): User {
  const base64Url = token.split('.')[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonPayload);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:         null,
  accessToken:  localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
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
      set({ user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  // ── Silent refresh ───────────────────────────────────────────────
  refresh: async (): Promise<string | null> => {
    const { refreshToken } = get();
    if (!refreshToken) {
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
      localStorage.setItem('refreshToken', data.refreshToken);
      set({ user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch {
      get().forceLogout();
      return null;
    }
  },

  // ── Force logout (expired / invalid refresh token) ───────────────
  forceLogout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
    window.location.href = '/login';
  },

  clearError: () => set({ error: null }),
}));

// Register interceptors so apiRequest can refresh silently on 401
setupApiInterceptors(
  () => useAuthStore.getState().refresh(),
  () => useAuthStore.getState().forceLogout(),
);

// ── Restore session on page load ──────────────────────────────────
const storedToken   = localStorage.getItem('accessToken');
const storedRefresh = localStorage.getItem('refreshToken');

if (storedToken) {
  try {
    const payload = parseJwt(storedToken) as User & { exp?: number };
    const tokenAlive = !payload.exp || payload.exp * 1000 > Date.now();

    if (tokenAlive) {
      useAuthStore.setState({ user: payload });
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
