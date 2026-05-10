import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export function useFirmaSolicitudes(propiedadId: string) {
  const { accessToken } = useAuthStore();
  return useQuery<any[]>({
    queryKey: ['firma', propiedadId],
    queryFn: () => apiRequest(`/api/firma/${propiedadId}`, { token: accessToken! }),
    enabled: !!accessToken && !!propiedadId,
  });
}

export function useSolicitarFirma(propiedadId: string) {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { firmanteNombre: string; firmanteEmail: string }) =>
      apiRequest(`/api/firma/${propiedadId}/solicitar`, {
        method: 'POST', body: dto, token: accessToken!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firma', propiedadId] });
    },
  });
}
