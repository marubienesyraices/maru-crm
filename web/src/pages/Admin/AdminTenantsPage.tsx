import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Admin.css';

interface Tenant {
  id: string;
  nombre: string;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  plan: string;
  moneda: string;
  zona_horaria: string;
  limite_usuarios: number;
  limite_propiedades: number;
  estado: string;
  created_at: string;
  _count: { usuarios: number };
}

const PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const MONEDAS = ['GTQ', 'USD', 'MXN'];
const ESTADOS = ['ACTIVA', 'SUSPENDIDA', 'TRIAL'];

const emptyForm = {
  nombre: '',
  adminEmail: '',
  adminNombre: '',
  plan: 'PRO',
  moneda: 'GTQ',
  zonaHoraria: 'America/Guatemala',
  colorPrimario: '#3b82f6',
  colorSecundario: '#1e293b',
  colorAcento: '#8b5cf6',
  limiteUsuarios: 25,
  limitePropiedades: 500,
  estado: 'ACTIVA',
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
      colorPrimario: t.color_primario,
      colorSecundario: t.color_secundario,
      colorAcento: t.color_acento,
      limiteUsuarios: t.limite_usuarios,
      limitePropiedades: t.limite_propiedades,
      estado: t.estado,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { adminEmail, adminNombre, ...updateBody } = form;
        await apiRequest(`/api/tenants/${editing.id}`, {
          method: 'PUT',
          body: updateBody,
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
          body: form,
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

  const statusClass = (estado: string) => {
    if (estado === 'ACTIVA') return 'admin-badge-active';
    if (estado === 'SUSPENDIDA') return 'admin-badge-suspended';
    return 'admin-badge-pending';
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
                <th>Moneda</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No hay empresas registradas aún</td></tr>
              )}
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 32, borderRadius: 4, background: t.color_primario }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{t.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`admin-plan admin-plan-${t.plan}`}>{t.plan}</span></td>
                  <td>{t._count?.usuarios || 0} / {t.limite_usuarios}</td>
                  <td>{t.moneda}</td>
                  <td>
                    <span className={`admin-badge ${statusClass(t.estado)}`}>
                      <span className="admin-badge-dot" />
                      {t.estado}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {new Date(t.created_at).toLocaleDateString()}
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
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? `Editar: ${editing.nombre}` : 'Nueva Empresa'}</h2>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="input-group">
              <label>Nombre de la Empresa *</label>
              <input className="input-field" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} placeholder="Maru Bienes y Raíces" />
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
                <select className="input-field" value={form.plan} onChange={(e) => updateField('plan', e.target.value)}>
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

            {editing && (
              <div className="input-group" style={{ marginTop: 12 }}>
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={(e) => updateField('estado', e.target.value)}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

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

            <div className="admin-form-row-3" style={{ marginTop: 12 }}>
              <div className="input-group">
                <label>Color Primario</label>
                <div className="admin-color-group">
                  <input type="color" value={form.colorPrimario} onChange={(e) => updateField('colorPrimario', e.target.value)} />
                  <input className="input-field" value={form.colorPrimario} onChange={(e) => updateField('colorPrimario', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>Color Secundario</label>
                <div className="admin-color-group">
                  <input type="color" value={form.colorSecundario} onChange={(e) => updateField('colorSecundario', e.target.value)} />
                  <input className="input-field" value={form.colorSecundario} onChange={(e) => updateField('colorSecundario', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>Color Acento</label>
                <div className="admin-color-group">
                  <input type="color" value={form.colorAcento} onChange={(e) => updateField('colorAcento', e.target.value)} />
                  <input className="input-field" value={form.colorAcento} onChange={(e) => updateField('colorAcento', e.target.value)} />
                </div>
              </div>
            </div>

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
