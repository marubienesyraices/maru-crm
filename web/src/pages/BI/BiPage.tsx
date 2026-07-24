import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Bi.css';

type Tab = 'resumen' | 'agentes' | 'propiedades' | 'productividad' | 'comisiones' | 'heatmap';

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

interface ResumenData {
  ganados: number;
  perdidos: number;
  tasaConversion: number;
  ingresosTotales: number;
  visitasRealizadas: number;
  interacciones: number;
  brochures: number;
  embudo: { estado: string; count: number }[];
  cacheAt: string;
}

function ResumenTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setIsError(false);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<ResumenData>(`/api/bi/resumen?${params}`, { token });
      setData(res);
    } catch { setIsError(true); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => {
    queueMicrotask(() => { fetchData(); });
  }, [fetchData]);

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Calculando métricas…</span></div>;
  if (isError) return (
    <div className="page-error-state">
      <div className="page-error-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3>Error al cargar el resumen</h3>
      <p>No se pudieron obtener las métricas. Verifica tu conexión e intenta de nuevo.</p>
      <button className="btn btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const maxFunnel = Math.max(...data.embudo.map((e) => e.count), 1);

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
        {data.embudo.map((row) => (
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

interface AgenteBiStats {
  id: string;
  nombre: string;
  rol: string;
  ganados: number;
  activos: number;
  tasaConversion: number;
  comisionTotal: number;
  visitasRealizadas: number;
  numInteracciones: number;
}

interface AgentesData {
  agentes: AgenteBiStats[];
}

function SortIcon({ k, sort, dir }: { k: SortKey; sort: SortKey; dir: 'asc' | 'desc' }) {
  return sort !== k ? <span> ↕</span> : dir === 'desc' ? <span> ↓</span> : <span> ↑</span>;
}

function AgentesTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<AgentesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [sort, setSort] = useState<SortKey>('ganados');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true); setIsError(false);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<AgentesData>(`/api/bi/agentes?${params}`, { token });
      setData(res);
    } catch { setIsError(true); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => {
    queueMicrotask(() => { fetchData(); });
  }, [fetchData]);

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
    if (!res.ok) { toast.error('Error al exportar el reporte'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `agentes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Cargando agentes…</span></div>;
  if (isError) return (
    <div className="page-error-state">
      <div className="page-error-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3>Error al cargar agentes</h3>
      <p>No se pudo obtener el reporte de agentes. Verifica tu conexión e intenta de nuevo.</p>
      <button className="btn btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const sorted = [...data.agentes].sort((a, b) => {
    const va = a[sort]; const vb = b[sort];
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
    return dir === 'asc' ? cmp : -cmp;
  });

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
              <th onClick={() => handleSort('nombre')}>Agente <SortIcon k="nombre" sort={sort} dir={dir} /></th>
              <th onClick={() => handleSort('ganados')}>Ganados <SortIcon k="ganados" sort={sort} dir={dir} /></th>
              <th onClick={() => handleSort('activos')}>Activos <SortIcon k="activos" sort={sort} dir={dir} /></th>
              <th onClick={() => handleSort('tasaConversion')}>Conversión <SortIcon k="tasaConversion" sort={sort} dir={dir} /></th>
              <th onClick={() => handleSort('comisionTotal')}>Comisión <SortIcon k="comisionTotal" sort={sort} dir={dir} /></th>
              <th onClick={() => handleSort('visitasRealizadas')}>Visitas <SortIcon k="visitasRealizadas" sort={sort} dir={dir} /></th>
              <th onClick={() => handleSort('numInteracciones')}>Interact. <SortIcon k="numInteracciones" sort={sort} dir={dir} /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
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

interface TopPropiedadItem {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  agente: string | null;
  leads: number;
  visitas: number;
  interacciones: number;
  brochures: number;
}

interface PropiedadesData {
  propiedades: TopPropiedadItem[];
}

function PropiedadesTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<PropiedadesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setIsError(false);
    try {
      const params = new URLSearchParams({ limit: '15' });
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<PropiedadesData>(`/api/bi/propiedades/top?${params}`, { token });
      setData(res);
    } catch { setIsError(true); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => {
    queueMicrotask(() => { fetchData(); });
  }, [fetchData]);

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Cargando propiedades…</span></div>;
  if (isError) return (
    <div className="page-error-state">
      <div className="page-error-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3>Error al cargar propiedades</h3>
      <p>No se pudo obtener el ranking de propiedades. Verifica tu conexión e intenta de nuevo.</p>
      <button className="btn btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const props = data.propiedades;
  const maxScore = Math.max(...props.map((p) => p.leads + p.visitas + p.interacciones), 1);

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
            {props.map((p, i) => {
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

// ─── Productividad Tab ───────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  LLAMADA: 'Llamadas', EMAIL: 'Email', WHATSAPP: 'WhatsApp',
  MENSAJE: 'Mensaje', NOTA: 'Notas', VISITA: 'Visitas',
};
const TIPO_ICONS: Record<string, string> = {
  LLAMADA: '📞', EMAIL: '📧', WHATSAPP: '📲', MENSAJE: '💬', NOTA: '📝', VISITA: '👁',
};
const TIPOS = ['LLAMADA', 'EMAIL', 'WHATSAPP', 'MENSAJE', 'NOTA', 'VISITA'] as const;

function Sparkline({ data, width = 72, height = 26 }: { data: { total: number }[]; width?: number; height?: number }) {
  if (!data.length) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const max = Math.max(...data.map((d) => d.total), 1);
  const n = data.length;
  const gap = 1;
  const barW = Math.max(2, Math.floor((width - (n - 1) * gap) / n));
  return (
    <svg width={width} height={height} style={{ display: 'block' }} aria-hidden="true">
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.total / max) * (height - 2)));
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            rx={1}
            fill="var(--accent-blue)"
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

type ProdSortKey = 'nombre' | 'total' | 'LLAMADA' | 'EMAIL' | 'WHATSAPP' | 'MENSAJE' | 'NOTA' | 'VISITA';

interface AgenteProductividad {
  id: string;
  nombre: string;
  rol: string;
  porTipo: Record<string, number>;
  total: number;
  tendencia: { fecha: string; total: number }[];
}

interface ProductividadData {
  agentes: AgenteProductividad[];
  totalesTipo: Record<string, number>;
  totalInteracciones: number;
  cacheAt: string;
}

function ProdSortIcon({ k, sort, dir }: { k: ProdSortKey; sort: ProdSortKey; dir: 'asc' | 'desc' }) {
  return sort !== k ? <span> ↕</span> : dir === 'desc' ? <span> ↓</span> : <span> ↑</span>;
}

function ProductividadTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<ProductividadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [sort, setSort] = useState<ProdSortKey>('total');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true); setIsError(false);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<ProductividadData>(`/api/bi/productividad?${params}`, { token });
      setData(res);
    } catch { setIsError(true); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => {
    queueMicrotask(() => { fetchData(); });
  }, [fetchData]);

  const handleSort = (key: ProdSortKey) => {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setDir('desc'); }
  };

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Cargando productividad…</span></div>;
  if (isError) return (
    <div className="page-error-state">
      <div className="page-error-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3>Error al cargar productividad</h3>
      <p>No se pudo obtener el reporte de actividad. Verifica tu conexión e intenta de nuevo.</p>
      <button className="btn btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const agentes = data.agentes;
  const totalesTipo = data.totalesTipo;

  const sorted = [...agentes].sort((a, b) => {
    const va = sort === 'nombre' ? a.nombre : sort === 'total' ? a.total : (a.porTipo[sort] ?? 0);
    const vb = sort === 'nombre' ? b.nombre : sort === 'total' ? b.total : (b.porTipo[sort] ?? 0);
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return dir === 'asc' ? cmp : -cmp;
  });

  return (
    <>
      {/* KPI summary cards */}
      <div className="bi-kpis" style={{ marginBottom: 24 }}>
        <div className="bi-kpi">
          <span className="bi-kpi-label">Total interacciones</span>
          <span className="bi-kpi-value">{data.totalInteracciones ?? 0}</span>
          <span className="bi-kpi-sub">En el período</span>
        </div>
        {(['LLAMADA', 'EMAIL', 'WHATSAPP'] as const).map((t) => (
          <div className="bi-kpi" key={t}>
            <span className="bi-kpi-label">{TIPO_ICONS[t]} {TIPO_LABELS[t]}</span>
            <span className="bi-kpi-value">{totalesTipo[t] ?? 0}</span>
            <span className="bi-kpi-sub">Por todos los agentes</span>
          </div>
        ))}
        <div className="bi-kpi">
          <span className="bi-kpi-label">💬 Mensajes + 📝 Notas</span>
          <span className="bi-kpi-value">{(totalesTipo['MENSAJE'] ?? 0) + (totalesTipo['NOTA'] ?? 0)}</span>
          <span className="bi-kpi-sub">Por todos los agentes</span>
        </div>
      </div>

      {/* Per-agent table */}
      <div className="bi-section">
        <h3>Contador de actividad por agente</h3>
        <div className="bi-table-wrap">
          <table className="bi-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('nombre')}>Agente <ProdSortIcon k="nombre" sort={sort} dir={dir} /></th>
                {TIPOS.map((t) => (
                  <th key={t} onClick={() => handleSort(t)}>
                    {TIPO_ICONS[t]} {TIPO_LABELS[t]} <ProdSortIcon k={t} sort={sort} dir={dir} />
                  </th>
                ))}
                <th onClick={() => handleSort('total')}>Total <ProdSortIcon k="total" sort={sort} dir={dir} /></th>
                <th>Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.rol}</div>
                  </td>
                  {TIPOS.map((t) => (
                    <td key={t} className="prod-count-cell">
                      {a.porTipo[t] ?? 0}
                    </td>
                  ))}
                  <td className="prod-count-cell" style={{ fontWeight: 700 }}>{a.total}</td>
                  <td className="prod-spark-cell">
                    <Sparkline data={a.tendencia ?? []} />
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              {sorted.length > 0 && (
                <tr className="prod-totals-row">
                  <td style={{ fontWeight: 600 }}>TOTAL</td>
                  {TIPOS.map((t) => (
                    <td key={t} className="prod-count-cell" style={{ fontWeight: 600 }}>{totalesTipo[t] ?? 0}</td>
                  ))}
                  <td className="prod-count-cell" style={{ fontWeight: 700 }}>{data.totalInteracciones ?? 0}</td>
                  <td />
                </tr>
              )}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={TIPOS.length + 3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Sin interacciones en el período
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Datos en caché · actualizado {new Date(data.cacheAt).toLocaleTimeString('es-GT')}
        </p>
      </div>
    </>
  );
}

// ─── Heatmap Tab (F-22) ────────────────────────────────────────────────────────

interface HeatmapPoint {
  lng: number;
  lat: number;
  weight: number;
  leads: number;
  titulo: string;
  codigo: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function HeatmapTab({ token }: { token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (!MAPBOX_TOKEN) { setNoToken(true); setLoading(false); return; }
      apiRequest<HeatmapPoint[]>('/api/bi/heatmap', { token })
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [token]);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || !data.length) return;
    let map: import('mapbox-gl').Map | undefined;
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-90.5328, 14.6407], // Guatemala City
        zoom: 10,
      });
      map.on('load', () => {
        const geojson: import('mapbox-gl').GeoJSONSourceSpecification['data'] = {
          type: 'FeatureCollection',
          features: data.map((p) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: { weight: p.weight, leads: p.leads, titulo: p.titulo, codigo: p.codigo },
          })),
        };
        map!.addSource('props', { type: 'geojson', data: geojson });
        map!.addLayer({
          id: 'heat',
          type: 'heatmap',
          source: 'props',
          maxzoom: 15,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(33,102,172,0)', 0.2, 'rgb(103,169,207)', 0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)', 0.8, 'rgb(239,138,98)', 1, 'rgb(178,24,43)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 15, 50],
            'heatmap-opacity': 0.8,
          },
        });
      });
    });
    return () => { map?.remove(); };
  }, [data]);

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Cargando mapa…</span></div>;
  if (noToken) return (
    <div className="bi-empty" style={{ flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: '2rem' }}>🗺️</span>
      <strong>Mapbox no configurado</strong>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Agrega <code>VITE_MAPBOX_TOKEN</code> al .env para ver el mapa de calor.</span>
    </div>
  );
  if (!data.length) return <div className="bi-empty">Sin propiedades con coordenadas para mostrar.</div>;

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="bi-kpi" style={{ flex: 1, minWidth: 120 }}>
          <span className="bi-kpi-label">Propiedades en mapa</span>
          <span className="bi-kpi-value">{data.length}</span>
        </div>
        <div className="bi-kpi" style={{ flex: 1, minWidth: 120 }}>
          <span className="bi-kpi-label">Total leads activos</span>
          <span className="bi-kpi-value">{data.reduce((s, p) => s + p.leads, 0)}</span>
        </div>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 450, borderRadius: 12, overflow: 'hidden' }} />
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
        Intensidad = número de leads activos por propiedad. Solo propiedades con coordenadas GPS registradas.
      </p>
    </>
  );
}

// ─── Comisiones Tab (P-14) ────────────────────────────────────────────────────

interface DetalleProyectadoItem {
  codigo: string;
  titulo: string;
  estado: string;
  monto: number;
}

interface ComisionesData {
  realizadas: number;
  proyectadas: number;
  totalAcumulado: number;
  numCierres: number;
  numEnProceso: number;
  detalleProyectado: DetalleProyectadoItem[];
}

function ComisionesTab({ desde, hasta, token }: { desde: string; hasta: string; token: string }) {
  const [data, setData] = useState<ComisionesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setIsError(false);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<ComisionesData>(`/api/bi/comisiones?${params}`, { token });
      setData(res);
    } catch { setIsError(true); }
    finally { setLoading(false); }
  }, [desde, hasta, token]);

  useEffect(() => {
    queueMicrotask(() => { fetchData(); });
  }, [fetchData]);

  if (loading) return <div className="bi-loading"><div className="spinner" /><span>Calculando comisiones…</span></div>;
  if (isError) return (
    <div className="page-error-state">
      <h3>Error al cargar comisiones</h3>
      <button className="btn btn-ghost" onClick={fetchData}>Reintentar</button>
    </div>
  );
  if (!data) return <div className="bi-empty">Sin datos</div>;

  const total = data.totalAcumulado ?? 0;
  const pctReal = total > 0 ? Math.round((data.realizadas / total) * 100) : 0;

  return (
    <>
      <div className="bi-kpis">
        <div className="bi-kpi" style={{ borderLeft: '3px solid #22c55e' }}>
          <span className="bi-kpi-label">Comisiones realizadas</span>
          <span className="bi-kpi-value" style={{ fontSize: '1.25rem', color: '#22c55e' }}>{fmtMoney(data.realizadas)}</span>
          <span className="bi-kpi-sub">{data.numCierres} trámite(s) cerrado(s)</span>
        </div>
        <div className="bi-kpi" style={{ borderLeft: '3px solid #f59e0b' }}>
          <span className="bi-kpi-label">Comisiones proyectadas</span>
          <span className="bi-kpi-value" style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{fmtMoney(data.proyectadas)}</span>
          <span className="bi-kpi-sub">{data.numEnProceso} trámite(s) en negociación/cierre</span>
        </div>
        <div className="bi-kpi">
          <span className="bi-kpi-label">Total acumulado</span>
          <span className="bi-kpi-value" style={{ fontSize: '1.25rem' }}>{fmtMoney(data.totalAcumulado)}</span>
          <span className="bi-kpi-sub">{pctReal}% ya realizadas</span>
        </div>
      </div>

      <div className="bi-section">
        <h3>Barra realizadas vs proyectadas</h3>
        <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: 8 }}>
          {data.realizadas > 0 && (
            <div
              title={`Realizadas: ${fmtMoney(data.realizadas)}`}
              style={{ flex: data.realizadas, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 600, minWidth: 60 }}
            >
              {pctReal}% real.
            </div>
          )}
          {data.proyectadas > 0 && (
            <div
              title={`Proyectadas: ${fmtMoney(data.proyectadas)}`}
              style={{ flex: data.proyectadas, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 600, minWidth: 60 }}
            >
              {100 - pctReal}% proy.
            </div>
          )}
          {data.realizadas === 0 && data.proyectadas === 0 && (
            <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sin datos
            </div>
          )}
        </div>
      </div>

      {data.detalleProyectado?.length > 0 && (
        <div className="bi-section">
          <h3>Trámites en proceso ({data.detalleProyectado.length})</h3>
          <div className="admin-table-wrap" style={{ marginTop: 12 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Propiedad</th>
                  <th>Estado pipeline</th>
                  <th style={{ textAlign: 'right' }}>Comisión proyectada</th>
                </tr>
              </thead>
              <tbody>
                {data.detalleProyectado.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.codigo}</td>
                    <td>{item.titulo}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                        background: item.estado === 'CIERRE' ? 'rgba(236,72,153,0.15)' : 'rgba(139,92,246,0.15)',
                        color: item.estado === 'CIERRE' ? '#ec4899' : '#8b5cf6',
                      }}>
                        {item.estado === 'CIERRE' ? 'En cierre' : 'En negociación'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(item.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>
        Proyectadas = precio de propiedad × % comisión de trámites en EN_NEGOCIACION/CIERRE · Realizadas = comisión calculada de trámites GANADO
      </p>
    </>
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
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem', gap: 6 }}
            onClick={() => window.print()}
            title="Exportar / Imprimir como PDF"
          >
            🖨️ PDF
          </button>
        </div>
      </div>

      <div className="bi-tabs">
        <button className={`bi-tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>Resumen</button>
        <button className={`bi-tab ${tab === 'agentes' ? 'active' : ''}`} onClick={() => setTab('agentes')}>Agentes</button>
        <button className={`bi-tab ${tab === 'propiedades' ? 'active' : ''}`} onClick={() => setTab('propiedades')}>Top Propiedades</button>
        <button className={`bi-tab ${tab === 'productividad' ? 'active' : ''}`} onClick={() => setTab('productividad')}>Productividad</button>
        <button className={`bi-tab ${tab === 'comisiones' ? 'active' : ''}`} onClick={() => setTab('comisiones')}>💰 Comisiones</button>
        <button className={`bi-tab ${tab === 'heatmap' ? 'active' : ''}`} onClick={() => setTab('heatmap')}>🗺️ Mapa de calor</button>
      </div>

      {tab === 'resumen' && <ResumenTab {...sharedProps} />}
      {tab === 'agentes' && <AgentesTab {...sharedProps} />}
      {tab === 'propiedades' && <PropiedadesTab {...sharedProps} />}
      {tab === 'productividad' && <ProductividadTab {...sharedProps} />}
      {tab === 'comisiones' && <ComisionesTab {...sharedProps} />}
      {tab === 'heatmap' && <HeatmapTab token={accessToken!} />}
    </div>
  );
}
