import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export interface Visita {
  id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion?: string | null;
  zoom_join_url?: string | null;
  reporte_fecha?: string | null;
  reporte_notas?: string | null;
  reporte_nivel_interes?: string | null;
  reporte_reaccion?: string | null;
  reporte_siguiente_paso?: string | null;
  interes?: {
    cliente?: { nombre: string } | null;
    propiedad?: { codigo: string } | null;
  } | null;
}

export function useVisitasConfig() {
  const { accessToken } = useAuthStore();
  return useQuery<{ buffer_entre_citas_min: number }>({
    queryKey: ['visitas', 'config'],
    queryFn: () => apiRequest('/api/visitas/config', { token: accessToken! }),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });
}

export function useVisitas(from: Date, to: Date) {
  const { accessToken } = useAuthStore();
  return useQuery<Visita[]>({
    queryKey: ['visitas', from.toISOString(), to.toISOString()],
    queryFn: () =>
      apiRequest(`/api/visitas?from=${from.toISOString()}&to=${to.toISOString()}`, {
        token: accessToken!,
      }),
    enabled: !!accessToken,
  });
}

export function useCreateVisita() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/visitas', { method: 'POST', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
  });
}

export function useUpdateVisita() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      apiRequest(`/api/visitas/${id}`, { method: 'PATCH', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
  });
}

export function useDeleteVisita() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/visitas/${id}`, { method: 'DELETE', token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
  });
}

export function useReporteVisita() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      apiRequest(`/api/visitas/${id}/reporte`, { method: 'PATCH', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
  });
}

export function useCrearMeeting() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitaId: string) =>
      apiRequest(`/api/videollamadas/visitas/${visitaId}`, { method: 'POST', token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
  });
}

export function useEliminarMeeting() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visitaId: string) =>
      apiRequest(`/api/videollamadas/visitas/${visitaId}`, { method: 'DELETE', token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
    },
  });
}
