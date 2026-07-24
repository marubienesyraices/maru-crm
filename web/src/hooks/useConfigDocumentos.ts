import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../lib/api';

// ── Types ──────────────────────────────────────────────────────

export interface BrochureSeccion {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface BrochureConfig {
  secciones: BrochureSeccion[];
  footer_texto: string | null;
  watermark_texto: string | null;
  es_default: boolean;
}

export interface CartaPlantilla {
  plantilla_html: string;
  es_default: boolean;
}

export interface CartaConfig {
  carta_color_primario: string | null;
  carta_tagline: string | null;
  carta_logo_url: string | null;
  carta_clausulas_custom: string | null;
}

// ── Carta plantilla ────────────────────────────────────────────

export function useCartaPlantilla() {
  const { accessToken } = useAuthStore();
  return useQuery<CartaPlantilla>({
    queryKey: ['carta-plantilla'],
    queryFn: () => apiRequest('/api/tenants/mi-tenant/carta-plantilla', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateCartaPlantilla() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plantilla_html: string) =>
      apiRequest('/api/tenants/mi-tenant/carta-plantilla', {
        method: 'PUT', token: accessToken!, body: { plantilla_html },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carta-plantilla'] }),
  });
}

export function useResetCartaPlantilla() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<CartaPlantilla>('/api/tenants/mi-tenant/carta-plantilla', { method: 'DELETE', token: accessToken! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carta-plantilla'] }),
  });
}

// ── Carta config (color / logo / tagline / cláusulas) ──────────

export function useCartaConfig() {
  const { accessToken } = useAuthStore();
  return useQuery<CartaConfig>({
    queryKey: ['carta-config'],
    queryFn: () => apiRequest('/api/tenants/mi-tenant/carta-config', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateCartaConfig() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<CartaConfig>) =>
      apiRequest('/api/tenants/mi-tenant/carta-config', { method: 'PATCH', token: accessToken!, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carta-config'] }),
  });
}

// ── Brochure config ────────────────────────────────────────────

export function useBrochureConfig() {
  const { accessToken } = useAuthStore();
  return useQuery<BrochureConfig>({
    queryKey: ['brochure-config'],
    queryFn: () => apiRequest('/api/tenants/mi-tenant/brochure-config', { token: accessToken! }),
    enabled: !!accessToken,
  });
}

export function useUpdateBrochureConfig() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<BrochureConfig>) =>
      apiRequest('/api/tenants/mi-tenant/brochure-config', { method: 'PATCH', token: accessToken!, body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brochure-config'] }),
  });
}

export function useResetBrochureConfig() {
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest('/api/tenants/mi-tenant/brochure-config/reset', { method: 'POST', token: accessToken! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brochure-config'] }),
  });
}
