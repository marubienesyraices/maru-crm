const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

type RefreshFn = () => Promise<string | null>;
type LogoutFn  = () => void;

let _refresh: RefreshFn | null = null;
let _logout:  LogoutFn  | null = null;

// Single in-flight refresh promise — prevents N concurrent 401s from spawning N refreshes.
let _refreshing: Promise<string | null> | null = null;

export function setupApiInterceptors(refresh: RefreshFn, logout: LogoutFn) {
  _refresh = refresh;
  _logout  = logout;
}

// Default T=any kept intentionally: ~95 call sites rely on inference without
// an explicit generic; switching the default to `unknown` would force every
// one of them to add an explicit type argument (verified: breaks unrelated
// pages like DashboardPage/ClientsListPage that aren't part of this cleanup).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Intercept 401 — attempt silent token refresh (skip for auth endpoints, whose own
  // 401s are real login/2FA errors, not an expired session)
  const isAuthEndpoint = endpoint === '/api/auth/refresh'
    || endpoint === '/api/auth/login'
    || endpoint === '/api/auth/verify-2fa';
  if (res.status === 401 && _refresh && !isAuthEndpoint) {
    if (!_refreshing) {
      _refreshing = _refresh().finally(() => { _refreshing = null; });
    }
    const newToken = await _refreshing;
    if (newToken) {
      return apiRequest(endpoint, { ...options, token: newToken });
    }
    _logout?.();
    throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud');
  return data;
}
