import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  tenantId: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2FA: boolean; tempToken?: string }>;
  verify2FA: (code: string, tempToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

function parseJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub,
      nombre: payload.nombre ?? '',
      email: payload.email ?? '',
      rol: payload.rol ?? '',
      tenantId: payload.tenantId ?? '',
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  loadSession: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const user = token ? parseJwt(token) : null;
    set({ user, isLoading: false });
  },

  login: async (email, password) => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? 'Error de autenticación');

    if (body.requires2FA) {
      return { requires2FA: true, tempToken: body.tempToken };
    }

    await SecureStore.setItemAsync('accessToken', body.accessToken);
    await SecureStore.setItemAsync('refreshToken', body.refreshToken);
    set({ user: parseJwt(body.accessToken) });
    return { requires2FA: false };
  },

  verify2FA: async (code, tempToken) => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${API_URL}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, tempToken }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message ?? 'Código inválido');

    await SecureStore.setItemAsync('accessToken', body.accessToken);
    await SecureStore.setItemAsync('refreshToken', body.refreshToken);
    set({ user: parseJwt(body.accessToken) });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null });
  },
}));
