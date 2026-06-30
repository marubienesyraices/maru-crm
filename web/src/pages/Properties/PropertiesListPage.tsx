import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePropiedades, usePropiedadesStats } from '../../hooks/usePropiedades';
import ImportModal from '../../components/ImportModal';
import { useAuthStore } from '../../stores/authStore';
import './Properties.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const resolveUrl = (url: string) => url.startsWith('http') ? url : `${API}${url}`;

interface Propiedad {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  gestion: string;
  estado: string;
  precio_venta: string | null;
  precio_renta: string | null;
  moneda: string;
  pais: string | null;
  departamento: string | null;
  municipio: string | null;
  zona: string | null;
  habitaciones: number | null;
  banos: number | null;
  propietario: { id: string; nombre: string } | null;
  agente: { id: string; nombre: string } | null;
  imagenes: { url: string }[];
  _count: { imagenes: number; documentos: number };
}

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: '#64748b',
  DISPONIBLE: '#22c55e',
  RESERVADA: '#f59e0b',
  EN_NEGOCIACION: '#3b82f6',
  VENDIDA: '#8b5cf6',
  RENTADA: '#06b6d4',
  SUSPENDIDA: '#ef4444',
};

const TIPO_LABELS: Record<string, string> = {
  CASA: '🏠 Casa',
  APARTAMENTO: '🏢 Apartamento',
  TERRENO: '🌍 Terreno',
  LOCAL_COMERCIAL: '🏪 Local',
  OFICINA: '💼 Oficina',
  BODEGA: '📦 Bodega',
  FINCA: '🌾 Finca',
  EDIFICIO: '🏗️ Edificio',
  OTRO: '📋 Otro',
};

const GESTION_LABELS: Record<string, string> = {
  VENTA: 'Venta',
  RENTA: 'Renta',
  AMBAS: 'Venta/Renta',
};

function LimitPill({ current, limit, label }: { current: number; limit: number; label: string }) {
  const pct = limit > 0 ? current / limit : 0;
  const color = pct >= 1 ? '#ef4444' : pct >= 0.8 ? '#f59e0b' : '#22c55e';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
      background: `${color}18`, border: `1px solid ${color}40`, color,
    }}>
      {current} / {limit} {label}
    </span>
  );
}

function formatPrice(value: string | null, currency: string) {
  if (!value) return '—';
  const num = parseFloat(value);
  try {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: currency || 'GTQ',
      maximumFractionDigits: 0,
    }).format(num);
  } catch (e) {
    // Fallback if currency code is invalid
    return `${currency || 'GTQ'} ${num.toLocaleString('es-GT')}`;
  }
}

