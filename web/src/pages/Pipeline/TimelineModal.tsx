import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';

// ─── Constants ────────────────────────────────────────────────

const TIPOS = [
  { value: 'LLAMADA',   label: 'Llamada',      icon: '📞' },
  { value: 'VISITA',    label: 'Visita',       icon: '🏠' },
  { value: 'MENSAJE',   label: 'Mensaje',      icon: '💬' },
  { value: 'WHATSAPP',  label: 'WhatsApp',     icon: '📱' },
  { value: 'EMAIL',     label: 'Email',        icon: '✉️' },
  { value: 'NOTA',      label: 'Nota',         icon: '📝' },
];

const RESULTADOS = [
  { value: 'POSITIVO',      label: 'Positivo',      color: '#22c55e' },
  { value: 'NEUTRO',        label: 'Neutro',        color: '#94a3b8' },
  { value: 'NEGATIVO',      label: 'Negativo',      color: '#ef4444' },
  { value: 'SIN_RESPUESTA', label: 'Sin respuesta', color: '#f59e0b' },
];

const ESTADO_VISITA_COLORS: Record<string, string> = {
  PENDIENTE: '#f59e0b', CONFIRMADA: '#22c55e',
  CANCELADA: '#94a3b8', REALIZADA: '#3b82f6',
};

const tipoIcon   = (t: string) => TIPOS.find((x) => x.value === t)?.icon ?? '📋';
const resColor   = (r: string) => RESULTADOS.find((x) => x.value === r)?.color ?? '#94a3b8';
const fmtFecha   = (d: string | Date) =>
  new Date(d).toLocaleString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtTime    = (d: string | Date) =>
  new Date(d).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
const fmtDay     = (d: string | Date) =>
  new Date(d).toLocaleDateString('es-GT', { weekday: 'short', day: '2-digit', month: 'short' });
const padDtLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ─── Inline Visit Form ─────────────────────────────────────────

function AgendarVisitaForm({
  interesId, accessToken, onSaved, onCancel,
}: { interesId: string; accessToken: string; onSaved: () => void; onCancel: () => void }) {
  const mañana = new Date();
  mañana.setDate(mañana.getDate() + 1);
  mañana.setHours(10, 0, 0, 0);
  const mañanaFin = new Date(mañana);
  mañanaFin.setHours(11, 0, 0, 0);

  const [form, setForm] = useState({
    fechaInicio: padDtLocal(mañana),
    fechaFin:    padDtLocal(mañanaFin),
    ubicacion:   '',
    notas:       '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', boxSizing: 'border-box',
    background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
    borderRadius: 6, color: 'var(--text-primary)', fontFamily: 'inherit',
    fontSize: '0.8125rem', outline: 'none',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await apiRequest('/api/visitas', {
        method: 'POST', token: accessToken,
        body: {
          interesId,
          fechaInicio: new Date(form.fechaInicio).toISOString(),
          fechaFin:    new Date(form.fechaFin).toISOString(),
          ubicacion:   form.ubicacion || undefined,
          notas:       form.notas    || undefined,
        },
      });
      onSaved();
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label className="visita-form-label">Inicio *</label>
          <input type="datetime-local" style={inputStyle} value={form.fechaInicio}
            onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))} required />
        </div>
        <div>
          <label className="visita-form-label">Fin *</label>
          <input type="datetime-local" style={inputStyle} value={form.fechaFin}
            onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))} required />
        </div>
      </div>
      <div>
        <label className="visita-form-label">Ubicación</label>
        <input style={inputStyle} placeholder="Ej. Zona 15, Guatemala"
          value={form.ubicacion} onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))} />
      </div>
      <div>
        <label className="visita-form-label">Notas</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 52 }}
          placeholder="Instrucciones de acceso, puntos a revisar..."
          value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
      </div>
      {error && (
        <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#fca5a5', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8125rem' }} disabled={saving}>
          {saving ? 'Agendando...' : '📅 Agendar visita'}
        </button>
      </div>
    </form>
  );
}

// ─── Visit Card ────────────────────────────────────────────────

