export interface BrochureSeccion {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export const DEFAULT_BROCHURE_SECTIONS: BrochureSeccion[] = [
  { id: 'descripcion', label: 'Descripción', visible: true, order: 1 },
  { id: 'caracteristicas', label: 'Características', visible: true, order: 2 },
  { id: 'amenidades', label: 'Amenidades', visible: true, order: 3 },
  { id: 'ubicacion', label: 'Ubicación', visible: true, order: 4 },
  { id: 'agente', label: 'Agente a cargo', visible: true, order: 5 },
  { id: 'galeria_strip', label: 'Galería (tira)', visible: true, order: 6 },
  { id: 'galeria_pagina2', label: 'Galería (pág. 2)', visible: true, order: 7 },
];

/** IDs que pertenecen a la columna izquierda (ordenables entre sí) */
export const SECCION_COLUMNA_IZQUIERDA = new Set([
  'descripcion',
  'caracteristicas',
  'amenidades',
]);

/** IDs que pertenecen a la columna derecha */
export const SECCION_COLUMNA_DERECHA = new Set(['ubicacion', 'agente']);
