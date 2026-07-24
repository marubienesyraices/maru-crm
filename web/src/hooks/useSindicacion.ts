import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export interface SindicacionPublicacion {
  portal: 'ENCUENTRA24' | 'MERCADOLIBRE';
  estado: 'PUBLICADO' | 'PENDIENTE' | 'ERROR' | 'RETIRADO';
  external_url?: string | null;
}

export function useSindicacion(propiedadId: string) {
  const { accessToken } = useAuthStore();
  return useQuery<SindicacionPublicacion[]>({
    queryKey: ['sindicacion', propiedadId],
    queryFn: () => apiRequest(`/api/sindicacion/${propiedadId}`, { token: accessToken! }),
    enabled: !!accessToken && !!propiedadId,
  });
}

export function usePublicarPortal(propiedadId: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portal: 'ENCUENTRA24' | 'MERCADOLIBRE') =>
      apiRequest(`/api/sindicacion/${propiedadId}/publicar`, {
        method: 'POST', body: { portal }, token: accessToken!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sindicacion', propiedadId] });
    },
  });
}

export function useRetirarPortal(propiedadId: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portal: 'ENCUENTRA24' | 'MERCADOLIBRE') =>
      apiRequest(`/api/sindicacion/${propiedadId}/retirar/${portal}`, {
        method: 'DELETE', token: accessToken!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sindicacion', propiedadId] });
    },
  });
}
