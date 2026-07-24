import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface ClientesListResponse {
  data: unknown[];
}

// All contacts can be assigned as property owners.
// When assigned, the backend automatically sets es_propietario=true on that contact.

export function usePropietarios(busqueda?: string) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propietarios', 'list', busqueda],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (busqueda) params.set('busqueda', busqueda);
      return apiRequest<ClientesListResponse | unknown[]>(`/api/clientes?${params}`, { token: accessToken! })
        .then((r) => ('data' in r ? r.data : r));
    },
    enabled: !!accessToken,
  });
}

export function usePropietario(id: string | undefined) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propietarios', id],
    queryFn: () => apiRequest(`/api/clientes/${id}`, { token: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

export function useCreatePropietario() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/clientes', { method: 'POST', body: { ...body, esPropietario: true }, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propietarios'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export function useUpdatePropietario(id: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest(`/api/clientes/${id}`, { method: 'PUT', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propietarios'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}
