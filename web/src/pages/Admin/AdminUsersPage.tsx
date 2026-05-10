import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Admin.css';

interface UserItem {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  estado: string;
  id_supervisor: string | null;
  supervisor?: { id: string; nombre: string } | null;
  created_at: string;
  last_login_at: string | null;
  _count?: { subordinados: number };
}

const ROLES = ['ADMIN', 'SENIOR', 'JUNIOR'];
const ESTADOS_USER = ['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'PENDIENTE'];

const rolLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SENIOR: 'Agente Senior',
  JUNIOR: 'Agente Junior',
};

const emptyForm = {
  email: '',
  nombre: '',
  rol: 'JUNIOR',
  estado: 'ACTIVO',
  idSupervisor: '',
};

export default function AdminUsersPage() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsError(false);
    try {
      const data = await apiRequest<UserItem[]>('/api/users', { token: accessToken! });
      setUsers(data);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: UserItem) => {
    setEditing(u);
    setForm({
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      estado: u.estado,
      idSupervisor: u.id_supervisor || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body: any = { ...form };
      if (!body.idSupervisor) delete body.idSupervisor;

      if (editing) {
        await apiRequest(`/api/users/${editing.id}`, {
          method: 'PUT',
          body,
          token: accessToken!,
        });
      } else {
        await apiRequest('/api/users', {
          method: 'POST',
          body,
          token: accessToken!,
        });
      }
      setShowModal(false);
      fetchUsers();
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
    if (estado === 'ACTIVO') return 'admin-badge-active';
    if (estado === 'BLOQUEADO') return 'admin-badge-suspended';
    if (estado === 'PENDIENTE') return 'admin-badge-pending';
    return 'admin-badge-inactive';
  };

  // Potential supervisors (ADMIN or SENIOR only)
  const supervisors = users.filter(u => u.rol === 'ADMIN' || u.rol === 'SENIOR');

  const activos = users.filter(u => u.estado === 'ACTIVO').length;
  const admins = users.filter(u => u.rol === 'ADMIN').length;
  const agentes = users.filter(u => u.rol === 'SENIOR' || u.rol === 'JUNIOR').length;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Administra los usuarios y agentes de la empresa</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>👥</div>
          <div>
            <h4>Total Usuarios</h4>
            <span className="stat-val">{users.length}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>✅</div>
          <div>
            <h4>Activos</h4>
            <span className="stat-val">{activos}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>🛡️</div>
          <div>
            <h4>Administradores</h4>
            <span className="stat-val">{admins}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>🏷️</div>
          <div>
            <h4>Agentes</h4>
            <span className="stat-val">{agentes}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="page-loading"><div className="spinner" /><span>Cargando usuarios…</span></div>
      ) : isError ? (
        <div className="page-error-state">
          <div className="page-error-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h3>Error al cargar usuarios</h3>
          <p>No se pudieron obtener los usuarios. Verifica tu conexión e intenta de nuevo.</p>
          <button className="btn btn-ghost" onClick={fetchUsers}>Reintentar</button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Supervisor</th>
                <th>Estado</th>
                <th>Último Login</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No hay usuarios registrados aún</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </td>
                  <td><span className={`admin-role admin-role-${u.rol}`}>{rolLabels[u.rol] || u.rol}</span></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {u.supervisor?.nombre || '—'}
                  </td>
                  <td>
                    <span className={`admin-badge ${statusClass(u.estado)}`}>
                      <span className="admin-badge-dot" />
                      {u.estado}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Nunca'}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button onClick={() => openEdit(u)}>Editar</button>
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
            <h2>{editing ? `Editar: ${editing.nombre}` : 'Nuevo Usuario'}</h2>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="admin-form-row">
              <div className="input-group">
                <label>Nombre *</label>
                <input className="input-field" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} placeholder="Ana López" />
              </div>
              <div className="input-group">
                <label>Email *</label>
                <input className="input-field" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="ana@empresa.com" />
              </div>
            </div>

            <div className="admin-form-row" style={{ marginTop: 12 }}>
              <div className="input-group">
                <label>Rol</label>
                <select className="input-field" value={form.rol} onChange={(e) => updateField('rol', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{rolLabels[r] || r}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Supervisor</label>
                <select className="input-field" value={form.idSupervisor} onChange={(e) => updateField('idSupervisor', e.target.value)}>
                  <option value="">Sin supervisor</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.nombre} ({rolLabels[s.rol]})</option>)}
                </select>
              </div>
            </div>

            {editing && (
              <div className="input-group" style={{ marginTop: 12 }}>
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={(e) => updateField('estado', e.target.value)}>
                  {ESTADOS_USER.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !form.nombre || !form.email} onClick={handleSave}>
                {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
