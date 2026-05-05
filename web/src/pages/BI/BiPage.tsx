import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Bi.css';

type Tab = 'resumen' | 'agentes' | 'propiedades';

const FUNNEL_COLORS: Record<string, string> = {
  NUEVO: '#64748b', CONTACTADO: '#3b82f6', INTERESADO: '#f59e0b',
  EN_NEGOCIACION: '#8b5cf6', GANADO: '#22c55e', PERDIDO: '#ef4444',
};

const ESTADO_LABELS: Record<string, string> = {
  NUEVO: 'Nuevo', CONTACTADO: 'Contactado', INTERESADO: 'Interesado',
  EN_NEGOCIACION: 'En negociación', GANADO: 'Ganado', PERDIDO: 'Perdido',
};

function fmtMoney(v: number) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(v);
}

function fmtPct(v: number) { return `${v}%`; }

// ─── Resumen Tab ─────────────────────────────────────────────────────────────

function ResumenTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<any>(`/api/bi/resumen?${params}`, { token });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Calculando métricas…</span></div>;
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const maxFunnel = Math.max(...(data.embudo || []).map((e: any) => e.count), 1);

  return (
    <>
      <div className="bi-kpis">
        <div className="bi-kpi">
          <span className="bi-kpi-label">Deals ganados</span>
          <span className="bi-kpi-value">{data.ganados}</span>
          <span className="bi-kpi-sub">{data.perdidos} perdidos en el período</span>
        </div>
        <div className="bi-kpi">
          <span className="bi-kpi-label">Tasa de conversión</span>
          <span className="bi-kpi-value">{fmtPct(data.tasaConversion)}</span>
          <span className="bi-kpi-sub">Ganados / (ganados + perdidos)</span>
        </div>
        <div className="bi-kpi">
          <span className="bi-kpi-label">Ingresos comisiones</span>
          <span className="bi-kpi-value" style={{ fontSize: '1.25rem' }}>{fmtMoney(data.ingresosTotales)}</span>
          <span className="bi-kpi-sub">Cierres en el período</span>
        </div>
        <div className="bi-kpi">
          <span className="bi-kpi-label">Visitas realizadas</span>
          <span className="bi-kpi-value">{data.visitasRealizadas}</span>
          <span className="bi-kpi-sub">{data.interacciones} interacciones</span>
        </div>
        <div className="bi-kpi">
          <span className="bi-kpi-label">Brochures descargados</span>
          <span className="bi-kpi-value">{data.brochures}</span>
          <span className="bi-kpi-sub">En el período</span>
        </div>
      </div>

      <div className="bi-section">
        <h3>Embudo de ventas (total acumulado)</h3>
        {(data.embudo || []).map((row: any) => (
          <div className="funnel-row" key={row.estado}>
            <span className="funnel-label">{ESTADO_LABELS[row.estado] ?? row.estado}</span>
            <div className="funnel-bar-wrap">
              <div
                className="funnel-bar"
                style={{ width: `${Math.round((row.count / maxFunnel) * 100)}%`, background: FUNNEL_COLORS[row.estado] ?? '#64748b' }}
              />
            </div>
            <span className="funnel-count">{row.count}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Datos en caché · actualizado {new Date(data.cacheAt).toLocaleTimeString('es-GT')}
      </p>
    </>
  );
}

// ─── Agentes Tab ─────────────────────────────────────────────────────────────

type SortKey = 'nombre' | 'ganados' | 'activos' | 'tasaConversion' | 'comisionTotal' | 'visitasRealizadas' | 'numInteracciones';

function AgentesTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('ganados');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<any>(`/api/bi/agentes?${params}`, { token });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sort === key) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDir('desc'); }
  };

  const handleExport = async () => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const res = await fetch(`${API}/api/bi/export/agentes?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Error al exportar');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `agentes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Cargando agentes…</span></div>;
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const sorted = [...(data.agentes || [])].sort((a: any, b: any) => {
    const va = a[sort]; const vb = b[sort];
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return dir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => sort !== k ? <span> ↕</span> : dir === 'desc' ? <span> ↓</span> : <span> ↑</span>;

  return (
    <div className="bi-section">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Desempeño por agente</h3>
        <button className="btn btn-ghost bi-export-btn" onClick={handleExport}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar XLSX
        </button>
      </div>
      <div className="bi-table-wrap">
        <table className="bi-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('nombre')}>Agente <SortIcon k="nombre" /></th>
              <th onClick={() => handleSort('ganados')}>Ganados <SortIcon k="ganados" /></th>
              <th onClick={() => handleSort('activos')}>Activos <SortIcon k="activos" /></th>
              <th onClick={() => handleSort('tasaConversion')}>Conversión <SortIcon k="tasaConversion" /></th>
              <th onClick={() => handleSort('comisionTotal')}>Comisión <SortIcon k="comisionTotal" /></th>
              <th onClick={() => handleSort('visitasRealizadas')}>Visitas <SortIcon k="visitasRealizadas" /></th>
              <th onClick={() => handleSort('numInteracciones')}>Interact. <SortIcon k="numInteracciones" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a: any) => (
              <tr key={a.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{a.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.rol}</div>
                </td>
                <td>{a.ganados}</td>
                <td>{a.activos}</td>
                <td>
                  <div className="bi-conv-bar">
                    <div className="bi-conv-track">
                      <div className="bi-conv-fill" style={{ width: `${a.tasaConversion}%` }} />
                    </div>
                    <span>{a.tasaConversion}%</span>
                  </div>
                </td>
                <td>{fmtMoney(a.comisionTotal)}</td>
                <td>{a.visitasRealizadas}</td>
                <td>{a.numInteracciones}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Sin agentes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Top Propiedades Tab ──────────────────────────────────────────────────────

function PropiedadesTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '15' });
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<any>(`/api/bi/propiedades/top?${params}`, { token });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Cargando propiedades…</span></div>;
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const props: any[] = data.propiedades || [];
  const maxScore = Math.max(...props.map((p: any) => p.leads + p.visitas + p.interacciones), 1);

  return (
    <div className="bi-section">
      <h3>Top propiedades por actividad</h3>
      <div className="bi-table-wrap">
        <table className="bi-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Propiedad</th>
              <th>Tipo</th>
              <th>Agente</th>
              <th>Leads</th>
              <th>Visitas</th>
              <th>Interact.</th>
              <th>Brochures</th>
              <th>Actividad</th>
            </tr>
          </thead>
          <tbody>
            {props.map((p: any, i: number) => {
              const score = p.leads + p.visitas + p.interacciones;
              const pct = Math.round((score / maxScore) * 100);
              const cls = pct >= 66 ? 'bi-score-high' : pct >= 33 ? 'bi-score-mid' : 'bi-score-low';
              return (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', width: 32 }}>{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.titulo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.codigo}</div>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>{p.tipo}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{p.agente ?? '—'}</td>
                  <td>{p.leads}</td>
                  <td>{p.visitas}</td>
                  <td>{p.interacciones}</td>
                  <td>{p.brochures}</td>
                  <td>
                    <span className={`bi-score ${cls}`}>{score}</span>
                  </td>
                </tr>
              );
            })}
            {props.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Sin datos en el período</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BiPage() {
  const { accessToken } = useAuthStore();
  const [tab, setTab] = useState<Tab>('resumen');

  // Default: current month
  const today = new Date();
  const defaultDesde = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const defaultHasta = today.toISOString().slice(0, 10);

  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);

  const sharedProps = { desde, hasta, token: accessToken! };

  return (
    <div className="bi-page">
      <div className="bi-header">
        <h1>Reportes y BI</h1>
        <div className="bi-filters">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} max={hasta} />
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} min={desde} max={defaultHasta} />
        </div>
      </div>

      <div className="bi-tabs">
        <button className={`bi-tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>Resumen</button>
        <button className={`bi-tab ${tab === 'agentes' ? 'active' : ''}`} onClick={() => setTab('agentes')}>Agentes</button>
        <button className={`bi-tab ${tab === 'propiedades' ? 'active' : ''}`} onClick={() => setTab('propiedades')}>Top Propiedades</button>
      </div>

      {tab === 'resumen' && <ResumenTab {...sharedProps} />}
      {tab === 'agentes' && <AgentesTab {...sharedProps} />}
      {tab === 'propiedades' && <PropiedadesTab {...sharedProps} />}
    </div>
  );
}