export default function PropertiesListPage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState({ tipo: '', gestion: '', estado: '', busqueda: '' });
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const { limitePropiedades } = useAuthStore();

  const { data: result, isLoading: loading, isError } = usePropiedades({ ...filtros, page });
  const { data: stats } = usePropiedadesStats();

  const propiedades: Propiedad[] = result?.data ?? [];
  const meta = result?.meta ?? { total: 0, page: 1, totalPages: 1 };

  const totalPropiedades: number = (stats as any)?.total ?? 0;
  const atPropLimit = limitePropiedades !== null && totalPropiedades >= limitePropiedades;

  return (
    <div className="properties-page">
      {/* Header */}
      <div className="props-header">
        <div>
          <h1>Propiedades</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {totalPropiedades} propiedades en inventario
            {limitePropiedades !== null && (
              <LimitPill current={totalPropiedades} limit={limitePropiedades} label="prop." />
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => setShowImport(true)}>⬆ Importar CSV</button>
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-primary"
              onClick={() => !atPropLimit && navigate('/propiedades/nueva')}
              disabled={atPropLimit}
              title={atPropLimit ? `Límite de ${limitePropiedades} propiedades alcanzado. Actualiza tu plan para agregar más.` : undefined}
              style={atPropLimit ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva Propiedad
            </button>
          </div>
        </div>
      </div>

      {atPropLimit && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red,#ef4444)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Has alcanzado el límite de <strong>{limitePropiedades} propiedades</strong> de tu plan. Contacta con soporte para actualizar tu plan.</span>
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="props-stats">
          {stats.porEstado.map((s: any) => (
            <div key={s.estado} className="props-stat-chip" style={{ borderColor: ESTADO_COLORS[s.estado] || '#64748b' }}>
              <span className="props-stat-dot" style={{ background: ESTADO_COLORS[s.estado] || '#64748b' }} />
              <span className="props-stat-label">{s.estado.replace('_', ' ')}</span>
              <span className="props-stat-count">{s._count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="props-filters">
        <div className="props-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por título, código o dirección..."
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          />
        </div>
        <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtros.gestion} onChange={(e) => setFiltros({ ...filtros, gestion: e.target.value })}>
          <option value="">Toda gestión</option>
          <option value="VENTA">Venta</option>
          <option value="RENTA">Renta</option>
          <option value="AMBAS">Ambas</option>
        </select>
        <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
          <option value="">Todos los estados</option>
          {Object.keys(ESTADO_COLORS).map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
          <span>Cargando propiedades...</span>
        </div>
      ) : isError ? (
        <div className="page-error-state">
          <div className="page-error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3>Error al cargar propiedades</h3>
          <p>No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      ) : propiedades.length === 0 ? (
        <div className="page-empty-state">
          <div className="page-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3>{filtros.busqueda || filtros.tipo || filtros.estado || filtros.gestion ? 'Sin resultados' : 'Sin propiedades'}</h3>
          <p>
            {filtros.busqueda || filtros.tipo || filtros.estado || filtros.gestion
              ? 'Ninguna propiedad coincide con los filtros aplicados.'
              : 'Agrega tu primera propiedad para comenzar.'}
          </p>
          {!filtros.busqueda && !filtros.tipo && !filtros.estado && !filtros.gestion && !atPropLimit && (
            <button className="btn btn-primary" onClick={() => navigate('/propiedades/nueva')}>Nueva Propiedad</button>
          )}
        </div>
      ) : (
        <>
          <div className="props-grid">
            {propiedades.map((prop) => (
              <div key={prop.id} className="prop-card" onClick={() => navigate(`/propiedades/${prop.id}`)}>
                {/* Image placeholder */}
                <div className="prop-card-img">
                  {prop.imagenes?.[0] ? (
                    <img
                      src={resolveUrl(prop.imagenes[0].url)}
                      alt={prop.titulo}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        // Find the next sibling (which is the placeholder) and show it
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  <div 
                    className="prop-card-img-placeholder" 
                    style={{ display: prop.imagenes?.[0] ? 'none' : 'flex' }}
                  >
                    <span>{TIPO_LABELS[prop.tipo]?.split(' ')[0] || '🏠'}</span>
                  </div>

                  <span className="prop-badge-estado" style={{ background: ESTADO_COLORS[prop.estado] }}>
                    {prop.estado.replace('_', ' ')}
                  </span>
                  <span className="prop-badge-gestion">{GESTION_LABELS[prop.gestion]}</span>
                </div>

                {/* Info */}
                <div className="prop-card-body">
                  <div className="prop-card-code">{prop.codigo}</div>
                  <h3 className="prop-card-title">{prop.titulo}</h3>

                  {(prop.departamento || prop.pais) && (
                    <div className="prop-card-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {[prop.zona && `Zona ${prop.zona}`, prop.municipio, prop.departamento, prop.pais].filter(Boolean).join(', ')}
                    </div>
                  )}

                  <div className="prop-card-price">
                    {prop.gestion !== 'RENTA' && prop.precio_venta && (
                      <span className="prop-price-main">{formatPrice(prop.precio_venta, prop.moneda)}</span>
                    )}
                    {prop.gestion !== 'VENTA' && prop.precio_renta && (
                      <span className="prop-price-rent">{formatPrice(prop.precio_renta, prop.moneda)}/mes</span>
                    )}
                  </div>

                  <div className="prop-card-features">
                    {prop.habitaciones != null && (
                      <span title="Habitaciones">🛏️ {prop.habitaciones}</span>
                    )}
                    {prop.banos != null && (
                      <span title="Baños">🚿 {prop.banos}</span>
                    )}
                  </div>

                  {prop.agente && (
                    <div className="prop-card-agent">
                      <div className="prop-card-agent-avatar">{prop.agente.nombre[0]}</div>
                      <span>{prop.agente.nombre}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="props-pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span>Página {page} de {meta.totalPages}</span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
      {showImport && (
        <ImportModal entity="propiedades" onClose={() => setShowImport(false)} onSuccess={() => setPage(1)} />
      )}
    </div>
  );
}
