import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import '../Clients/Clients.css';

const COLUMNS = [
  { key: 'NUEVO', label: 'Nuevo', color: '#64748b' },
  { key: 'CONTACTADO', label: 'Contactado', color: '#3b82f6' },
  { key: 'INTERESADO', label: 'Interesado', color: '#f59e0b' },
  { key: 'EN_NEGOCIACION', label: 'En Negociación', color: '#8b5cf6' },
  { key: 'GANADO', label: 'Ganado', color: '#22c55e' },
  { key: 'PERDIDO', label: 'Perdido', color: '#ef4444' },
];

const NEXT_ESTADO: Record<string, string[]> = {
  NUEVO: ['CONTACTADO', 'PERDIDO'],
  CONTACTADO: ['INTERESADO', 'PERDIDO'],
  INTERESADO: ['EN_NEGOCIACION', 'PERDIDO'],
  EN_NEGOCIACION: ['GANADO', 'PERDIDO'],
  GANADO: [],
  PERDIDO: ['NUEVO'],
};

export default function PipelinePage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [pipeline, setPipeline] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchPipeline = useCallback(async () => {
    try {
      const data = await apiRequest<Record<string, any[]>>('/api/pipeline', { token: accessToken! });
      setPipeline(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const handleMove = async (id: string, nuevoEstado: string) => {
    let body: any = { nuevoEstado };
    if (nuevoEstado === 'PERDIDO') {
      const motivo = prompt('Motivo de pérdida:');
      if (!motivo) return;
      body.motivoPerdida = motivo;
    }
    try {
      await apiRequest(`/api/pipeline/${id}/estado`, { method: 'PATCH', body, token: accessToken! });
      fetchPipeline();
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="clients-loading"><div className="spinner" /><span>Cargando pipeline...</span></div>;

  return (
    <div className="pipeline-page">
      <div className="pipeline-header">
        <div>
          <h1>Pipeline de Ventas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 2 }}>
            Gestiona el flujo de interés cliente → propiedad
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/clientes')}>← Clientes</button>
      </div>

      <div className="pipeline-board">
        {COLUMNS.map((col) => {
          const items = pipeline[col.key] || [];
          return (
            <div key={col.key} className="pipeline-column">
              <div className="pipeline-col-header">
                <span className="pipeline-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="pipeline-col-count" style={{ background: col.color }}>{items.length}</span>
              </div>
              <div className="pipeline-col-items">
                {items.map((item) => {
                  const next = NEXT_ESTADO[item.estado] || [];
                  return (
                    <div key={item.id} className="pipeline-card">
                      <div className="pipeline-card-client" onClick={() => navigate(`/clientes/${item.cliente?.id}`)}>
                        {item.cliente?.nombre}
                      </div>
                      <div className="pipeline-card-property" onClick={() => navigate(`/propiedades/${item.propiedad?.id}`)}>
                        {item.propiedad?.codigo} — {item.propiedad?.titulo}
                      </div>
                      <div className="pipeline-card-footer">
                        <span className={`pipeline-nivel pipeline-nivel-${item.nivel_interes}`}>
                          {item.nivel_interes}
                        </span>
                        {next.length > 0 && (
                          <div className="pipeline-card-actions">
                            {next.map((est) => (
                              <button key={est} onClick={() => handleMove(item.id, est)}>
                                → {est === 'EN_NEGOCIACION' ? 'Negociar' : est === 'PERDIDO' ? '✕' : est.charAt(0) + est.slice(1).toLowerCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', opacity: 0.5 }}>
                    Sin items
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
