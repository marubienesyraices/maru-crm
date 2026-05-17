const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PropiedadPublica {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  gestion: string;
  precio_venta: number | null;
  precio_renta: number | null;
  moneda: string;
  departamento: string | null;
  municipio: string | null;
  zona: string | null;
  habitaciones: number | null;
  banos: number | null;
  area_construccion_m2: number | null;
  area_terreno_m2: number | null;
  descripcion: string | null;
  amenidades: string[];
  imagenes: { url: string; alt: string | null }[];
  tenant: { nombre: string; whatsapp?: string | null };
}

export interface PropiedadesResponse {
  data: PropiedadPublica[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Filtros {
  tipo?: string;
  gestion?: string;
  departamento?: string;
  busqueda?: string;
  precioMin?: string;
  precioMax?: string;
  habitacionesMin?: string;
  page?: string;
  tenantId?: string;
}

export async function getPropiedades(filtros: Filtros = {}): Promise<PropiedadesResponse> {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
  params.set('limit', '12');

  const res = await fetch(`${API}/api/public/propiedades?${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Error cargando propiedades');
  return res.json();
}

export async function getPropiedad(id: string): Promise<PropiedadPublica | null> {
  const res = await fetch(`${API}/api/public/propiedades/${id}`, {
    next: { revalidate: 120 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Error cargando propiedad');
  return res.json();
}

export function fmtPrecio(v: number | null | undefined, moneda = 'GTQ'): string {
  if (!v) return '—';
  try {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${moneda} ${v.toLocaleString('es-GT')}`;
  }
}

export const TIPO_LABELS: Record<string, string> = {
  CASA: 'Casa', APARTAMENTO: 'Apto', LOCAL_COMERCIAL: 'Local',
  OFICINA: 'Oficina', BODEGA: 'Bodega', TERRENO: 'Terreno', FINCA: 'Finca',
};
export const GESTION_LABELS: Record<string, string> = {
  VENTA: 'Venta', RENTA: 'Renta', AMBAS: 'Venta/Renta',
};
