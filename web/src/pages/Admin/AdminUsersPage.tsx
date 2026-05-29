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
  ultimo_login?: string | null;
  intentos_login?: number;
  bloqueado_hasta?: string | null;
  _count?: { subordinados: number };
  // Solo para vista SUPER_ADMIN
  tenant?: { id: string; nombre: string; plan: string; estado: string };
}

interface TenantOption {
  id: string;
  nombre: string;
  plan: string;
  estado: string;
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
  // Solo SUPER_ADMIN
  tenantId: '',
};

export default function AdminUsersPage() {
  const { accessToken, user, limiteUsuarios } = useAuthStore();
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState<UserItem | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [reasignarModal, setReasignarModal] = useState<UserItem | null>(null);
  const [reasignarTargetId, setReasignarTargetId] = useState('');
  const [reasignando, setReasignando] = useState(false);
  const [reasignarError, setReasignarError] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsError(false);
    try {
      const endpoint = isSuperAdmin ? '/api/users/admins' : '/api/users';
      const data = await apiRequest<UserItem[]>(endpoint, { token: accessToken! });
      setUsers(data);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isSuperAdmin]);

  const fetchTenants = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await apiRequest<TenantOption[]>('/api/tenants', { token: accessToken! });
      setTenants(data);
    } catch { /* noop */ }
  }, [accessToken, isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [fetchUsers, fetchTenants]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, rol: isSuperAdmin ? 'ADMIN' : 'JUNIOR' });
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
      tenantId: u.tenant?.id || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleResendActivation = async () => {
    if (!editing) return;
    setResending(true);
    setError('');
    try {
      await apiRequest(`/api/users/${editing.id}/reenviar-activacion`, { method: 'POST', token: accessToken! });
      setError('');
      alert('Correo de activación reenviado correctamente.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleSave = async () => {
    if (isSuperAdmin && !form.tenantId) {
      setError('Debes seleccionar una empresa');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const body: any = { email: form.email, nombre: form.nombre, tenantId: form.tenantId };
        if (form.estado) body.estado = form.estado;
        if (editing) {
          await apiRequest(`/api/users/admins/${editing.id}`, { method: 'PUT', body, token: accessToken! });
        } else {
          await apiRequest('/api/users/admins', { method: 'POST', body, token: accessToken! });
        }
      } else {
        const body: any = { ...form };
        delete body.tenantId;
        if (!body.idSupervisor) delete body.idSupervisor;
        if (!editing) delete body.estado;
        if (editing) {
          await apiRequest(`/api/users/${editing.id}`, { method: 'PUT', body, token: accessToken! });
        } else {
          await apiRequest('/api/users', { method: 'POST', body, token: accessToken! });
        }
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

  const isBloqueado = (u: UserItem) =>
    u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date();

  const handleDesbloquear = async (u: UserItem) => {
    setUnlocking(u.id);
    try {
      await apiRequest(`/api/users/${u.id}/desbloquear`, { method: 'POST', token: accessToken! });
      fetchUsers();
    } catch (err: any) {
      alert(err.message ?? 'Error al desbloquear');
    } finally {
      setUnlocking(null);
    }
  };

  const openReasignarModal = (u: UserItem) => {
    setReasignarModal(u);
    setReasignarTargetId('');
    setReasignarError('');
  };

  const handleReasignar = async () => {
    if (!reasignarModal || !reasignarTargetId) return;
    setReasignando(true);
    setReasignarError('');
    try {
      const res = await apiRequest<{ reasignados: number; message: string }>(`/api/users/${reasignarModal.id}/reasignar-subordinados`, {
        method: 'POST',
        body: { toSupervisorId: reasignarTargetId },
        token: accessToken!,
      });
      setReasignarModal(null);
      alert(res.message);
      fetchUsers();
    } catch (err: any) {
      setReasignarError(err.message ?? 'Error al reasignar');
    } finally {
      setReasignando(false);
    }
  };

  const openTransferModal = (u: UserItem) => {
    setTransferModal(u);
    setTargetUserId('');
    setTransferError('');
  };

  const handleTransfer = async () => {
    if (!transferModal || !targetUserId) return;
    setTransferring(true);
    setTransferError('');
    try {
      await apiRequest(`/api/users/${transferModal.id}/transferir`, {
        method: 'POST',
        body: { targetUserId },
        token: accessToken!,
      });
      setTransferModal(null);
      fetchUsers();
    } catch (err: any) {
      setTransferError(err.message ?? 'Error al transferir');
    } finally {
      setTransferring(false);
    }
  };

  const statusClass = (estado: string) => {
    if (estado === 'ACTIVO') return 'admin-badge-active';
    if (estado === 'BLOQUEADO') return 'admin-badge-suspended';
    if (estado === 'PENDIENTE') return 'admin-badge-pending';
    return 'admin-badge-inactive';
  };

  const supervisors = users.filter(u => u.rol === 'ADMIN' || u.rol === 'SENIOR');
  const activos = users.filter(u => u.estado === 'ACTIVO').length;
  const pendientes = users.filter(u => u.estado === 'PENDIENTE').length;
  const atUserLimit = !isSuperAdmin && limiteUsuarios !== null && users.length >= limiteUsuarios;

  // Set de tenantIds que ya tienen admin asignado (excluye el admin que se está editando)
  const tenantsConAdmin = new Set(
    users
      .filter(u => !editing || u.id !== editing.id)
      .map(u => u.tenant?.id)
      .filter(Boolean) as string[]
  );

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>{isSuperAdmin ? 'Administradores de Empresas' : 'Gestión de Usuarios'}</h1>
          <p>{isSuperAdmin ? 'Gestiona los administradores de cada empresa registrada' : 'Administra los usuarios y agentes de la empresa'}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={atUserLimit ? undefined : openCreate}
          disabled={atUserLimit}
          title={atUserLimit ? `Límite de ${limiteUsuarios} usuarios alcanzado. Actualiza tu plan para agregar más.` : undefined}
          style={atUserLimit ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
        >
          + {isSuperAdmin ? 'Nuevo Administrador' : 'Nuevo Usuario'}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>👥</div>
          <div>
            <h4>{isSuperAdmin ? 'Total Admins' : 'Total Usuarios'}</h4>
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
          <div className="admin-stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⏳</div>
          <div>
            <h4>Pendientes</h4>
            <span className="stat-val">{pendientes}</span>
          </div>
        </div>
        {!isSuperAdmin && (
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>🏷️</div>
            <div>
              <h4>Agentes</h4>
              <span className="stat-val">{users.filter(u => u.rol === 'SENIOR' || u.rol === 'JUNIOR').length}</span>
            </div>
          </div>
        )}
        {!isSuperAdmin && limiteUsuarios !== null && (
          <div className="admin-stat-card" style={atUserLimit ? { border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' } : {}}>
            <div className="admin-stat-icon" style={{ background: atUserLimit ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)' }}>
              {atUserLimit ? '🔒' : '📊'}
            </div>
            <div>
              <h4>Capacidad</h4>
              <span className="stat-val" style={{ color: atUserLimit ? 'var(--accent-red,#ef4444)' : undefined }}>
                {users.length} / {limiteUsuarios}
              </span>
            </div>
          </div>
        )}
      </div>

      {atUserLimit && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red,#ef4444)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Has alcanzado el límite de <strong>{limiteUsuarios} usuarios</strong> de tu plan. Contacta con soporte para actualizar tu plan.</span>
        </div>
      )}

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
                {isSuperAdmin ? <th>Empresa</th> : <><th>Rol</th><th>Supervisor</th></>}
                <th>Estado</th>
                <th>Último Login</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={isSuperAdmin ? 5 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No hay usuarios registrados aún</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </td>
                  {isSuperAdmin ? (
                    <td>
                      <div style={{ fontWeight: 500 }}>{u.tenant?.nombre || '—'}</div>
                      {u.tenant && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span className={`admin-plan admin-plan-${u.tenant.plan}`}>{u.tenant.plan}</span>
                        </div>
                      )}
                    </td>
                  ) : (
                    <>
                      <td><span className={`admin-role admin-role-${u.rol}`}>{rolLabels[u.rol] || u.rol}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{u.supervisor?.nombre || '—'}</td>
                    </>
                  )}
                  <td>
                    {isBloqueado(u) ? (
                      <span className="admin-badge admin-badge-suspended" title={`Bloqueado por demasiados intentos fallidos. ${(u.intentos_login ?? 0) >= 9 ? 'Requiere desbloqueo manual.' : ''}`}>
                        <span className="admin-badge-dot" />
                        🔒 BLOQUEADO
                      </span>
                    ) : (
                      <span className={`admin-badge ${statusClass(u.estado)}`}>
                        <span className="admin-badge-dot" />
                        {u.estado}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {(u.ultimo_login || u.last_login_at) ? new Date((u.ultimo_login || u.last_login_at)!).toLocaleString() : 'Nunca'}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button onClick={() => openEdit(u)}>Editar</button>
                      {!isSuperAdmin && isBloqueado(u) && (
                        <button
                          className="btn-primary"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          disabled={unlocking === u.id}
                          title="Desbloquear cuenta (solo Admin)"
                          onClick={() => handleDesbloquear(u)}
                        >
                          {unlocking === u.id ? '...' : '🔓 Desbloquear'}
                        </button>
                      )}
                      {!isSuperAdmin && u.estado === 'ACTIVO' && !isBloqueado(u) && u.id !== user?.sub && (
                        <button
                          className="btn-danger-outline"
                          title="Desactivar y transferir propiedades/trámites"
                          onClick={() => openTransferModal(u)}
                        >
                          Desactivar
                        </button>
                      )}
                      {!isSuperAdmin && (u.rol === 'SENIOR' || u.rol === 'ADMIN') && (u._count?.subordinados ?? 0) > 0 && (
                        <button
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          title={`Reasignar los ${u._count?.subordinados} subordinados de ${u.nombre} a otro supervisor`}
                          onClick={() => openReasignarModal(u)}
                        >
                          🔀 Reasignar
                        </button>
                      )}
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
            <h2>{editing ? `Editar: ${editing.nombre}` : isSuperAdmin ? 'Nuevo Administrador' : 'Nuevo Usuario'}</h2>

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

            {isSuperAdmin ? (
              <div className="input-group" style={{ marginTop: 12 }}>
                <label>Empresa *</label>
                <select className="input-field" value={form.tenantId} onChange={(e) => updateField('tenantId', e.target.value)}>
                  <option value="">— Seleccionar empresa —</option>
                  {tenants.map(t => {
                    const ocupada = tenantsConAdmin.has(t.id);
                    return (
                      <option key={t.id} value={t.id} disabled={ocupada}>
                        {t.nombre} ({t.plan}){ocupada ? ' — ya tiene administrador' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
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
            )}

            {editing && (
              <div className="input-group" style={{ marginTop: 12 }}>
                <label>Estado</label>
                <select className="input-field" value={form.estado} onChange={(e) => updateField('estado', e.target.value)}>
                  {ESTADOS_USER.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

            {editing && editing.estado === 'PENDIENTE' && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Este usuario aún no ha activado su cuenta.
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
                  disabled={resending}
                  onClick={handleResendActivation}
                >
                  {resending ? 'Enviando...' : '✉ Reenviar correo'}
                </button>
              </div>
            )}

            {/* P-03: Reset 2FA button (only when editing an existing user) */}
            {editing && !isSuperAdmin && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  🔒 Si el usuario perdió acceso a su app autenticadora, puedes resetear su 2FA.
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap', color: 'var(--accent-amber, #f59e0b)' }}
                  onClick={async () => {
                    if (!confirm(`¿Resetear el 2FA de ${editing.nombre}? Deberá configurarlo nuevamente.`)) return;
                    try {
                      await apiRequest(`/api/users/${editing.id}/reset-2fa`, { method: 'POST', token: accessToken! });
                      alert('2FA reseteado. El usuario podrá configurarlo de nuevo en su próximo acceso.');
                    } catch (err: any) { alert(err.message); }
                  }}
                >
                  🔄 Resetear 2FA
                </button>
              </div>
            )}

            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !form.nombre || !form.email} onClick={handleSave}>
                {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : isSuperAdmin ? 'Crear Administrador' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal transferir y desactivar */}
      {transferModal && (
        <div className="admin-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setTransferModal(null); }}>
          <div className="admin-modal">
            <h2>Desactivar: {transferModal.nombre}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 16px' }}>
              Las propiedades y trámites activos del usuario serán transferidos al agente seleccionado antes de desactivar la cuenta.
            </p>

            {transferError && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>{transferError}</div>
            )}

            <div className="input-group">
              <label>Transferir a *</label>
              <select
                className="input-field"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              >
                <option value="">— Seleccionar agente destino —</option>
                {users
                  .filter((u) => u.id !== transferModal.id && u.estado === 'ACTIVO')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({rolLabels[u.rol] || u.rol})
                    </option>
                  ))}
              </select>
            </div>

            <div className="admin-modal-footer" style={{ marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setTransferModal(null)} disabled={transferring}>
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                disabled={!targetUserId || transferring}
                onClick={handleTransfer}
              >
                {transferring ? 'Transfiriendo…' : 'Transferir y Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reasignarModal && (
        <div className="admin-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setReasignarModal(null); }}>
          <div className="admin-modal">
            <h2>Reasignar subordinados de {reasignarModal.nombre}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Los <strong>{reasignarModal._count?.subordinados}</strong> subordinado(s) actuales de {reasignarModal.nombre} serán asignados al supervisor seleccionado. El usuario origen no se desactiva.
            </p>
            {reasignarError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{reasignarError}</div>}
            <div className="input-group" style={{ marginBottom: 20 }}>
              <label>Nuevo supervisor</label>
              <select
                className="input-field"
                value={reasignarTargetId}
                onChange={(e) => setReasignarTargetId(e.target.value)}
              >
                <option value="">— Seleccionar supervisor —</option>
                {users
                  .filter((u) => u.id !== reasignarModal.id && u.estado === 'ACTIVO' && (u.rol === 'SENIOR' || u.rol === 'ADMIN'))
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre} ({rolLabels[u.rol] || u.rol})</option>
                  ))}
              </select>
            </div>
            <div className="admin-modal-footer">
              <button className="btn btn-ghost" onClick={() => setReasignarModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!reasignarTargetId || reasignando} onClick={handleReasignar}>
                {reasignando ? 'Reasignando…' : '🔀 Confirmar reasignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
