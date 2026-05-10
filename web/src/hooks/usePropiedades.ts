import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface PropiedadesFiltros {
  tipo?: string;
  gestion?: string;
  estado?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export function usePropiedadesStats() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propiedades', 'stats'],
    queryFn: () => apiRequest('/api/propiedades/stats', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function usePropiedades(filtros: PropiedadesFiltros = {}) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propiedades', 'list', filtros],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtros.tipo) params.set('tipo', filtros.tipo);
      if (filtros.gestion) params.set('gestion', filtros.gestion);
      if (filtros.estado) params.set('estado', filtros.estado);
      if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
      params.set('page', String(filtros.page ?? 1));
      params.set('limit', String(filtros.limit ?? 12));
      return apiRequest(`/api/propiedades?${params}`, { token: accessToken! });
    },
    enabled: !!accessToken,
  });
}

export function usePropiedad(id: string | undefined) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propiedades', id],
    queryFn: () => apiRequest(`/api/propiedades/${id}`, { token: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

export function useUpdateEstadoPropiedad() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      apiRequest(`/api/propiedades/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
        token: accessToken!,
      }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['propiedades', id] });
      queryClient.invalidateQueries({ queryKey: ['propiedades', 'stats'] });
    },
  });
}

export function useCreatePropiedad() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest('/api/propiedades', { method: 'POST', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propiedades'] });
    },
  });
}

export function useUpdatePropiedad(id: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest(`/api/propiedades/${id}`, { method: 'PUT', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propiedades', id] });
      queryClient.invalidateQueries({ queryKey: ['propiedades', 'list'] });
    },
  });
}
