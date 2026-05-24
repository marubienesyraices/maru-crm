import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClientes, useClientesStats } from '../../hooks/useClientes';
import ImportModal from '../../components/ImportModal';
import './Clients.css';

const ORIGEN_LABELS: Record<string, string> = {
  PORTAL_WEB: '🌐 Portal', REFERIDO: '🤝 Referido', LLAMADA: '📞 Llamada',
  WHATSAPP: '💬 WhatsApp', REDES_SOCIALES: '📱 Redes', FERIA: '🏪 Feria', OTRO: '📋 Otro',
};

const ORIGEN_COLORS: Record<string, string> = {
  PORTAL_WEB: '#3b82f6', REFERIDO: '#22c55e', LLAMADA: '#f59e0b',
  WHATSAPP: '#25D366', REDES_SOCIALES: '#8b5cf6', FERIA: '#ef4444', OTRO: '#64748b',
};

type RolFiltro = '' | 'propietarios' | 'clientes';

export default function ClientsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState('');
  const [rolFiltro, setRolFiltro] = useState<RolFiltro>(
    searchParams.get('esPropietario') === 'true' ? 'propietarios' : ''
  );
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);

  const esPropietarioFilter = rolFiltro === 'propietarios' ? true : rolFiltro === 'clientes' ? false : undefined;

  const { data: result, isLoading: loading, isError } = useClientes({
    busqueda,
    origen,
    esPropietario: esPropietarioFilter,
    page,
  });
  const { data: stats } = useClientesStats();

  const clientes: any[] = result?.data ?? [];
  const meta = result?.meta ?? { total: 0, totalPages: 1 };

  const handleRolChange = (val: RolFiltro) => { setRolFiltro(val); setPage(1); };

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div>
          <h1>Contactos</h1>
          <p>
            {meta.total} contactos
            {stats && ` · ${stats.propietarios ?? 0} propietarios`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/pipeline')}>📊 Pipeline</button>
          <button className="btn btn-ghost" onClick={() => setShowImport(true)}>⬆ Importar CSV</button>
          <button className="btn btn-primary" onClick={() => navigate('/clientes/nuevo')}>+ Nuevo Contacto</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="clients-stats">
          {stats.porOrigen?.map((o: any) => (
            <div key={o.origen} className="client-stat-chip" style={{ borderColor: ORIGEN_COLORS[o.origen] || '#64748b' }}>
              <span>{ORIGEN_LABELS[o.origen] || o.origen}</span>
              <strong>{o._count}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="clients-filters">
        <div className="clients-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            placeholder="Buscar por nombre, email, teléfono o DPI..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
          />
        </div>
        <select value={rolFiltro} onChange={(e) => handleRolChange(e.target.value as RolFiltro)}>
          <option value="">Todos los contactos</option>
          <option value="propietarios">Solo propietarios</option>
          <option value="clientes">Solo compradores/arrendatarios</option>
        </select>
        <select value={origen} onChange={(e) => { setOrigen(e.target.value); setPage(1); }}>
          <option value="">Todos los orígenes</option>
          {Object.entries(ORIGEN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="page-loading"><div className="spinner" /><span>Cargando contactos...</span></div>
      ) : isError ? (
        <div className="page-error-state">
          <div className="page-error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3>Error al cargar contactos</h3>
          <p>No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      ) : clientes.length === 0 ? (
        <div className="page-empty-state">
          <div className="page-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3>{busqueda || origen || rolFiltro ? 'Sin resultados' : 'Sin contactos'}</h3>
          <p>
            {busqueda || origen || rolFiltro
              ? 'Ningún contacto coincide con los filtros aplicados.'
              : 'Agrega tu primer contacto para iniciar el pipeline.'}
          </p>
          {!busqueda && !origen && !rolFiltro && (
            <button className="btn btn-primary" onClick={() => navigate('/clientes/nuevo')}>+ Nuevo Contacto</button>
          )}
        </div>
      ) : (
        <div className="clients-grid">
          {clientes.map((c) => (
            <div key={c.id} className="client-card" onClick={() => navigate(`/clientes/${c.id}`)}>
              <div className="client-card-header">
                <div className="client-avatar">{c.nombre[0]}</div>
                <div>
                  <div className="client-name">
                    {c.nombre}
                    {c.es_propietario && (
                      <span className="client-badge-propietario" title="Propietario">🏠</span>
                    )}
                  </div>
                  {c.email && <div className="client-contact">{c.email}</div>}
                  {c.telefono && <div className="client-contact">📞 {c.telefono}</div>}
                </div>
              </div>
              <div className="client-card-footer">
                <span className="client-origen-chip" style={{ color: ORIGEN_COLORS[c.origen] }}>
                  {ORIGEN_LABELS[c.origen] || c.origen}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c._count?.propiedades > 0 && (
                    <span className="client-intereses-count">🏠 {c._count.propiedades}</span>
                  )}
                  {c._count?.intereses > 0 && (
                    <span className="client-intereses-count">👁 {c._count.intereses}</span>
                  )}
                </div>
              </div>
              {c.agente && (
                <div className="client-agent">
                  <div className="client-agent-dot" style={{ background: 'var(--accent-gradient)' }}>{c.agente.nombre[0]}</div>
                  {c.agente.nombre}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <ImportModal entity="clientes" onClose={() => setShowImport(false)} onSuccess={() => setPage(1)} />
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="clients-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span>{page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}
