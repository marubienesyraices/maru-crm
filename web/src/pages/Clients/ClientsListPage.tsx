import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
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

export default function ClientsListPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [clientes, setClientes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });
  const [showImport, setShowImport] = useState(false);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set('busqueda', busqueda);
      if (origen) params.set('origen', origen);
      params.set('page', String(page));
      params.set('limit', '20');

      const [list, s] = await Promise.all([
        apiRequest<any>(`/api/clientes?${params}`, { token: accessToken! }),
        apiRequest<any>('/api/clientes/stats', { token: accessToken! }),
      ]);
      setClientes(list.data);
      setMeta(list.meta);
      setStats(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, busqueda, origen, page]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  return (
    <div className="clients-page">
      <div className="clients-header">
        <div>
          <h1>Clientes</h1>
          <p>{meta.total} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/pipeline')}>📊 Pipeline</button>
          <button className="btn btn-ghost" onClick={() => setShowImport(true)}>⬆ Importar CSV</button>
          <button className="btn btn-primary" onClick={() => navigate('/clientes/nuevo')}>+ Nuevo Cliente</button>
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
            placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
          />
        </div>
        <select value={origen} onChange={(e) => { setOrigen(e.target.value); setPage(1); }}>
          <option value="">Todos los orígenes</option>
          {Object.entries(ORIGEN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="clients-loading"><div className="spinner" /><span>Cargando...</span></div>
      ) : clientes.length === 0 ? (
        <div className="clients-empty">
          <h3>No hay clientes</h3>
          <p>Agrega tu primer cliente para iniciar el pipeline</p>
          <button className="btn btn-primary" onClick={() => navigate('/clientes/nuevo')}>+ Nuevo Cliente</button>
        </div>
      ) : (
        <div className="clients-grid">
          {clientes.map((c) => (
            <div key={c.id} className="client-card" onClick={() => navigate(`/clientes/${c.id}`)}>
              <div className="client-card-header">
                <div className="client-avatar">{c.nombre[0]}</div>
                <div>
                  <div className="client-name">{c.nombre}</div>
                  {c.email && <div className="client-contact">{c.email}</div>}
                  {c.telefono && <div className="client-contact">📞 {c.telefono}</div>}
                </div>
              </div>
              <div className="client-card-footer">
                <span className="client-origen-chip" style={{ color: ORIGEN_COLORS[c.origen] }}>
                  {ORIGEN_LABELS[c.origen] || c.origen}
                </span>
                <span className="client-intereses-count">{c._count?.intereses || 0} propiedades</span>
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
        <ImportModal entity="clientes" onClose={() => setShowImport(false)} onSuccess={fetchClientes} />
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
