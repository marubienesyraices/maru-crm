import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest, setupApiInterceptors } from '../api';

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset interceptors so tests don't leak refresh/logout mocks into each other.
    setupApiInterceptors(
      () => Promise.resolve(null),
      () => {},
    );
  });

  it('devuelve el body en una respuesta 200', async () => {
    globalThis.fetch = mockFetchOnce(200, { ok: true }) as unknown as typeof fetch;

    const result = await apiRequest('/api/propiedades');

    expect(result).toEqual({ ok: true });
  });

  it('lanza un error con el mensaje del backend cuando la respuesta no es ok', async () => {
    globalThis.fetch = mockFetchOnce(400, { message: 'Datos inválidos' }) as unknown as typeof fetch;

    await expect(apiRequest('/api/clientes')).rejects.toThrow('Datos inválidos');
  });

  it('en un 401 de un endpoint normal, refresca el token y reintenta la petición', async () => {
    const fetchMock = vi
      .fn()
      // Primera llamada: 401
      .mockResolvedValueOnce({ status: 401, ok: false, json: () => Promise.resolve({}) })
      // Reintento tras refresh: 200
      .mockResolvedValueOnce({ status: 200, ok: true, json: () => Promise.resolve({ data: 'ok' }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const refresh = vi.fn().mockResolvedValue('nuevo-token');
    setupApiInterceptors(refresh, () => {});

    const result = await apiRequest('/api/clientes', { token: 'token-viejo' });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'ok' });
    // El reintento debe llevar el token nuevo, no el viejo.
    const retryCall = fetchMock.mock.calls[1];
    expect((retryCall[1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer nuevo-token',
    });
  });

  it('no intenta refrescar el token en un 401 de /api/auth/login (es un error real de credenciales)', async () => {
    globalThis.fetch = mockFetchOnce(401, { message: 'Credenciales inválidas' }) as unknown as typeof fetch;

    const refresh = vi.fn();
    setupApiInterceptors(refresh, () => {});

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toThrow(
      'Credenciales inválidas',
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('si el refresh falla (null), cierra sesión y lanza "Sesión expirada"', async () => {
    globalThis.fetch = mockFetchOnce(401, {}) as unknown as typeof fetch;

    const logout = vi.fn();
    setupApiInterceptors(() => Promise.resolve(null), logout);

    await expect(apiRequest('/api/clientes')).rejects.toThrow('Sesión expirada');
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('deduplica refreshes concurrentes: dos 401 simultáneos solo disparan un refresh', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ status: 401, ok: false, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ status: 200, ok: true, json: () => Promise.resolve({ n: 1 }) })
      .mockResolvedValueOnce({ status: 200, ok: true, json: () => Promise.resolve({ n: 2 }) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const refresh = vi.fn().mockResolvedValue('nuevo-token');
    setupApiInterceptors(refresh, () => {});

    const results = await Promise.all([
      apiRequest('/api/clientes', { token: 'viejo' }),
      apiRequest('/api/propiedades', { token: 'viejo' }),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results).toEqual(expect.arrayContaining([{ n: 1 }, { n: 2 }]));
  });
});