function VisitaItem({ visita, accessToken, onDelete }: { visita: any; accessToken: string; onDelete: () => void }) {
  const color = ESTADO_VISITA_COLORS[visita.estado] ?? '#94a3b8';

  const handleIcs = async () => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/visitas/${visita.id}/ics`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = `visita-${visita.id}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="timeline-item" style={{ alignItems: 'flex-start' }}>
      <div className="timeline-item-icon" style={{ background: `${color}18`, borderColor: `${color}44` }}>📅</div>
      <div className="timeline-item-body">
        <div className="timeline-item-meta">
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{fmtDay(visita.fecha_inicio)}</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {fmtTime(visita.fecha_inicio)} – {fmtTime(visita.fecha_fin)}
          </span>
          <span className="timeline-resultado" style={{ background: `${color}22`, color }}>
            {visita.estado}
          </span>
        </div>
        {visita.ubicacion && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
            📍 {visita.ubicacion}
          </div>
        )}
        {visita.notas && (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {visita.notas}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, paddingTop: 2 }}>
        <button
          onClick={handleIcs} title="Descargar .ics"
          style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 6px' }}
        >📆 .ics</button>
        <button
          onClick={onDelete} title="Eliminar"
          className="timeline-delete-btn"
          style={{ position: 'static', opacity: 1 }}
        >✕</button>
      </div>
    </div>
  );
}

// ─── Timeline Modal ────────────────────────────────────────────

interface Props { item: any; onClose: () => void; }

