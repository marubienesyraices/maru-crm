import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface ClientesFiltros {
  busqueda?: string;
  origen?: string;
  page?: number;
  limit?: number;
}

export function useClientesStats() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['clientes', 'stats'],
    queryFn: () => apiRequest('/api/clientes/stats', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useClientes(filtros: ClientesFiltros = {}) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['clientes', 'list', filtros],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
      if (filtros.origen) params.set('origen', filtros.origen);
      params.set('page', String(filtros.page ?? 1));
      params.set('limit', String(filtros.limit ?? 20));
      return apiRequest(`/api/clientes?${params}`, { token: accessToken! });
    },
    enabled: !!accessToken,
  });
}

export function useCliente(id: string | undefined) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: () => apiRequest(`/api/clientes/${id}`, { token: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

export function useClienteMatching(id: string | undefined) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['clientes', id, 'matching'],
    queryFn: () => apiRequest(`/api/clientes/${id}/matching`, { token: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateCliente() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest('/api/clientes', { method: 'POST', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useUpdateCliente(id: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest(`/api/clientes/${id}`, { method: 'PUT', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes', id] });
      queryClient.invalidateQueries({ queryKey: ['clientes', 'list'] });
    },
  });
}
