import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Clients.css';

const ESTADO_COLORS: Record<string, string> = {
  NUEVO: '#64748b', CONTACTADO: '#3b82f6', INTERESADO: '#f59e0b',
  EN_NEGOCIACION: '#8b5cf6', GANADO: '#22c55e', PERDIDO: '#ef4444',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try { setCliente(await apiRequest(`/api/clientes/${id}`, { token: accessToken! })); }
    catch { } finally { setLoading(false); }
  }, [id, accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);

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
      </div>

      <div className="prop-detail-grid">
        <div className="prop-detail-section">
          <h3>Información</h3>
          <div className="prop-detail-row"><span>Origen</span><strong>{cliente.origen}</strong></div>
          {cliente.dpi && <div className="prop-detail-row"><span>DPI</span><strong>{cliente.dpi}</strong></div>}
          {cliente.agente && <div className="prop-detail-row"><span>Agente</span><strong>{cliente.agente.nombre}</strong></div>}
          {cliente.notas && <div className="prop-detail-row"><span>Notas</span><strong>{cliente.notas}</strong></div>}
        </div>
      </div>

      <div className="prop-detail-section">
        <h3>Propiedades de Interés ({cliente.intereses?.length || 0})</h3>
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
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin propiedades vinculadas aún</p>}
      </div>
    </div>
  );
}
