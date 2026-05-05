import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Agenda.css';

// ─── Week helpers ─────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-GT', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

function fmtDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// ─── Estado colors ────────────────────────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#f59e0b',
  CONFIRMADA: '#22c55e',
  CANCELADA: '#94a3b8',
  REALIZADA: '#3b82f6',
};

const ESTADOS_VISITA = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'REALIZADA'];

// ─── Visita Form Modal ────────────────────────────────────────

interface VisitaFormProps {
  pipeline: any[];
  initial?: any;
  defaultDate?: Date;
  accessToken: string;
  onSaved: () => void;
  onClose: () => void;
}

function VisitaFormModal({ pipeline, initial, defaultDate, accessToken, onSaved, onClose }: VisitaFormProps) {
  const isEdit = !!initial;
  const d = defaultDate ?? new Date();
  const dPlus1 = new Date(d);
  dPlus1.setHours(d.getHours() + 1);

  const [form, setForm] = useState({
    interesId: initial?.interes_id ?? '',
    fechaInicio: initial ? fmtDatetimeLocal(new Date(initial.fecha_inicio)) : fmtDatetimeLocal(d),
    fechaFin: initial ? fmtDatetimeLocal(new Date(initial.fecha_fin)) : fmtDatetimeLocal(dPlus1),
    ubicacion: initial?.ubicacion ?? '',
    notas: initial?.notas ?? '',
    estado: initial?.estado ?? 'PENDIENTE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filteredPipeline = search
    ? pipeline.filter((p) =>
        `${p.cliente?.nombre} ${p.propiedad?.codigo} ${p.propiedad?.titulo}`
          .toLowerCase().includes(search.toLowerCase()),
      )
    : pipeline;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.interesId) { setError('Selecciona un trámite'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await apiRequest(`/api/visitas/${initial.id}`, {
          method: 'PATCH',
          token: accessToken,
          body: {
            fechaInicio: new Date(form.fechaInicio).toISOString(),
            fechaFin: new Date(form.fechaFin).toISOString(),
            ubicacion: form.ubicacion || undefined,
            notas: form.notas || undefined,
            estado: form.estado,
          },
        });
      } else {
        await apiRequest('/api/visitas', {
          method: 'POST',
          token: accessToken,
          body: {
            interesId: form.interesId,
            fechaInicio: new Date(form.fechaInicio).toISOString(),
            fechaFin: new Date(form.fechaFin).toISOString(),
            ubicacion: form.ubicacion || undefined,
            notas: form.notas || undefined,
          },
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = pipeline.find((p) => p.id === form.interesId);

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.0625rem', fontWeight: 700 }}>
          {isEdit ? 'Editar visita' : 'Nueva visita'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Trámite selector */}
          {!isEdit && (
            <div>
              <label className="agenda-label">Trámite *</label>
              <input
                className="agenda-input"
                placeholder="Buscar cliente o propiedad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="agenda-interes-list">
                {filteredPipeline.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className={`agenda-interes-item${form.interesId === p.id ? ' selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, interesId: p.id }))}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.cliente?.nombre}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {p.propiedad?.codigo} — {p.propiedad?.titulo}
                    </span>
                  </div>
                ))}
                {filteredPipeline.length === 0 && (
                  <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Sin resultados
                  </div>
                )}
              </div>
            </div>
          )}
          {isEdit && selectedItem && (
            <div className="agenda-interes-preview">
              <span style={{ fontWeight: 600 }}>{selectedItem.cliente?.nombre}</span>
              {' · '}
              <span style={{ color: 'var(--text-muted)' }}>{selectedItem.propiedad?.codigo}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="agenda-label">Inicio *</label>
              <input
                type="datetime-local"
                className="agenda-input"
                value={form.fechaInicio}
                onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="agenda-label">Fin *</label>
              <input
                type="datetime-local"
                className="agenda-input"
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="agenda-label">Ubicación</label>
            <input
              className="agenda-input"
              placeholder="Ej. Zona 15, Ciudad de Guatemala"
              value={form.ubicacion}
              onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
            />
          </div>

          <div>
            <label className="agenda-label">Notas</label>
            <textarea
              className="agenda-input"
              style={{ resize: 'vertical', minHeight: 60 }}
              placeholder="Instrucciones de acceso, puntos a revisar..."
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            />
          </div>

          {isEdit && (
            <div>
              <label className="agenda-label">Estado</label>
              <select
                className="agenda-input"
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
              >
                {ESTADOS_VISITA.map((s) => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="agenda-error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '...' : isEdit ? 'Guardar cambios' : '+ Agendar visita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reporte Modal ────────────────────────────────────────────

interface ReporteModalProps {
  visita: any;
  accessToken: string;
  onSaved: () => void;
  onClose: () => void;
}

function ReporteModal({ visita, accessToken, onSaved, onClose }: ReporteModalProps) {
  const [form, setForm] = useState({
    notas: visita.reporte_notas ?? '',
    nivelInteres: visita.reporte_nivel_interes ?? '',
    reaccion: visita.reporte_reaccion ?? '',
    siguientePaso: visita.reporte_siguiente_paso ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/api/visitas/${visita.id}/reporte`, {
        method: 'PATCH',
        token: accessToken,
        body: {
          notas: form.notas || undefined,
          nivelInteres: form.nivelInteres || undefined,
          reaccion: form.reaccion || undefined,
          siguientePaso: form.siguientePaso || undefined,
        },
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const yaCompletado = !!visita.reporte_fecha;

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.0625rem', fontWeight: 700 }}>
          📋 Reporte de visita
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {visita.interes?.cliente?.nombre} · {visita.interes?.propiedad?.codigo}
          {yaCompletado && (
            <span style={{ marginLeft: 8, color: '#22c55e', fontWeight: 600 }}>✓ Completado</span>
          )}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="agenda-label">Nivel de interés del cliente</label>
            <select
              className="agenda-input"
              value={form.nivelInteres}
              onChange={(e) => setForm((f) => ({ ...f, nivelInteres: e.target.value }))}
            >
              <option value="">Sin especificar</option>
              <option value="Muy alto">Muy alto — quiere cerrar pronto</option>
              <option value="Alto">Alto — interesado, pide más info</option>
              <option value="Medio">Medio — requiere más visitas</option>
              <option value="Bajo">Bajo — dudoso / comparando</option>
              <option value="Sin interés">Sin interés</option>
            </select>
          </div>

          <div>
            <label className="agenda-label">Reacción general</label>
            <select
              className="agenda-input"
              value={form.reaccion}
              onChange={(e) => setForm((f) => ({ ...f, reaccion: e.target.value }))}
            >
              <option value="">Sin especificar</option>
              <option value="Muy positiva">Muy positiva</option>
              <option value="Positiva">Positiva</option>
              <option value="Neutral">Neutral</option>
              <option value="Negativa">Negativa</option>
              <option value="No asistió">No asistió</option>
            </select>
          </div>

          <div>
            <label className="agenda-label">Notas de la visita</label>
            <textarea
              className="agenda-input"
              style={{ resize: 'vertical', minHeight: 70 }}
              placeholder="Observaciones, puntos clave, aspectos a destacar..."
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            />
          </div>

          <div>
            <label className="agenda-label">Siguiente paso</label>
            <input
              className="agenda-input"
              placeholder="Ej. Enviar propuesta, agendar segunda visita, esperar respuesta..."
              value={form.siguientePaso}
              onChange={(e) => setForm((f) => ({ ...f, siguientePaso: e.target.value }))}
            />
          </div>

          {error && <div className="agenda-error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '...' : yaCompletado ? 'Actualizar reporte' : 'Guardar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Visita Card ──────────────────────────────────────────────

function VisitaCard({ visita, onEdit, onDelete, onIcs, onReporte }: {
  visita: any;
  onEdit: () => void;
  onDelete: () => void;
  onIcs: () => void;
  onReporte: () => void;
}) {
  const color = ESTADO_COLORS[visita.estado] ?? '#94a3b8';
  const isPast = new Date(visita.fecha_fin) < new Date();
  const needsReporte = isPast && visita.estado !== 'CANCELADA' && !visita.reporte_fecha;
  return (
    <div className="agenda-event" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="agenda-event-time">
        {fmtTime(visita.fecha_inicio)} – {fmtTime(visita.fecha_fin)}
      </div>
      <div className="agenda-event-client">{visita.interes?.cliente?.nombre}</div>
      <div className="agenda-event-prop">
        {visita.interes?.propiedad?.codigo}
        {visita.ubicacion && (
          <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>· {visita.ubicacion}</span>
        )}
      </div>
      <span className="agenda-event-estado" style={{ color, background: `${color}22` }}>
        {visita.estado}
      </span>
      <div className="agenda-event-actions">
        <button onClick={onEdit} title="Editar">✏️</button>
        {isPast && visita.estado !== 'CANCELADA' && (
          <button
            onClick={onReporte}
            title={visita.reporte_fecha ? 'Ver reporte' : 'Completar reporte'}
            style={{ color: needsReporte ? '#f59e0b' : '#22c55e' }}
          >
            📋
          </button>
        )}
        <button onClick={onIcs} title="Descargar .ics">📅</button>
        <button onClick={onDelete} title="Eliminar" className="agenda-delete">✕</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function AgendaPage() {
  const { accessToken } = useAuthStore();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [visitas, setVisitas] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<
    | { mode: 'create'; defaultDate?: Date }
    | { mode: 'edit'; visita: any }
    | { mode: 'reporte'; visita: any }
    | null
  >(null);

  const days = getWeekDays(weekStart);
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);

  const fetchVisitas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>(
        `/api/visitas?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`,
        { token: accessToken! },
      );
      setVisitas(data);
    } catch { }
    finally { setLoading(false); }
  }, [weekStart, accessToken]); // eslint-disable-line

  const fetchPipeline = useCallback(async () => {
    try {
      const data = await apiRequest<Record<string, any[]>>('/api/pipeline', { token: accessToken! });
      setPipeline(Object.values(data).flat());
    } catch { }
  }, [accessToken]);

  useEffect(() => { fetchVisitas(); }, [fetchVisitas]);
  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta visita?')) return;
    try {
      await apiRequest(`/api/visitas/${id}`, { method: 'DELETE', token: accessToken! });
      setVisitas((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const handleDownloadIcs = async (id: string) => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/visitas/${id}/ics`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { alert('Error descargando el archivo'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visita-${id}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const today = new Date();
  const isCurrentWeek = isSameDay(weekStart, getWeekStart(today));

  const fmtWeekRange = () => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${weekStart.toLocaleDateString('es-GT', opts)} – ${weekEnd.toLocaleDateString('es-GT', { ...opts, year: 'numeric' })}`;
  };

  return (
    <div className="agenda-page">
      {/* ── Header ── */}
      <div className="agenda-header">
        <div>
          <h1>Agenda</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 2 }}>
            {fmtWeekRange()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            ← Sem. anterior
          </button>
          {!isCurrentWeek && (
            <button className="btn btn-ghost" onClick={() => setWeekStart(getWeekStart(new Date()))}>
              Hoy
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            Sem. siguiente →
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setModalState({ mode: 'create' })}
          >
            + Nueva visita
          </button>
        </div>
      </div>

      {/* ── Week grid ── */}
      <div className="agenda-grid">
        {days.map((day) => {
          const dayVisitas = visitas.filter((v) => isSameDay(new Date(v.fecha_inicio), day));
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className={`agenda-day${isToday ? ' agenda-day-today' : ''}`}>
              <div className="agenda-day-header">
                <span className="agenda-day-name">{fmtDate(day)}</span>
                {dayVisitas.length > 0 && (
                  <span className="agenda-day-count">{dayVisitas.length}</span>
                )}
              </div>
              <div className="agenda-day-body">
                {loading ? (
                  <div className="agenda-loading">...</div>
                ) : dayVisitas.length === 0 ? (
                  <button
                    className="agenda-add-slot"
                    onClick={() => setModalState({ mode: 'create', defaultDate: day })}
                    title="Agendar visita este día"
                  >
                    +
                  </button>
                ) : (
                  <>
                    {dayVisitas.map((v) => (
                      <VisitaCard
                        key={v.id}
                        visita={v}
                        onEdit={() => setModalState({ mode: 'edit', visita: v })}
                        onDelete={() => handleDelete(v.id)}
                        onIcs={() => handleDownloadIcs(v.id)}
                        onReporte={() => setModalState({ mode: 'reporte', visita: v })}
                      />
                    ))}
                    <button
                      className="agenda-add-slot"
                      onClick={() => setModalState({ mode: 'create', defaultDate: day })}
                      title="Agregar otra visita"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {modalState && modalState.mode !== 'reporte' && (
        <VisitaFormModal
          pipeline={pipeline}
          initial={modalState.mode === 'edit' ? modalState.visita : undefined}
          defaultDate={modalState.mode === 'create' ? modalState.defaultDate : undefined}
          accessToken={accessToken!}
          onSaved={fetchVisitas}
          onClose={() => setModalState(null)}
        />
      )}
      {modalState?.mode === 'reporte' && (
        <ReporteModal
          visita={modalState.visita}
          accessToken={accessToken!}
          onSaved={fetchVisitas}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
