'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const TIPOS = ['CASA', 'APARTAMENTO', 'LOCAL_COMERCIAL', 'OFICINA', 'BODEGA', 'TERRENO', 'FINCA'];
const GESTIONES = ['VENTA', 'RENTA'];
const DEPTOS = ['Guatemala', 'Sacatepéquez', 'Escuintla', 'Quetzaltenango', 'Petén', 'Izabal', 'Alta Verapaz'];

const TIPO_LABELS: Record<string, string> = {
  CASA: 'Casa', APARTAMENTO: 'Apartamento', LOCAL_COMERCIAL: 'Local comercial',
  OFICINA: 'Oficina', BODEGA: 'Bodega', TERRENO: 'Terreno', FINCA: 'Finca',
};

export default function PropertyFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on ESC
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const get = (key: string) => searchParams.get(key) ?? '';

  const update = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilters = !!(get('tipo') || get('gestion') || get('departamento') || get('precioMin') || get('precioMax') || get('habitacionesMin'));
  const activeCount = [get('tipo'), get('gestion'), get('departamento'), get('precioMin') || get('precioMax'), get('habitacionesMin')]
    .filter(Boolean).length;

  const filterContent = (
    <>
      {/* Tipo */}
      <div className="filter-section">
        <div className="filter-label">Tipo de propiedad</div>
        <div className="filter-btn-group">
          <button className={`filter-btn${!get('tipo') ? ' active' : ''}`} onClick={() => update({ tipo: null })}>Todos</button>
          {TIPOS.map((t) => (
            <button key={t} className={`filter-btn${get('tipo') === t ? ' active' : ''}`} onClick={() => update({ tipo: t })}>
              {TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Gestión */}
      <div className="filter-section">
        <div className="filter-label">Tipo de operación</div>
        <div className="filter-btn-group">
          <button className={`filter-btn${!get('gestion') ? ' active' : ''}`} onClick={() => update({ gestion: null })}>Venta y Renta</button>
          {GESTIONES.map((g) => (
            <button key={g} className={`filter-btn${get('gestion') === g ? ' active' : ''}`} onClick={() => update({ gestion: g })}>
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
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
      </div>

      {hasFilters && (
        <button className="filter-clear" onClick={() => router.push(pathname)}>
          Limpiar filtros
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Mobile trigger (rendered via portal so it's always visible) */}
      {mounted && createPortal(
        <button
          className="filter-mobile-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir filtros"
          aria-expanded={mobileOpen}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Filtros
          {activeCount > 0 && <span className="filter-active-badge">{activeCount}</span>}
        </button>,
        document.body,
      )}

      {/* Backdrop */}
      {mounted && mobileOpen && createPortal(
        <div
          className="filter-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />,
        document.body,
      )}

      {/* Sidebar / drawer */}
      <aside
        className={`portal-sidebar${mobileOpen ? ' mobile-open' : ''}`}
        aria-label="Filtros de búsqueda"
      >
        {/* Mobile header */}
        <div className="filter-mobile-header">
          <strong>Filtros</strong>
          <button
            className="filter-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar filtros"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Filter content */}
        {filterContent}

        {/* Mobile apply button */}
        <button className="filter-apply-btn" onClick={() => setMobileOpen(false)}>
          Ver resultados
        </button>
      </aside>
    </>
  );
}
