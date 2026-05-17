import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Admin.css';

interface Tenant {
  id: string;
  nombre: string;
  logo_url: string | null;
  plan: string;
  moneda: string;
  zona_horaria: string;
  limite_usuarios: number;
  limite_propiedades: number;
  estado: string;
  trial_hasta: string | null;
  created_at: string;
  _count: { usuarios: number; propiedades: number };
}

interface CatalogoPlan {
  plan: string;
  limite_usuarios: number;
  limite_propiedades: number;
}

const PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const MONEDAS = ['GTQ', 'USD', 'MXN'];
const ESTADOS = ['ACTIVA', 'SUSPENDIDA', 'TRIAL', 'CANCELADA'];

const emptyForm = {
  nombre: '',
  adminEmail: '',
  adminNombre: '',
  plan: 'PRO',
  moneda: 'GTQ',
  zonaHoraria: 'America/Guatemala',
  limiteUsuarios: 25,
  limitePropiedades: 500,
  estado: 'ACTIVA',
  trialHasta: '',
};

export default function AdminTenantsPage() {
  const { accessToken } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [catalogoPlanes, setCatalogoPlanes] = useState<CatalogoPlan[]>([]);

  const fetchTenants = useCallback(async () => {
    setIsError(false);
    try {
      const data = await apiRequest<Tenant[]>('/api/tenants', { token: accessToken! });
      setTenants(data);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  useEffect(() => {
    apiRequest<CatalogoPlan[]>('/api/catalogo-planes', { token: accessToken! })
      .then(setCatalogoPlanes)
      .catch(() => {});
  }, [accessToken]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      adminEmail: '',
      adminNombre: '',
      plan: t.plan,
      moneda: t.moneda,
      zonaHoraria: t.zona_horaria,
      limiteUsuarios: t.limite_usuarios,
      limitePropiedades: t.limite_propiedades,
      estado: t.estado,
      trialHasta: t.trial_hasta ? t.trial_hasta.slice(0, 10) : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (form.estado === 'TRIAL' && !form.trialHasta) {
      setError('La fecha de fin de Trial es obligatoria cuando el estado es TRIAL');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const cleanBody = (obj: Record<string, any>) => {
        const copy = { ...obj };
        if (!copy.trialHasta) delete copy.trialHasta;
        return copy;
      };

      if (editing) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { adminEmail, adminNombre, ...updateBody } = form;
        await apiRequest(`/api/tenants/${editing.id}`, {
          method: 'PUT',
          body: cleanBody(updateBody),
          token: accessToken!,
        });
      } else {
        if (!form.adminEmail || !form.adminNombre) {
          setError('El email y nombre del administrador son obligatorios');
          setSaving(false);
          return;
        }
        await apiRequest('/api/tenants', {
          method: 'POST',
          body: cleanBody(form),
          token: accessToken!,
        });
      }
      setShowModal(false);
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlanChange = (newPlan: string) => {
    const cat = catalogoPlanes.find(p => p.plan === newPlan);
    setForm((prev) => ({
      ...prev,
      plan: newPlan,
      ...(cat ? { limiteUsuarios: cat.limite_usuarios, limitePropiedades: cat.limite_propiedades } : {}),
    }));
  };

  const planWarnings: string[] = editing ? [
    ...(editing._count.usuarios > form.limiteUsuarios
      ? [`La empresa tiene ${editing._count.usuarios} usuarios pero el nuevo límite es ${form.limiteUsuarios}`]
      : []),
    ...(editing._count.propiedades > form.limitePropiedades
      ? [`La empresa tiene ${editing._count.propiedades} propiedades pero el nuevo límite es ${form.limitePropiedades}`]
      : []),
  ] : [];

  const statusClass = (estado: string) => {
    if (estado === 'ACTIVA') return 'admin-badge-active';
    if (estado === 'SUSPENDIDA' || estado === 'CANCELADA') return 'admin-badge-suspended';
    if (estado === 'TRIAL') return 'admin-badge-pending';
    return 'admin-badge-inactive';
  };

  const activas = tenants.filter(t => t.estado === 'ACTIVA').length;
  const totalUsers = tenants.reduce((sum, t) => sum + (t._count?.usuarios || 0), 0);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Gestión de Empresas</h1>
          <p>Administra las empresas registradas en la plataforma</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nueva Empresa
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>🏢</div>
          <div>
            <h4>Total Empresas</h4>
            <span className="stat-val">{tenants.length}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>✅</div>
          <div>
            <h4>Activas</h4>
            <span className="stat-val">{activas}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>👥</div>
          <div>
            <h4>Usuarios Totales</h4>
            <span className="stat-val">{totalUsers}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="page-loading"><div className="spinner" /><span>Cargando empresas…</span></div>
      ) : isError ? (
        <div className="page-error-state">
          <div className="page-error-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3>Error al cargar empresas</h3>
          <p>No se pudieron obtener los datos. Verifica tu conexión e intenta de nuevo.</p>
          <button className="btn btn-ghost" onClick={fetchTenants}>Reintentar</button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plan</th>
                <th>Usuarios</th>
                <th>Propiedades</th>
                <th>Moneda</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No hay empresas registradas aún</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.id.slice(0, 8)}…</div>
                    </div>
                  </td>
                  <td><span className={`admin-plan admin-plan-${t.plan}`}>{t.plan}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={t._count?.usuarios > t.limite_usuarios ? { color: 'var(--accent-red, #ef4444)', fontWeight: 600 } : {}}>
                      {t._count?.usuarios || 0} / {t.limite_usuarios}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={t._count?.propiedades > t.limite_propiedades ? { color: 'var(--accent-red, #ef4444)', fontWeight: 600 } : {}}>
                      {t._count?.propiedades || 0} / {t.limite_propiedades}
                    </span>
                  </td>
                  <td>{t.moneda}</td>
                  <td>
                    <span className={`admin-badge ${statusClass(t.estado)}`}>
                      <span className="admin-badge-dot" />
                      {t.estado}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                    {t.estado === 'TRIAL' && t.trial_hasta && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber, #f59e0b)', marginTop: 2 }}>
                        Trial hasta: {new Date(t.trial_hasta).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button onClick={() => openEdit(t)}>Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="admin-modal">
            <h2>{editing ? `Editar: ${editing.nombre}` : 'Nueva Empresa'}</h2>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="input-group">
              <label>Nombre de la Empresa *</label>
              <input className="input-field" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} placeholder="Mi Inmobiliaria" />
            </div>

            {!editing && (
              <div className="admin-form-row" style={{ marginTop: 12 }}>
                <div className="input-group">
                  <label>Email del Admin *</label>
                  <input className="input-field" type="email" value={form.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} placeholder="admin@empresa.com" />
                </div>
                <div className="input-group">
                  <label>Nombre del Admin *</label>
                  <input className="input-field" value={form.adminNombre} onChange={(e) => updateField('adminNombre', e.target.value)} placeholder="María García" />
                </div>
              </div>
            )}

            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <div className="input-group">
                <label>Plan</label>
                <select className="input-field" value={form.plan} onChange={(e) => handlePlanChange(e.target.value)}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Moneda</label>
                <select className="input-field" value={form.moneda} onChange={(e) => updateField('moneda', e.target.value)}>
                  {MONEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <div className="input-group">
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={(ev) => {
                  updateField('estado', ev.target.value);
                  if (ev.target.value !== 'TRIAL') updateField('trialHasta', '');
                }}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {form.estado === 'TRIAL' && (
                <div className="input-group">
                  <label>Fin de Trial *</label>
                  <input
                    className="input-field"
                    type="date"
                    value={form.trialHasta}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateField('trialHasta', e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <div className="input-group">
                <label>Límite de Usuarios</label>
                <input className="input-field" type="number" value={form.limiteUsuarios} onChange={(e) => updateField('limiteUsuarios', Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label>Límite de Propiedades</label>
                <input className="input-field" type="number" value={form.limitePropiedades} onChange={(e) => updateField('limitePropiedades', Number(e.target.value))} />
              </div>
            </div>

            {planWarnings.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: '0.8125rem' }}>
                <strong style={{ color: 'var(--accent-red, #ef4444)' }}>Advertencia:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-secondary)' }}>
                  {planWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
                <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                  El sistema no permitirá guardar con límites inferiores a los registros actuales.
                </div>
              </div>
            )}

            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !form.nombre} onClick={handleSave}>
                {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
