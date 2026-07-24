import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMovePipeline, type PipelineItem } from '../usePipeline';
import { apiRequest } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ accessToken: 'token-de-prueba' }),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const item: PipelineItem = {
  id: 'pipe-1',
  estado: 'NUEVO',
  cliente: { id: 'cli-1', nombre: 'Juan Pérez' },
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(['pipeline'], { NUEVO: [item], CONTACTADO: [] });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useMovePipeline', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('mueve el item de columna de forma optimista antes de que el servidor responda', async () => {
    let resolveRequest!: (v: unknown) => void;
    mockedApiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const { queryClient, wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovePipeline(), { wrapper });

    act(() => {
      result.current.mutate({ id: 'pipe-1', nuevoEstado: 'CONTACTADO' });
    });

    // Antes de que el servidor responda, la UI ya refleja el movimiento (optimistic update).
    await waitFor(() => {
      const data = queryClient.getQueryData<Record<string, PipelineItem[]>>(['pipeline'])!;
      expect(data.NUEVO).toHaveLength(0);
      expect(data.CONTACTADO).toHaveLength(1);
      expect(data.CONTACTADO[0].estado).toBe('CONTACTADO');
    });

    resolveRequest({});
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('revierte el movimiento optimista si el servidor rechaza la transición', async () => {
    mockedApiRequest.mockRejectedValue(new Error('Transición inválida'));

    const { queryClient, wrapper } = makeWrapper();
    const { result } = renderHook(() => useMovePipeline(), { wrapper });

    act(() => {
      result.current.mutate({ id: 'pipe-1', nuevoEstado: 'CONTACTADO' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = queryClient.getQueryData<Record<string, PipelineItem[]>>(['pipeline'])!;
    expect(data.NUEVO).toHaveLength(1);
    expect(data.NUEVO[0].estado).toBe('NUEVO');
    expect(data.CONTACTADO).toHaveLength(0);
  });
});
