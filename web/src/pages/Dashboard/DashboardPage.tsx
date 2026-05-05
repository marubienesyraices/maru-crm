import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Dashboard.css';

interface PropStats {
  total: number;
  porEstado: { estado: string; _count: number }[];
  porTipo: { tipo: string; _count: number }[];
}

interface ClienteStats {
  total: number;
  porOrigen: { origen: string; _count: number }[];
}

interface PipelineStats {
  total: number;
  porEstado: Record<string, number>;
  porNivel: Record<string, number>;
}

const ESTADO_PROP_COLORS: Record<string, string> = {
  BORRADOR: '#64748b',
  DISPONIBLE: '#22c55e',
  RESERVADA: '#f59e0b',
  EN_NEGOCIACION: '#3b82f6',
  VENDIDA: '#8b5cf6',
  RENTADA: '#06b6d4',
  SUSPENDIDA: '#ef4444',
};

const PIPELINE_COLORS: Record<string, string> = {
  NUEVO: '#64748b',
  CONTACTADO: '#3b82f6',
  INTERESADO: '#f59e0b',
  EN_NEGOCIACION: '#8b5cf6',
  GANADO: '#22c55e',
  PERDIDO: '#ef4444',
};

const ORIGEN_LABELS: Record<string, string> = {
  PORTAL_WEB: 'Portal Web',
  REFERIDO: 'Referido',
  LLAMADA: 'Llamada',
  WHATSAPP: 'WhatsApp',
  REDES_SOCIALES: 'Redes Sociales',
  FERIA: 'Feria',
  OTRO: 'Otro',
};

export default function DashboardPage() {
  const { accessToken, user } = useAuthStore();
  const [propStats, setPropStats] = useState<PropStats | null>(null);
  const [clienteStats, setClienteStats] = useState<ClienteStats | null>(null);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const opts = { token: accessToken };
    Promise.all([
      apiRequest<PropStats>('/api/propiedades/stats', opts),
      apiRequest<ClienteStats>('/api/clientes/stats', opts),
      apiRequest<PipelineStats>('/api/pipeline/stats', opts),
    ])
      .then(([p, c, pl]) => {
        setPropStats(p);
        setClienteStats(c);
        setPipelineStats(pl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const propDisponibles = propStats?.porEstado.find((e) => e.estado === 'DISPONIBLE')?._count ?? 0;
  const tramitesActivos =
    (pipelineStats?.porEstado['CONTACTADO'] ?? 0) +
    (pipelineStats?.porEstado['INTERESADO'] ?? 0) +
    (pipelineStats?.porEstado['EN_NEGOCIACION'] ?? 0);
  const tramitesGanados = pipelineStats?.porEstado['GANADO'] ?? 0;

  return (
    <>
      <header className="dashboard-topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido{user?.email ? `, ${user.email}` : ''}</p>
        </div>
      </header>

      <div className="dashboard-content animate-fade-in">

        {/* ─── KPI Cards ─────────────────────────────────── */}
        <div className="stats-grid">
          <StatCard
            loading={loading}
            icon={<IconHome />}
            colorClass="stat-icon-cyan"
            value={propStats?.total ?? 0}
            label="Propiedades totales"
          />
          <StatCard
            loading={loading}
            icon={<IconCheck />}
            colorClass="stat-icon-green"
            value={propDisponibles}
            label="Disponibles"
          />
          <StatCard
            loading={loading}
            icon={<IconUsers />}
            colorClass="stat-icon-violet"
            value={clienteStats?.total ?? 0}
            label="Clientes registrados"
          />
          <StatCard
            loading={loading}
            icon={<IconActivity />}
            colorClass="stat-icon-blue"
            value={tramitesActivos}
            label="Trámites activos"
          />
        </div>

        {error && <p className="dash-error">{error}</p>}

        <div className="dash-row">
          {/* ─── Propiedades por estado ────────────────── */}
          <div className="dash-panel">
            <h2 className="dash-panel-title">Propiedades por estado</h2>
            {loading ? (
              <SkeletonList rows={5} />
            ) : propStats && propStats.total > 0 ? (
              <div className="bar-list">
                {propStats.porEstado
                  .sort((a, b) => b._count - a._count)
                  .map((item) => (
                    <BarRow
                      key={item.estado}
                      label={item.estado.replace('_', ' ')}
                      count={item._count}
                      total={propStats.total}
                      color={ESTADO_PROP_COLORS[item.estado] ?? '#64748b'}
                    />
                  ))}
              </div>
            ) : (
              <EmptyState text="Sin propiedades registradas" />
            )}
          </div>

          {/* ─── Pipeline por estado ───────────────────── */}
          <div className="dash-panel">
            <h2 className="dash-panel-title">
              Pipeline de ventas
              {!loading && pipelineStats && (
                <span className="dash-panel-sub">{tramitesGanados} ganado{tramitesGanados !== 1 ? 's' : ''}</span>
              )}
            </h2>
            {loading ? (
              <SkeletonList rows={6} />
            ) : pipelineStats && pipelineStats.total > 0 ? (
              <div className="bar-list">
                {['NUEVO', 'CONTACTADO', 'INTERESADO', 'EN_NEGOCIACION', 'GANADO', 'PERDIDO'].map((estado) => {
                  const count = pipelineStats.porEstado[estado] ?? 0;
                  return (
                    <BarRow
                      key={estado}
                      label={estado.replace('_', ' ')}
                      count={count}
                      total={pipelineStats.total}
                      color={PIPELINE_COLORS[estado]}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState text="Sin trámites en pipeline" />
            )}
          </div>

          {/* ─── Clientes por origen ───────────────────── */}
          <div className="dash-panel">
            <h2 className="dash-panel-title">Origen de clientes</h2>
            {loading ? (
              <SkeletonList rows={5} />
            ) : clienteStats && clienteStats.total > 0 ? (
              <div className="bar-list">
                {clienteStats.porOrigen
                  .sort((a, b) => b._count - a._count)
                  .map((item) => (
                    <BarRow
                      key={item.origen}
                      label={ORIGEN_LABELS[item.origen] ?? item.origen}
                      count={item._count}
                      total={clienteStats.total}
                      color="#8b5cf6"
                    />
                  ))}
              </div>
            ) : (
              <EmptyState text="Sin clientes registrados" />
            )}
          </div>
        </div>

        {/* ─── Propiedades por tipo ──────────────────────── */}
        {!loading && propStats && propStats.total > 0 && (
          <div className="dash-panel dash-panel-wide">
            <h2 className="dash-panel-title">Inventario por tipo</h2>
            <div className="tipo-chips">
              {propStats.porTipo
                .sort((a, b) => b._count - a._count)
                .map((item) => (
                  <div key={item.tipo} className="tipo-chip">
                    <span className="tipo-chip-label">{item.tipo.replace('_', ' ')}</span>
                    <span className="tipo-chip-count">{item._count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function StatCard({
  loading, icon, colorClass, value, label,
}: {
  loading: boolean;
  icon: React.ReactNode;
  colorClass: string;
  value: number;
  label: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        {loading ? (
          <span className="skel skel-value" />
        ) : (
          <span className="stat-value">{value.toLocaleString()}</span>
        )}
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bar-count">{count}</span>
    </div>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <div className="bar-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bar-row">
          <span className="skel skel-label" />
          <div className="bar-track"><div className="skel skel-bar" /></div>
          <span className="skel skel-num" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="dash-empty">{text}</p>;
}

/* ─── Icons ───────────────────────────────────────────────────── */

function IconHome() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconCheck() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>;
}
function IconUsers() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IconActivity() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}
