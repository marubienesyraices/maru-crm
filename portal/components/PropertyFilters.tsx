'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const TIPOS    = ['CASA', 'APARTAMENTO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'TERRENO', 'FINCA'];
const GESTIONES = ['VENTA', 'RENTA'];
const DEPTOS   = ['Guatemala', 'Sacatepéquez', 'Escuintla', 'Quetzaltenango', 'Petén', 'Izabal', 'Alta Verapaz'];

const TIPO_LABELS: Record<string, string> = {
  CASA: 'Casa', APARTAMENTO: 'Apartamento', LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina', BODEGA: 'Bodega', TERRENO: 'Terreno', FINCA: 'Finca',
};

export default function PropertyFilters() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const get = (key: string) => searchParams.get(key) ?? '';

  const update = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page'); // reset page on filter change
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <aside className="portal-sidebar">
      {/* Tipo */}
      <div className="filter-section">
        <div className="filter-label">Tipo de propiedad</div>
        <div className="filter-btn-group">
          <button className={`filter-btn${!get('tipo') ? ' active' : ''}`}
            onClick={() => update({ tipo: null })}>Todos</button>
          {TIPOS.map((t) => (
            <button key={t} className={`filter-btn${get('tipo') === t ? ' active' : ''}`}
              onClick={() => update({ tipo: t })}>
              {TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Gestión */}
      <div className="filter-section">
        <div className="filter-label">Tipo de operación</div>
        <div className="filter-btn-group">
          <button className={`filter-btn${!get('gestion') ? ' active' : ''}`}
            onClick={() => update({ gestion: null })}>Venta y Renta</button>
          {GESTIONES.map((g) => (
            <button key={g} className={`filter-btn${get('gestion') === g ? ' active' : ''}`}
              onClick={() => update({ gestion: g })}>
              {g === 'VENTA' ? 'Solo Venta' : 'Solo Renta'}
            </button>
          ))}
        </div>
      </div>

      {/* Departamento */}
      <div className="filter-section">
        <div className="filter-label">Departamento</div>
        <select value={get('departamento')} onChange={(e) => update({ departamento: e.target.value || null })}>
          <option value="">Todos los departamentos</option>
          {DEPTOS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Precio */}
      <div className="filter-section">
        <div className="filter-label">Precio (GTQ)</div>
        <div className="filter-price-row">
          <input type="number" placeholder="Mínimo" value={get('precioMin')}
            onChange={(e) => update({ precioMin: e.target.value || null })} min={0} />
          <input type="number" placeholder="Máximo" value={get('precioMax')}
            onChange={(e) => update({ precioMax: e.target.value || null })} min={0} />
        </div>
      </div>

      {/* Habitaciones */}
      <div className="filter-section">
        <div className="filter-label">Habitaciones mínimas</div>
        <select value={get('habitacionesMin')} onChange={(e) => update({ habitacionesMin: e.target.value || null })}>
          <option value="">Cualquier cantidad</option>
          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
      </div>

      {/* Clear */}
      {(get('tipo') || get('gestion') || get('departamento') || get('precioMin') || get('precioMax') || get('habitacionesMin')) && (
        <button className="filter-clear" onClick={() => router.push(pathname)}>
          Limpiar filtros
        </button>
      )}
    </aside>
  );
}
