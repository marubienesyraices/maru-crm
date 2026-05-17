import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePropietarios } from '../../hooks/usePropietarios';
import './Propietarios.css';

export default function PropietariosListPage() {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const { data: propietarios = [], isLoading, isError } = usePropietarios(busqueda);

  return (
    <div className="propietarios-page">
      {/* ── Header ── */}
      <div className="propietarios-header">
        <div>
          <h1>Propietarios</h1>
          <p>{propietarios.length} propietario{propietarios.length !== 1 ? 's' : ''} registrado{propietarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/propietarios/nuevo')}>
          + Nuevo Propietario
        </button>
      </div>

      {/* ── Search ── */}
      <div className="propietarios-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          placeholder="Buscar por nombre, email o DPI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="page-loading"><div className="spinner" /><span>Cargando propietarios...</span></div>
      ) : isError ? (
        <div className="page-error-state">
          <p>Error al cargar propietarios.</p>
        </div>
      ) : propietarios.length === 0 ? (
        <div className="propietarios-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <h3>{busqueda ? 'Sin resultados' : 'No hay propietarios aún'}</h3>
          <p>{busqueda ? `Ningún propietario coincide con "${busqueda}"` : 'Registra el primer propietario para comenzar.'}</p>
          {!busqueda && (
            <button className="btn btn-primary" onClick={() => navigate('/propietarios/nuevo')}>
              + Nuevo Propietario
            </button>
          )}
        </div>
      ) : (
        <div className="propietarios-grid">
          {propietarios.map((p: any) => (
            <div
              key={p.id}
              className="propietario-card"
              onClick={() => navigate(`/propietarios/${p.id}/editar`)}
            >
              <div className="propietario-card-header">
                <div className="propietario-avatar">
                  {p.nombre[0].toUpperCase()}
                </div>
                <div>
                  <div className="propietario-nombre">{p.nombre}</div>
                  {p.nit && <div className="propietario-nit">NIT: {p.nit}</div>}
                </div>
              </div>

              <div className="propietario-card-info">
                {p.telefono && (
                  <div className="propietario-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.5 2 2 0 0 1 3.59 2.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {p.telefono}
                  </div>
                )}
                {p.email && (
                  <div className="propietario-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {p.email}
                  </div>
                )}
                {p.dpi && (
                  <div className="propietario-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                    DPI: {p.dpi}
                  </div>
                )}
                {p.direccion && (
                  <div className="propietario-info-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    {p.direccion}
                  </div>
                )}
              </div>

              <div className="propietario-card-footer">
                <span className="propietario-props-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  {p._count?.propiedades ?? 0} propiedad{(p._count?.propiedades ?? 0) !== 1 ? 'es' : ''}
                </span>
                <button className="propietario-edit-btn" onClick={(e) => { e.stopPropagation(); navigate(`/propietarios/${p.id}/editar`); }}>
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
