import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Audit.css';

interface AuditLog {
  id: string;
  user_id: string;
  nombre_usuario: string;
  accion: string;
  modulo: string;
  entidad: string;
  entidad_id: string | null;
  ip_address: string;
  user_agent: string | null;
  payload_cambio: unknown;
  created_at: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACCIONES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'READ'];

const ACCION_COLOR: Record<string, string> = {
  CREATE: '#22c55e',
  UPDATE: '#f59e0b',
  DELETE: '#ef4444',
  LOGIN:  '#3b82f6',
  LOGOUT: '#6b7280',
  READ:   '#a78bfa',
};

export default function AuditPage() {
  const { accessToken } = useAuthStore();
  const toast = useToast();

  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [meta, setMeta]         = useState<Meta | null>(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    modulo: '',
    accion: '',
    entidad: '',
    fechaDesde: '',
    fechaHasta: '',
    page: 1,
    limit: 50,
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.modulo)     params.set('modulo', filters.modulo);
      if (filters.accion)     params.set('accion', filters.accion);
      if (filters.entidad)    params.set('entidad', filters.entidad);
      if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde);
      if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta);
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));

      const res = await apiRequest<{ data: AuditLog[]; meta: Meta }>(
        `/api/audit?${params}`,
        { token: accessToken! },
      );
      setLogs(res.data);
      setMeta(res.meta);
    } catch {
      toast.error('Error al cargar registros de auditoría');
    } finally {
      setLoading(false);
    }
  }, [filters, accessToken, toast]);

  useEffect(() => { queueMicrotask(() => { fetchLogs(); }); }, [fetchLogs]);

  const set = (key: string, value: string) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const exportCSV = async () => {
    const params = new URLSearchParams();
    if (filters.modulo)     params.set('modulo', filters.modulo);
    if (filters.accion)     params.set('accion', filters.accion);
    if (filters.entidad)    params.set('entidad', filters.entidad);
    if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta);
    params.set('page', '1');
    params.set('limit', '5000');

    try {
      const res = await apiRequest<{ data: AuditLog[] }>(`/api/audit?${params}`, { token: accessToken! });
      const headers = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Entidad', 'IP'];
      const rows = res.data.map((l) => [
        new Date(l.created_at).toLocaleString('es-GT'),
        `"${l.nombre_usuario}"`,
        l.accion,
        l.modulo,
        l.entidad,
        l.ip_address,
      ]);
      const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado correctamente');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'medium' });

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <h1>Auditoría</h1>
          <p>Registro inmutable de todas las acciones del sistema</p>
        </div>
        <button className="audit-export-btn" onClick={exportCSV}>
          ↓ Exportar CSV
        </button>
      </div>

      <div className="audit-filters">
        <input
          placeholder="Módulo (ej: propiedades)"
          value={filters.modulo}
          onChange={(e) => set('modulo', e.target.value)}
        />
        <select value={filters.accion} onChange={(e) => set('accion', e.target.value)}>
          <option value="">Todas las acciones</option>
          {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          placeholder="Entidad (ej: Propiedad)"
          value={filters.entidad}
          onChange={(e) => set('entidad', e.target.value)}
        />
        <input type="date" title="Desde" value={filters.fechaDesde} onChange={(e) => set('fechaDesde', e.target.value)} />
        <input type="date" title="Hasta" value={filters.fechaHasta} onChange={(e) => set('fechaHasta', e.target.value)} />
      </div>

      {meta && (
        <p className="audit-meta">
          {meta.total.toLocaleString()} registros · Página {meta.page} de {meta.totalPages}
        </p>
      )}

      {loading ? (
        <div className="audit-skeleton">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="audit-skeleton-row" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="audit-empty">No hay registros para los filtros seleccionados.</div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo / Entidad</th>
                <th>IP</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr className="audit-row">
                    <td className="audit-date">{fmt(log.created_at)}</td>
                    <td className="audit-user">{log.nombre_usuario}</td>
                    <td>
                      <span
                        className="audit-badge"
                        style={{ background: `${ACCION_COLOR[log.accion]}22`, color: ACCION_COLOR[log.accion] }}
                      >
                        {log.accion}
                      </span>
                    </td>
                    <td className="audit-module">
                      <span>{log.modulo}</span>
                      {log.entidad && (
                        <span className="audit-entity">
                          {log.entidad}{log.entidad_id ? ` #${log.entidad_id.slice(0, 8)}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="audit-ip">{log.ip_address}</td>
                    <td>
                      {!!log.payload_cambio && (
                        <button
                          className="audit-expand-btn"
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        >
                          {expanded === log.id ? '▲' : '▼'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === log.id && !!log.payload_cambio && (
                    <tr className="audit-detail-row">
                      <td colSpan={6}>
                        <pre className="audit-payload">{JSON.stringify(log.payload_cambio, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="audit-pagination">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            ‹ Anterior
          </button>
          <span>{filters.page} / {meta.totalPages}</span>
          <button
            disabled={filters.page >= meta.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}