export default function TimelineModal({ item, onClose }: Props) {
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<'interacciones' | 'visitas'>('interacciones');

  // Interacciones state
  const [interacciones, setInteracciones] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [form, setForm] = useState({ tipo: 'LLAMADA', resultado: 'NEUTRO', notas: '', duracionMin: '', fecha: '' });

  // Visitas state
  const [visitas,         setVisitas]         = useState<any[]>([]);
  const [loadingVisitas,  setLoadingVisitas]  = useState(false);
  const [showVisitaForm,  setShowVisitaForm]  = useState(false);

  const fetchTimeline = useCallback(async () => {
    try {
      setInteracciones(await apiRequest<any[]>(`/api/interacciones?interesId=${item.id}`, { token: accessToken! }));
    } catch { } finally { setLoading(false); }
  }, [item.id, accessToken]);

  const fetchVisitas = useCallback(async () => {
    setLoadingVisitas(true);
    try {
      setVisitas(await apiRequest<any[]>(`/api/visitas?interesId=${item.id}`, { token: accessToken! }));
    } catch { } finally { setLoadingVisitas(false); }
  }, [item.id, accessToken]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);
  useEffect(() => { fetchVisitas();  }, [fetchVisitas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiRequest('/api/interacciones', {
        method: 'POST', token: accessToken!,
        body: {
          interesId:   item.id,
          tipo:        form.tipo,
          resultado:   form.resultado,
          notas:       form.notas      || undefined,
          duracionMin: form.duracionMin ? Number(form.duracionMin) : undefined,
          fecha:       form.fecha      || undefined,
        },
      });
      setForm({ tipo: 'LLAMADA', resultado: 'NEUTRO', notas: '', duracionMin: '', fecha: '' });
      await fetchTimeline();
      toast.success('Interacción registrada');
    } catch (err: any) { toast.error(err.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDeleteInteraccion = async (id: string) => {
    const ok = await confirm({ title: '¿Eliminar interacción?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await apiRequest(`/api/interacciones/${id}`, { method: 'DELETE', token: accessToken! });
      setInteracciones((prev) => prev.filter((i) => i.id !== id));
      toast.success('Interacción eliminada');
    } catch (err: any) { toast.error(err.message ?? 'Error al eliminar'); }
  };

  const handleDeleteVisita = async (id: string) => {
    const ok = await confirm({ title: '¿Eliminar visita?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await apiRequest(`/api/visitas/${id}`, { method: 'DELETE', token: accessToken! });
      setVisitas((prev) => prev.filter((v) => v.id !== id));
      toast.success('Visita eliminada');
    } catch (err: any) { toast.error(err.message ?? 'Error al eliminar'); }
  };

  const estadoColor: Record<string, string> = {
    NUEVO: '#64748b', CONTACTADO: '#3b82f6', INTERESADO: '#f59e0b',
    EN_NEGOCIACION: '#8b5cf6', GANADO: '#22c55e', PERDIDO: '#ef4444',
  };

  return (
    <div className="pipeline-modal-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="timeline-drawer" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="timeline-header">
          <div>
            <h3 style={{ margin: 0 }}>Trámite</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {item.propiedad?.codigo} — {item.propiedad?.titulo}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Cliente: <strong style={{ color: 'var(--text-primary)' }}>{item.cliente?.nombre}</strong>
              {'  '}
              <span style={{ background: `${estadoColor[item.estado]}22`, color: estadoColor[item.estado], padding: '2px 8px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 600 }}>
                {item.estado}
              </span>
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ flexShrink: 0 }}>✕ Cerrar</button>
        </div>

        {/* ── Tabs ── */}
        <div className="timeline-tabs">
          <button
            className={`timeline-tab${tab === 'interacciones' ? ' active' : ''}`}
            onClick={() => setTab('interacciones')}
          >
            📋 Interacciones
            {interacciones.length > 0 && <span className="timeline-tab-badge">{interacciones.length}</span>}
          </button>
          <button
            className={`timeline-tab${tab === 'visitas' ? ' active' : ''}`}
            onClick={() => { setTab('visitas'); setShowVisitaForm(false); }}
          >
            📅 Visitas
            {visitas.length > 0 && <span className="timeline-tab-badge">{visitas.length}</span>}
          </button>
        </div>

        {/* ── Tab: Interacciones ── */}
        {tab === 'interacciones' && (
          <>
            <form className="timeline-form" onSubmit={handleSubmit}>
              <div className="timeline-form-row">
                <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <select value={form.resultado} onChange={(e) => setForm((f) => ({ ...f, resultado: e.target.value }))}>
                  {RESULTADOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <input type="number" placeholder="Duración (min)" value={form.duracionMin} min={1}
                  onChange={(e) => setForm((f) => ({ ...f, duracionMin: e.target.value }))}
                  style={{ width: 130 }} />
              </div>
              <div className="timeline-form-row">
                <textarea placeholder="Notas sobre la interacción..." value={form.notas} rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} style={{ flex: 1 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input type="datetime-local" value={form.fecha} style={{ fontSize: '0.8125rem' }}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ whiteSpace: 'nowrap' }}>
                    {saving ? '...' : '+ Registrar'}
                  </button>
                </div>
              </div>
            </form>

            <div className="timeline-list">
              <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {loading ? 'Cargando...' : `${interacciones.length} interacción${interacciones.length !== 1 ? 'es' : ''}`}
              </p>
              {!loading && interacciones.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>📋</p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Sin interacciones registradas</p>
                </div>
              )}
              {interacciones.map((i) => (
                <div key={i.id} className="timeline-item">
                  <div className="timeline-item-icon">{tipoIcon(i.tipo)}</div>
                  <div className="timeline-item-body">
                    <div className="timeline-item-meta">
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {TIPOS.find((t) => t.value === i.tipo)?.label ?? i.tipo}
                      </span>
                      <span className="timeline-resultado"
                        style={{ background: `${resColor(i.resultado)}22`, color: resColor(i.resultado) }}>
                        {RESULTADOS.find((r) => r.value === i.resultado)?.label ?? i.resultado}
                      </span>
                      {i.duracion_min && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ {i.duracion_min} min</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {fmtFecha(i.fecha)}{i.usuario?.nombre && ` · ${i.usuario.nombre}`}
                    </div>
                    {i.notas && <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{i.notas}</p>}
                  </div>
                  <button className="timeline-delete-btn" onClick={() => handleDeleteInteraccion(i.id)} title="Eliminar">✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Tab: Visitas ── */}
        {tab === 'visitas' && (
          <div className="timeline-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {loadingVisitas ? 'Cargando...' : `${visitas.length} visita${visitas.length !== 1 ? 's' : ''}`}
              </p>
              {!showVisitaForm && (
                <button className="btn btn-primary" style={{ fontSize: '0.8125rem' }}
                  onClick={() => setShowVisitaForm(true)}>
                  📅 Agendar visita
                </button>
              )}
            </div>

            {showVisitaForm && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: '0.875rem' }}>Nueva visita</p>
                <AgendarVisitaForm
                  interesId={item.id}
                  accessToken={accessToken!}
                  onSaved={() => { setShowVisitaForm(false); fetchVisitas(); }}
                  onCancel={() => setShowVisitaForm(false)}
                />
              </div>
            )}

            {!loadingVisitas && visitas.length === 0 && !showVisitaForm && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>📅</p>
                <p style={{ margin: '0 0 16px', fontSize: '0.875rem' }}>Sin visitas programadas</p>
                <button className="btn btn-primary" style={{ fontSize: '0.8125rem' }}
                  onClick={() => setShowVisitaForm(true)}>
                  + Agendar primera visita
                </button>
              </div>
            )}

            {visitas.map((v) => (
              <VisitaItem
                key={v.id} visita={v} accessToken={accessToken!}
                onDelete={() => handleDeleteVisita(v.id)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
