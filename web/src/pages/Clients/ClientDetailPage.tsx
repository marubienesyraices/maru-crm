import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Clients.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ESTADO_COLORS: Record<string, string> = {
  NUEVO: '#64748b', CONTACTADO: '#3b82f6', INTERESADO: '#f59e0b',
  EN_NEGOCIACION: '#8b5cf6', GANADO: '#22c55e', PERDIDO: '#ef4444',
};

function formatPrice(v: any, currency = 'GTQ') {
  if (!v) return '—';
  try {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 0 }).format(parseFloat(v));
  } catch { return `${currency} ${parseFloat(v).toLocaleString('es-GT')}`; }
}

// ─── Nuevo Trámite Modal ──────────────────────────────────────

function NuevoTramiteModal({
  clienteId,
  accessToken,
  onSaved,
  onClose,
}: {
  clienteId: string;
  accessToken: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [propiedades, setPropiedades] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [nivelInteres, setNivelInteres] = useState('MEDIO');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingProps, setLoadingProps] = useState(true);

  useEffect(() => {
    apiRequest<any>('/api/propiedades?limit=100', { token: accessToken })
      .then((res) => setPropiedades(res.data ?? res))
      .catch(() => {})
      .finally(() => setLoadingProps(false));
  }, [accessToken]);

  const filtered = search
    ? propiedades.filter((p) =>
        `${p.codigo} ${p.titulo} ${p.tipo}`.toLowerCase().includes(search.toLowerCase()),
      )
    : propiedades;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Selecciona una propiedad'); return; }
    setSaving(true); setError('');
    try {
      await apiRequest('/api/pipeline', {
        method: 'POST',
        token: accessToken,
        body: { clienteId, propiedadId: selected, nivelInteres, notas: notas || undefined },
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const selectedProp = propiedades.find((p) => p.id === selected);

  return (
    <div className="pipeline-modal-overlay" onClick={onClose}>
      <div className="pipeline-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h3>Nuevo Trámite</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          Vincula una propiedad a este cliente para iniciar el seguimiento en el pipeline.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Property picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Propiedad *
            </label>
            <input
              className="pipeline-modal-input"
              style={{ minHeight: 'unset', resize: 'none', height: 40, padding: '0 14px' }}
              placeholder="Buscar por código, título o tipo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(''); }}
            />
            {!selectedProp && (
              <div style={{
                maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-subtle)',
                borderRadius: 8, marginTop: 4, background: 'var(--bg-card)',
              }}>
                {loadingProps ? (
                  <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Cargando...</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Sin resultados</div>
                ) : filtered.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setSelected(p.id); setSearch(''); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.codigo} — {p.titulo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.tipo?.replace('_', ' ')} · {p.gestion} · {p.estado}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedProp && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, marginTop: 4,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedProp.codigo} — {selectedProp.titulo}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedProp.tipo?.replace('_', ' ')} · {selectedProp.gestion}
                  </div>
                </div>
                <button
                  type="button" onClick={() => setSelected('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
                >✕</button>
              </div>
            )}
          </div>

          {/* Nivel interés */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Nivel de interés
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['BAJO', 'MEDIO', 'ALTO', 'MUY_ALTO'].map((n) => (
                <button
                  key={n} type="button"
                  onClick={() => setNivelInteres(n)}
                  style={{
                    padding: '5px 12px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 600,
                    border: `1px solid ${nivelInteres === n ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                    background: nivelInteres === n ? 'rgba(59,130,246,0.12)' : 'transparent',
                    color: nivelInteres === n ? 'var(--accent-blue)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {n.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Notas iniciales
            </label>
            <textarea
              className="pipeline-modal-input"
              style={{ minHeight: 70 }}
              placeholder="Observaciones iniciales del trámite..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
              color: '#fca5a5', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div className="pipeline-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !selected}>
              {saving ? 'Creando...' : '+ Crear Trámite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [cliente, setCliente] = useState<any>(null);
  const [matching, setMatching] = useState<any[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNuevoTramite, setShowNuevoTramite] = useState(false);

  const fetch_ = useCallback(async () => {
    try { setCliente(await apiRequest(`/api/clientes/${id}`, { token: accessToken! })); }
    catch { } finally { setLoading(false); }
  }, [id, accessToken]);

  const fetchMatching = useCallback(async () => {
    setLoadingMatch(true);
    try {
      const data = await apiRequest<any[]>(`/api/clientes/${id}/matching`, { token: accessToken! });
      setMatching(data);
    } catch { } finally { setLoadingMatch(false); }
  }, [id, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const hasPreferences = cliente && (
    cliente.tipo_interes || cliente.gestion_interes ||
    cliente.presupuesto_max || cliente.zona_interes || cliente.habitaciones_min
  );

  useEffect(() => {
    if (hasPreferences) fetchMatching();
  }, [hasPreferences, fetchMatching]);

  if (loading) return <div className="clients-loading"><div className="spinner" /><span>Cargando...</span></div>;
  if (!cliente) return <div className="clients-empty"><h3>Cliente no encontrado</h3></div>;

  return (
    <div className="clients-page" style={{ maxWidth: 860 }}>
      <button className="btn btn-ghost" onClick={() => navigate('/clientes')}>← Volver</button>
      <div className="clients-header">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className="client-avatar" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>{cliente.nombre[0]}</div>
          <div>
            <h1>{cliente.nombre}</h1>
            <p>{cliente.email || 'Sin email'} · {cliente.telefono || 'Sin teléfono'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8125rem' }}
            onClick={() => setShowNuevoTramite(true)}
          >
            + Nuevo Trámite
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(`/clientes/${id}/editar`)} style={{ fontSize: '0.8125rem' }}>
            Editar
          </button>
        </div>
      </div>

      <div className="prop-detail-grid">
        {/* Info básica */}
        <div className="prop-detail-section">
          <h3>Información</h3>
          <div className="prop-detail-row"><span>Origen</span><strong>{cliente.origen}</strong></div>
          {cliente.dpi && <div className="prop-detail-row"><span>DPI</span><strong>{cliente.dpi}</strong></div>}
          {cliente.agente && <div className="prop-detail-row"><span>Agente</span><strong>{cliente.agente.nombre}</strong></div>}
          {cliente.notas && <div className="prop-detail-row"><span>Notas</span><strong>{cliente.notas}</strong></div>}
        </div>

        {/* Preferencias */}
        {hasPreferences && (
          <div className="prop-detail-section">
            <h3>Preferencias de búsqueda</h3>
            {cliente.tipo_interes && <div className="prop-detail-row"><span>Tipo</span><strong>{cliente.tipo_interes.replace('_', ' ')}</strong></div>}
            {cliente.gestion_interes && <div className="prop-detail-row"><span>Gestión</span><strong>{cliente.gestion_interes}</strong></div>}
            {cliente.presupuesto_max && <div className="prop-detail-row"><span>Presupuesto máx.</span><strong>{formatPrice(cliente.presupuesto_max)}</strong></div>}
            {cliente.zona_interes && <div className="prop-detail-row"><span>Zona</span><strong>{cliente.zona_interes}</strong></div>}
            {cliente.habitaciones_min != null && <div className="prop-detail-row"><span>Habitaciones mín.</span><strong>{cliente.habitaciones_min}</strong></div>}
          </div>
        )}
      </div>

      {/* Propiedades de interés (pipeline) */}
      <div className="prop-detail-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>Propiedades de Interés ({cliente.intereses?.length || 0})</h3>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem' }}
            onClick={() => navigate('/pipeline')}
          >
            Ver pipeline →
          </button>
        </div>
        {cliente.intereses?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cliente.intereses.map((i: any) => (
              <div key={i.id} className="pipeline-card" onClick={() => navigate(`/propiedades/${i.propiedad.id}`)}>
                <div className="pipeline-card-client">{i.propiedad.codigo} — {i.propiedad.titulo}</div>
                <div className="pipeline-card-footer">
                  <span className={`pipeline-nivel pipeline-nivel-${i.nivel_interes}`}>{i.nivel_interes}</span>
                  <span style={{ color: ESTADO_COLORS[i.estado], fontWeight: 600, fontSize: '0.8125rem' }}>{i.estado.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>Sin propiedades vinculadas aún</p>
            <button className="btn btn-primary" style={{ fontSize: '0.8125rem' }} onClick={() => setShowNuevoTramite(true)}>
              + Vincular propiedad
            </button>
          </div>
        )}
      </div>

      {/* Propiedades sugeridas por matching */}
      {hasPreferences && (
        <div className="prop-detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>Propiedades disponibles que coinciden</h3>
            <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={fetchMatching}>
              Actualizar
            </button>
          </div>
          {loadingMatch ? (
            <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <div className="spinner" style={{ width: 16, height: 16 }} /> Buscando...
            </div>
          ) : matching.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay propiedades disponibles que coincidan con las preferencias</p>
          ) : (
            <div className="client-matching-grid">
              {matching.map((p: any) => (
                <div key={p.id} className="client-matching-card" onClick={() => navigate(`/propiedades/${p.id}`)}>
                  {p.imagenes?.[0] && (
                    <div className="client-matching-img">
                      <img src={`${API}${p.imagenes[0].url}`} alt={p.titulo} />
                    </div>
                  )}
                  <div className="client-matching-body">
                    <div className="client-matching-title">{p.titulo}</div>
                    <div className="client-matching-sub">{p.codigo} · {p.tipo.replace('_', ' ')} · {p.gestion}</div>
                    <div className="client-matching-price">
                      {p.precio_venta ? formatPrice(p.precio_venta, p.moneda) : ''}
                      {p.precio_venta && p.precio_renta ? ' / ' : ''}
                      {p.precio_renta ? `${formatPrice(p.precio_renta, p.moneda)}/mes` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Nuevo Trámite */}
      {showNuevoTramite && (
        <NuevoTramiteModal
          clienteId={id!}
          accessToken={accessToken!}
          onSaved={() => { fetch_(); fetchMatching(); }}
          onClose={() => setShowNuevoTramite(false)}
        />
      )}
    </div>
  );
}
