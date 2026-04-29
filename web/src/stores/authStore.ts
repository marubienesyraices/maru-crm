import { create } from 'zustand';
import { apiRequest } from '../lib/api';

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

  login: (email: string, password: string) => Promise<{ requires2FA: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, totpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function parseJwt(token: string): User {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonPayload);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: false,
  error: null,

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

      // No 2FA: direct login
      const user = parseJwt(data.accessToken);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({
        user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoading: false,
      });
      return { requires2FA: false };
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

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
        user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

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
    } catch { }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  clearError: () => set({ error: null }),
}));

// Initialize user from stored token
const storedToken = localStorage.getItem('accessToken');
if (storedToken) {
  try {
    const payload = parseJwt(storedToken) as User & { exp?: number };
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 > Date.now()) {
      useAuthStore.setState({ user: payload });
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}
