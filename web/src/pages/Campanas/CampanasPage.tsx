import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Campanas.css';

// ─── Types ────────────────────────────────────────────────────

interface Plantilla {
  id: string; nombre: string; asunto: string; variables: string[];
  cuerpo_html?: string; created_at: string; updated_at: string;
}

interface Campana {
  id: string; nombre: string; estado: string; total_enviados: number;
  total_abiertos: number; tasa_apertura: number; enviada_at: string | null;
  created_at: string; filtro_rol: string[]; variables_data: Record<string, string>;
  plantilla: { nombre: string };
  plantilla_id: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SENIOR', label: 'Agente Senior' },
  { value: 'JUNIOR', label: 'Agente Junior' },
];

const ESTADO_BADGE: Record<string, { label: string; cls: string }> = {
  BORRADOR:  { label: 'Borrador',  cls: 'estado-borrador' },
  ENVIANDO:  { label: 'Enviando…', cls: 'estado-enviando' },
  ENVIADA:   { label: 'Enviada',   cls: 'estado-enviada' },
  FALLIDA:   { label: 'Fallida',   cls: 'estado-fallida' },
};

// ─── Plantillas Tab ───────────────────────────────────────────

function PlantillasTab({ token }: { token: string }) {
  const [list, setList] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plantilla | null>(null);
  const [preview, setPreview] = useState<{ asunto: string; cuerpo_html: string } | null>(null);

  const [form, setForm] = useState({ nombre: '', asunto: '', cuerpo_html: '' });
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Plantilla[]>('/api/campanas/plantillas', { token });
      setList(data);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ nombre: '', asunto: '', cuerpo_html: '' }); setPreview(null); setShowModal(true); };
  const openEdit = (p: Plantilla) => { setEditing(p); setForm({ nombre: p.nombre, asunto: p.asunto, cuerpo_html: p.cuerpo_html ?? '' }); setPreview(null); setShowModal(true); };

  const save = async () => {
    if (!form.nombre.trim() || !form.asunto.trim() || !form.cuerpo_html.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(`/api/campanas/plantillas/${editing.id}`, { token, method: 'PUT', body: form });
      } else {
        await apiRequest('/api/campanas/plantillas', { token, method: 'POST', body: form });
      }
      setShowModal(false);
      load();
    } catch { /* noop */ } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try { await apiRequest(`/api/campanas/plantillas/${id}`, { token, method: 'DELETE' }); load(); } catch { /* noop */ }
  };

  const doPreview = async () => {
    if (!editing) return;
    setPreviewing(true);
    try {
      const res = await apiRequest<{ asunto: string; cuerpo_html: string }>(
        `/api/campanas/plantillas/${editing.id}/preview`, { token, method: 'POST', body: {} },
      );
      setPreview(res);
    } catch { /* noop */ } finally { setPreviewing(false); }
  };

  const detectedVars = [...new Set([...form.asunto.matchAll(/\{\{(\w+)\}\}/g), ...form.cuerpo_html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];

  return (
    <div>
      <div className="camp-toolbar">
        <span className="camp-count">{list.length} plantilla{list.length !== 1 ? 's' : ''}</span>
        <button className="btn-primary" onClick={openCreate}>+ Nueva plantilla</button>
      </div>

      {loading ? <div className="camp-loading"><div className="spinner" /></div> : (
        list.length === 0
          ? <div className="camp-empty">Sin plantillas. Crea la primera.</div>
          : <div className="plantillas-grid">
              {list.map(p => (
                <div key={p.id} className="plantilla-card">
                  <div className="plantilla-card-header">
                    <div className="plantilla-nombre">{p.nombre}</div>
                    <div className="plantilla-actions">
                      <button className="btn-icon" title="Editar" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn-icon btn-icon-danger" title="Eliminar" onClick={() => del(p.id)}>🗑️</button>
                    </div>
                  </div>
                  <div className="plantilla-asunto">{p.asunto}</div>
                  {p.variables.length > 0 && (
                    <div className="plantilla-vars">
                      {p.variables.map(v => <span key={v} className="var-pill">{'{{' + v + '}}'}</span>)}
                    </div>
                  )}
                  <div className="plantilla-meta">{new Date(p.updated_at).toLocaleDateString('es-GT')}</div>
                </div>
              ))}
            </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-box modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Nombre</label>
              <input className="field-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Bienvenida a nuevos agentes" />

              <label className="field-label">Asunto del email</label>
              <input className="field-input" value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))} placeholder="Hola {{nombre}}, bienvenido/a al equipo" />

              <label className="field-label">Cuerpo HTML</label>
              <p className="field-hint">Usa <code>{'{{variable}}'}</code> para insertar valores dinámicos.</p>
              <textarea
                className="field-textarea field-code"
                rows={10}
                value={form.cuerpo_html}
                onChange={e => setForm(f => ({ ...f, cuerpo_html: e.target.value }))}
                placeholder="<p>Hola <strong>{{nombre}}</strong>,</p><p>Tu rol es <em>{{rol}}</em>.</p>"
              />

              {detectedVars.length > 0 && (
                <div className="vars-detected">
                  <span className="vars-label">Variables detectadas:</span>
                  {detectedVars.map(v => <span key={v} className="var-pill">{'{{' + v + '}}'}</span>)}
                  <span className="vars-hint">· Automáticas: nombre, email, rol</span>
                </div>
              )}

              {editing && (
                <div className="preview-section">
                  <button className="btn-ghost" onClick={doPreview} disabled={previewing}>
                    {previewing ? 'Generando…' : '👁 Vista previa'}
                  </button>
                  {preview && (
                    <div className="preview-box">
                      <div className="preview-subject">Asunto: {preview.asunto}</div>
                      <iframe className="preview-iframe" srcDoc={preview.cuerpo_html} title="Preview" />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Campañas Tab ─────────────────────────────────────────────

function CampanasTab({ token }: { token: string }) {
  const [list, setList] = useState<Campana[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Campana | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    plantilla_id: '',
    filtro_rol: [] as string[],
    variables_data: {} as Record<string, string>,
  });
  const [extraVarKey, setExtraVarKey] = useState('');
  const [extraVarVal, setExtraVarVal] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [camp, plant] = await Promise.all([
        apiRequest<Campana[]>('/api/campanas', { token }),
        apiRequest<Plantilla[]>('/api/campanas/plantillas', { token }),
      ]);
      setList(camp);
      setPlantillas(plant);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const selectedPlantilla = plantillas.find(p => p.id === form.plantilla_id);
  const plantillaVars = selectedPlantilla?.variables.filter(v => !['nombre', 'email', 'rol'].includes(v)) ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', plantilla_id: '', filtro_rol: [], variables_data: {} });
    setShowModal(true);
  };
  const openEdit = (c: Campana) => {
    setEditing(c);
    setForm({ nombre: c.nombre, plantilla_id: c.plantilla_id, filtro_rol: c.filtro_rol, variables_data: c.variables_data });
    setShowModal(true);
  };

  const toggleRol = (rol: string) => {
    setForm(f => ({
      ...f,
      filtro_rol: f.filtro_rol.includes(rol) ? f.filtro_rol.filter(r => r !== rol) : [...f.filtro_rol, rol],
    }));
  };

  const addVar = () => {
    if (!extraVarKey.trim()) return;
    setForm(f => ({ ...f, variables_data: { ...f.variables_data, [extraVarKey.trim()]: extraVarVal } }));
    setExtraVarKey(''); setExtraVarVal('');
  };
  const removeVar = (key: string) => {
    setForm(f => { const d = { ...f.variables_data }; delete d[key]; return { ...f, variables_data: d }; });
  };

  const save = async () => {
    if (!form.nombre.trim() || !form.plantilla_id) return;
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(`/api/campanas/${editing.id}`, { token, method: 'PUT', body: form });
      } else {
        await apiRequest('/api/campanas', { token, method: 'POST', body: form });
      }
      setShowModal(false);
      load();
    } catch { /* noop */ } finally { setSaving(false); }
  };

  const enviar = async (id: string) => {
    if (!confirm('¿Enviar esta campaña ahora? Esta acción no se puede deshacer.')) return;
    setSending(id);
    try {
      await apiRequest(`/api/campanas/${id}/enviar`, { token, method: 'POST' });
      load();
    } catch { /* noop */ } finally { setSending(null); }
  };

  return (
    <div>
      <div className="camp-toolbar">
        <span className="camp-count">{list.length} campaña{list.length !== 1 ? 's' : ''}</span>
        <button className="btn-primary" onClick={openCreate} disabled={plantillas.length === 0}>
          + Nueva campaña
        </button>
      </div>
      {plantillas.length === 0 && <p className="field-hint" style={{ marginBottom: 12 }}>Crea al menos una plantilla antes de crear campañas.</p>}

      {loading ? <div className="camp-loading"><div className="spinner" /></div> : (
        list.length === 0
          ? <div className="camp-empty">Sin campañas aún.</div>
          : <div className="campanas-list">
              {list.map(c => {
                const est = ESTADO_BADGE[c.estado] ?? { label: c.estado, cls: '' };
                return (
                  <div key={c.id} className="campana-row">
                    <div className="campana-row-main">
                      <div>
                        <div className="campana-nombre">{c.nombre}</div>
                        <div className="campana-meta">
                          Plantilla: <strong>{c.plantilla.nombre}</strong>
                          {c.filtro_rol.length > 0 && ` · Roles: ${c.filtro_rol.join(', ')}`}
                          {c.enviada_at && ` · ${new Date(c.enviada_at).toLocaleDateString('es-GT')}`}
                        </div>
                      </div>
                      <div className="campana-row-right">
                        <span className={`estado-badge ${est.cls}`}>{est.label}</span>
                        {c.estado === 'BORRADOR' && (
                          <>
                            <button className="btn-icon" onClick={() => openEdit(c)}>✏️</button>
                            <button className="btn-send" onClick={() => enviar(c.id)} disabled={sending === c.id}>
                              {sending === c.id ? '…' : '✉️ Enviar'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {c.estado === 'ENVIADA' && (
                      <div className="campana-stats">
                        <span className="stat-chip">📤 {c.total_enviados} enviados</span>
                        <span className="stat-chip">📬 {c.total_abiertos} abiertos</span>
                        <span className="stat-chip">📊 {c.tasa_apertura}% apertura</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Editar campaña' : 'Nueva campaña'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Nombre de la campaña</label>
              <input className="field-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Newsletter mayo 2026" />

              <label className="field-label">Plantilla</label>
              <select className="field-input" value={form.plantilla_id} onChange={e => setForm(f => ({ ...f, plantilla_id: e.target.value, variables_data: {} }))}>
                <option value="">Seleccionar…</option>
                {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>

              {selectedPlantilla && (
                <p className="field-hint">Asunto: <em>{selectedPlantilla.asunto}</em></p>
              )}

              <label className="field-label">Destinatarios (roles)</label>
              <p className="field-hint">Sin selección = todos los usuarios activos.</p>
              <div className="roles-check-group">
                {ROLES.map(r => (
                  <label key={r.value} className="role-check">
                    <input type="checkbox" checked={form.filtro_rol.includes(r.value)} onChange={() => toggleRol(r.value)} />
                    {r.label}
                  </label>
                ))}
              </div>

              {plantillaVars.length > 0 && (
                <>
                  <label className="field-label">Variables de la plantilla</label>
                  <p className="field-hint">Valores estáticos para las variables de esta plantilla.</p>
                  {plantillaVars.map(v => (
                    <div key={v} className="var-row">
                      <span className="var-pill">{'{{' + v + '}}'}</span>
                      <input
                        className="field-input var-input"
                        value={form.variables_data[v] ?? ''}
                        onChange={e => setForm(f => ({ ...f, variables_data: { ...f.variables_data, [v]: e.target.value } }))}
                        placeholder={`Valor para ${v}`}
                      />
                    </div>
                  ))}
                </>
              )}

              <label className="field-label">Variables adicionales</label>
              <div className="extra-var-row">
                <input className="field-input" value={extraVarKey} onChange={e => setExtraVarKey(e.target.value)} placeholder="nombre_variable" style={{ flex: 1 }} />
                <input className="field-input" value={extraVarVal} onChange={e => setExtraVarVal(e.target.value)} placeholder="valor" style={{ flex: 2 }} />
                <button className="btn-ghost" onClick={addVar}>+</button>
              </div>
              {Object.entries(form.variables_data).filter(([k]) => !plantillaVars.includes(k)).map(([k, v]) => (
                <div key={k} className="var-row">
                  <span className="var-pill">{'{{' + k + '}}'}</span>
                  <span className="var-val">{v}</span>
                  <button className="btn-icon btn-icon-danger" onClick={() => removeVar(k)}>×</button>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.nombre.trim() || !form.plantilla_id}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

type Tab = 'plantillas' | 'campanas';

export default function CampanasPage() {
  const { accessToken } = useAuthStore();
  const [tab, setTab] = useState<Tab>('plantillas');

  return (
    <div className="campanas-page">
      <div className="campanas-header">
        <h1>Campañas de Email</h1>
      </div>

      <div className="camp-tabs">
        <button className={`camp-tab ${tab === 'plantillas' ? 'camp-tab-active' : ''}`} onClick={() => setTab('plantillas')}>
          📄 Plantillas
        </button>
        <button className={`camp-tab ${tab === 'campanas' ? 'camp-tab-active' : ''}`} onClick={() => setTab('campanas')}>
          ✉️ Campañas
        </button>
      </div>

      <div className="camp-tab-body">
        {tab === 'plantillas' ? <PlantillasTab token={accessToken!} /> : <CampanasTab token={accessToken!} />}
      </div>
    </div>
  );
}
