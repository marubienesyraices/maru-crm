import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export function usePropietarios(busqueda?: string) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propietarios', 'list', busqueda],
    queryFn: () => {
      const params = new URLSearchParams();
      if (busqueda) params.set('busqueda', busqueda);
      return apiRequest(`/api/propietarios?${params}`, { token: accessToken! });
    },
    enabled: !!accessToken,
  });
}

export function usePropietario(id: string | undefined) {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['propietarios', id],
    queryFn: () => apiRequest(`/api/propietarios/${id}`, { token: accessToken! }),
    enabled: !!accessToken && !!id,
  });
}

export function useCreatePropietario() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest('/api/propietarios', { method: 'POST', body, token: accessToken! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['propietarios'] }),
  });
}

export function useUpdatePropietario(id: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) =>
      apiRequest(`/api/propietarios/${id}`, { method: 'PUT', body, token: accessToken! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['propietarios'] }),
  });
}
