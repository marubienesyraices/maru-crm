import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Admin.css';

interface CatalogoPlan {
  plan: string;
  limite_usuarios: number;
  limite_propiedades: number;
  tiene_correo: boolean;
  tiene_campanas: boolean;
  tiene_portal: boolean;
  tiene_sitio_propio: boolean;
  tiene_integraciones: boolean;
  updated_at: string;
}

const PLAN_ORDER = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

const planColors: Record<string, string> = {
  FREE:       'rgba(100,116,139,0.15)',
  BASIC:      'rgba(59,130,246,0.15)',
  PRO:        'rgba(139,92,246,0.15)',
  ENTERPRISE: 'rgba(245,158,11,0.15)',
};

const featureLabels: Array<{ key: keyof CatalogoPlan; label: string; desc: string }> = [
  { key: 'tiene_correo',        label: 'Correo transaccional', desc: 'Emails de bienvenida, recordatorios y alertas' },
  { key: 'tiene_campanas',      label: 'Campañas email',        desc: 'Envío masivo de correos a clientes' },
  { key: 'tiene_portal',        label: 'Portal público',        desc: 'Página pública de propiedades' },
  { key: 'tiene_sitio_propio',  label: 'Sitio propio',          desc: 'Subdominio y dominio personalizado' },
  { key: 'tiene_integraciones', label: 'Integraciones',         desc: 'Conexiones con servicios externos' },
];

export default function AdminPlanesPage() {
  const { accessToken } = useAuthStore();
  const [planes, setPlanes] = useState<CatalogoPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [editing, setEditing] = useState<CatalogoPlan | null>(null);
  const [form, setForm] = useState<Partial<CatalogoPlan>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlanes = useCallback(async () => {
    setIsError(false);
    try {
      const data = await apiRequest<CatalogoPlan[]>('/api/catalogo-planes', { token: accessToken! });
      setPlanes(data.sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan)));
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchPlanes(); }, [fetchPlanes]);

  const openEdit = (p: CatalogoPlan) => {
    setEditing(p);
    setForm({ ...p });
    setError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const { plan, updated_at, ...body } = form as CatalogoPlan;
      await apiRequest(`/api/catalogo-planes/${editing.plan}`, {
        method: 'PUT',
        body,
        token: accessToken!,
      });
      setEditing(null);
      fetchPlanes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const check = (val: boolean) => val
    ? <span style={{ color: 'var(--accent-green, #22c55e)', fontWeight: 700 }}>✓</span>
    : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Catálogo de Planes</h1>
          <p>Configura los límites y funcionalidades disponibles en cada plan de suscripción</p>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /><span>Cargando catálogo…</span></div>
      ) : isError ? (
        <div className="page-error-state">
          <div className="page-error-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3>Error al cargar el catálogo</h3>
          <button className="btn btn-ghost" onClick={fetchPlanes}>Reintentar</button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Usuarios</th>
                <th>Propiedades</th>
                {featureLabels.map(f => (
                  <th key={f.key} title={f.desc}>{f.label}</th>
                ))}
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planes.map((p) => (
                <tr key={p.plan}>
                  <td>
                    <span
                      className={`admin-plan admin-plan-${p.plan}`}
                      style={{ background: planColors[p.plan] }}
                    >
                      {p.plan}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.limite_usuarios}</td>
                  <td style={{ fontWeight: 600 }}>{p.limite_propiedades}</td>
                  {featureLabels.map(f => (
                    <td key={f.key} style={{ textAlign: 'center' }}>
                      {check(p[f.key] as boolean)}
                    </td>
                  ))}
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button onClick={() => openEdit(p)}>Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de edición */}
      {editing && (
        <div className="admin-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="admin-modal">
            <h2>
              Configurar plan:{' '}
              <span className={`admin-plan admin-plan-${editing.plan}`}>{editing.plan}</span>
            </h2>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="admin-form-row" style={{ marginTop: 8 }}>
              <div className="input-group">
                <label>Límite de Usuarios</label>
                <input
                  className="input-field"
                  type="number"
                  min={1}
                  value={form.limite_usuarios ?? ''}
                  onChange={(e) => updateField('limite_usuarios', Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label>Límite de Propiedades</label>
                <input
                  className="input-field"
                  type="number"
                  min={1}
                  value={form.limite_propiedades ?? ''}
                  onChange={(e) => updateField('limite_propiedades', Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Funcionalidades incluidas
              </p>
              {featureLabels.map(f => (
                <label
                  key={f.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={!!form[f.key]}
                    onChange={(e) => updateField(f.key, e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent-blue)', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <strong>Nota:</strong> Los cambios en límites de usuarios y propiedades aplican solo a nuevos tenants creados después de guardar. Los tenants existentes conservan sus límites actuales. Los toggles de funcionalidades aplican en tiempo real.
            </div>

            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
