import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export interface FirmaSolicitud {
  id: string;
  estado: 'ENVIADO' | 'COMPLETADO' | 'DECLINADO' | 'VENCIDO' | 'PENDIENTE';
  firmante_nombre: string;
  firmante_email: string;
  signing_url?: string | null;
  created_at: string;
}

export function useFirmaSolicitudes(propiedadId: string) {
  const { accessToken } = useAuthStore();
  return useQuery<FirmaSolicitud[]>({
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
