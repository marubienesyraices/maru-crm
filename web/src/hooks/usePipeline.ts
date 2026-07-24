import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export interface PipelineItem {
  id: string;
  estado: string;
  nivel_interes?: string | null;
  notas?: string | null;
  motivo_perdida?: string | null;
  fecha_contacto?: string | null;
  fecha_cierre?: string | null;
  precio_cierre?: number | string | null;
  tipo_operacion_cierre?: string | null;
  duracion_contrato_meses?: number | null;
  comision_calculada?: number | string | null;
  comision_sugerida_venta?: number | string | null;
  comision_sugerida_renta?: number | string | null;
  cliente?: { id: string; nombre: string } | null;
  propiedad?: {
    id: string;
    codigo: string;
    titulo: string;
    moneda?: string | null;
    gestion?: string | null;
    precio_venta?: number | string | null;
    precio_renta?: number | string | null;
    comision_porcentaje?: number | string | null;
  } | null;
  _count?: { interacciones: number } | null;
}

export function usePipeline() {
  const { accessToken } = useAuthStore();
  return useQuery<Record<string, PipelineItem[]>>({
    queryKey: ['pipeline'],
    queryFn: () => apiRequest('/api/pipeline', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function usePipelineStats() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['pipeline', 'stats'],
    queryFn: () => apiRequest('/api/pipeline/stats', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useMovePipeline() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      nuevoEstado,
      motivoPerdida,
      precioAcordado,
      cierreDocumentos,
      tipoOperacionCierre,
      duracionContratoMeses,
      comisionAcordada,
    }: {
      id: string;
      nuevoEstado: string;
      motivoPerdida?: string;
      precioAcordado?: number;
      cierreDocumentos?: string[];
      tipoOperacionCierre?: string;
      duracionContratoMeses?: number;
      comisionAcordada?: number;
    }) =>
      apiRequest(`/api/pipeline/${id}/estado`, {
        method: 'PATCH',
        body: {
          nuevoEstado,
          ...(motivoPerdida ? { motivoPerdida } : {}),
          ...(precioAcordado != null ? { precioAcordado } : {}),
          ...(cierreDocumentos?.length ? { cierreDocumentos } : {}),
          ...(tipoOperacionCierre ? { tipoOperacionCierre } : {}),
          ...(duracionContratoMeses != null ? { duracionContratoMeses } : {}),
          ...(comisionAcordada != null ? { comisionAcordada } : {}),
        },
        token: accessToken!,
      }),

    onMutate: async ({ id, nuevoEstado }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] });
      const previous = queryClient.getQueryData<Record<string, PipelineItem[]>>(['pipeline']);

      queryClient.setQueryData<Record<string, PipelineItem[]>>(['pipeline'], (prev = {}) => {
        const item = Object.values(prev).flat().find((i) => i.id === id);
        if (!item) return prev;
        const next = { ...prev };
        next[item.estado] = (next[item.estado] || []).filter((i) => i.id !== id);
        next[nuevoEstado] = [...(next[nuevoEstado] || []), { ...item, estado: nuevoEstado }];
        return next;
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pipeline'], context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'stats'] });
    },
  });
}

export function useCreatePipeline() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest('/api/pipeline', { method: 'POST', body, token: accessToken! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}
