import { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useVisitas, useVisitasConfig, useCreateVisita, useUpdateVisita, useDeleteVisita, useReporteVisita, useCrearMeeting, useEliminarMeeting } from '../../hooks/useVisitas';
import type { Visita } from '../../hooks/useVisitas';
import { usePipeline } from '../../hooks/usePipeline';
import type { PipelineItem } from '../../hooks/usePipeline';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
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
  pipeline: PipelineItem[];
  existingVisitas: Visita[];
  initial?: Visita;
  defaultDate?: Date;
  onSaved: () => void;
  onClose: () => void;
}

function useConflictCheck(
  fechaInicio: string,
  fechaFin: string,
  existingVisitas: Visita[],
  bufferMin: number,
  excludeId?: string,
) {
  if (!fechaInicio || !fechaFin) return null;
  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const bufferMs = bufferMin * 60_000;
  const conflict = existingVisitas.find((v) => {
    if (v.id === excludeId) return false;
    if (v.estado === 'CANCELADA') return false;
    const vStart = new Date(v.fecha_inicio);
    const vEnd = new Date(v.fecha_fin);
    return start < new Date(vEnd.getTime() + bufferMs) &&
           end > new Date(vStart.getTime() - bufferMs);
  });
  return conflict ?? null;
}

function VisitaFormModal({ pipeline, existingVisitas, initial, defaultDate, onSaved, onClose }: VisitaFormProps) {
  const isEdit = !!initial;
  const d = defaultDate ?? new Date();
  const dPlus1 = new Date(d);
  dPlus1.setHours(d.getHours() + 1);

  const createVisita = useCreateVisita();
  const updateVisita = useUpdateVisita();
  const saving = createVisita.isPending || updateVisita.isPending;
  const { data: config } = useVisitasConfig();
  const bufferMin = config?.buffer_entre_citas_min ?? 30;

  const [form, setForm] = useState({
    interesId: initial?.interes_id ?? '',
    fechaInicio: initial ? fmtDatetimeLocal(new Date(initial.fecha_inicio)) : fmtDatetimeLocal(d),
    fechaFin: initial ? fmtDatetimeLocal(new Date(initial.fecha_fin)) : fmtDatetimeLocal(dPlus1),
    ubicacion: initial?.ubicacion ?? '',
    notas: initial?.notas ?? '',
    estado: initial?.estado ?? 'PENDIENTE',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const inicio = new Date(form.fechaInicio);
  const fin = new Date(form.fechaFin);
  const finBeforeInicio = form.fechaInicio && form.fechaFin && fin <= inicio;
  const conflict = useConflictCheck(form.fechaInicio, form.fechaFin, existingVisitas, bufferMin, initial?.id);

  const filteredPipeline = search
    ? pipeline.filter((p) =>
        `${p.cliente?.nombre} ${p.propiedad?.codigo} ${p.propiedad?.titulo}`
          .toLowerCase().includes(search.toLowerCase()),
      )
    : pipeline;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.interesId) { setError('Selecciona un trámite'); return; }
    setError('');
    const onSuccess = () => { onSaved(); onClose(); };
    const onError = (err: Error) => setError(err.message);

    if (isEdit && initial) {
      updateVisita.mutate({
        id: initial.id,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
        ubicacion: form.ubicacion || undefined,
        notas: form.notas || undefined,
        estado: form.estado,
      }, { onSuccess, onError });
    } else {
      createVisita.mutate({
        interesId: form.interesId,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
        ubicacion: form.ubicacion || undefined,
        notas: form.notas || undefined,
      }, { onSuccess, onError });
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
                className={`agenda-input${finBeforeInicio || conflict ? ' agenda-input-warn' : ''}`}
                value={form.fechaInicio}
                onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="agenda-label">Fin *</label>
              <input
                type="datetime-local"
                className={`agenda-input${finBeforeInicio || conflict ? ' agenda-input-warn' : ''}`}
                value={form.fechaFin}
                onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                required
              />
            </div>
          </div>

          {finBeforeInicio && (
            <div className="agenda-validation-warn">
              ⚠️ La hora de fin debe ser posterior a la de inicio.
            </div>
          )}
          {!finBeforeInicio && conflict && (
            <div className="agenda-validation-warn">
              ⚠️ Conflicto con visita existente ({fmtTime(conflict.fecha_inicio)}–{fmtTime(conflict.fecha_fin)}
              {' '}· {conflict.interes?.cliente?.nombre}).
              Se requiere un buffer de {bufferMin} min entre citas.
            </div>
          )}

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
  visita: Visita;
  onSaved: () => void;
  onClose: () => void;
}

function ReporteModal({ visita, onSaved, onClose }: ReporteModalProps) {
  const { accessToken } = useAuthStore();
  const reporteMutation = useReporteVisita();
  const saving = reporteMutation.isPending;
  const [enviandoPropietario, setEnviandoPropietario] = useState(false);
  const [propietarioMsg, setPropietarioMsg] = useState('');

  const [form, setForm] = useState({
    notas: visita.reporte_notas ?? '',
    nivelInteres: visita.reporte_nivel_interes ?? '',
    reaccion: visita.reporte_reaccion ?? '',
    siguientePaso: visita.reporte_siguiente_paso ?? '',
    fotosInput: '',
  });
  const [fotosList, setFotosList] = useState<string[]>(visita.fotos_visita ?? []);
  const [error, setError] = useState('');

  const handleEnviarPropietario = async () => {
    setEnviandoPropietario(true);
    setPropietarioMsg('');
    try {
      const res = await apiRequest<{ sent: boolean; reason?: string }>(`/api/visitas/${visita.id}/resumen-propietario`, {
        method: 'POST', token: accessToken!,
      });
      setPropietarioMsg(res.sent ? '✓ Resumen enviado al propietario' : `Sin envío: ${res.reason}`);
    } catch (err) {
      setPropietarioMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setEnviandoPropietario(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    reporteMutation.mutate(
      {
        id: visita.id,
        notas: form.notas || undefined,
        nivelInteres: form.nivelInteres || undefined,
        reaccion: form.reaccion || undefined,
        siguientePaso: form.siguientePaso || undefined,
        fotosVisita: fotosList.length > 0 ? fotosList : undefined,
      },
      {
        onSuccess: () => { onSaved(); onClose(); },
        onError: (err: Error) => setError(err.message),
      },
    );
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

          {/* F-21: Fotos de la visita */}
          <div>
            <label className="agenda-label">Fotos de la visita (URLs)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                className="agenda-input"
                placeholder="https://... pega URL de foto y presiona +"
                value={form.fotosInput}
                onChange={(e) => setForm((f) => ({ ...f, fotosInput: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 12px', whiteSpace: 'nowrap' }}
                onClick={() => {
                  const url = form.fotosInput.trim();
                  if (url) { setFotosList((p) => [...p, url]); setForm((f) => ({ ...f, fotosInput: '' })); }
                }}
              >+</button>
            </div>
            {fotosList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {fotosList.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 64, height: 48 }}>
                    <img src={url} alt={`foto-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                    <button
                      type="button"
                      onClick={() => setFotosList((p) => p.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', lineHeight: '16px', padding: 0 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="agenda-error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '...' : yaCompletado ? 'Actualizar reporte' : 'Guardar reporte'}
            </button>
          </div>
        </form>

        {yaCompletado && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.8125rem' }}
              disabled={enviandoPropietario}
              onClick={handleEnviarPropietario}
            >
              {enviandoPropietario ? '...' : '📧 Enviar resumen al propietario'}
            </button>
            {propietarioMsg && (
              <span style={{ marginLeft: 10, fontSize: '0.8rem', color: propietarioMsg.startsWith('✓') ? '#22c55e' : 'var(--text-muted)' }}>
                {propietarioMsg}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Visita Card ──────────────────────────────────────────────

function VisitaCard({ visita, onEdit, onDelete, onIcs, onReporte, onCrearZoom, onEliminarZoom, isZoomLoading, tieneIntegraciones }: {
  visita: Visita;
  onEdit: () => void;
  onDelete: () => void;
  onIcs: () => void;
  onReporte: () => void;
  onCrearZoom: () => void;
  onEliminarZoom: () => void;
  isZoomLoading: boolean;
  tieneIntegraciones: boolean;
}) {
  const color = ESTADO_COLORS[visita.estado] ?? '#94a3b8';
  const isPast = new Date(visita.fecha_fin) < new Date();
  const needsReporte = isPast && visita.estado !== 'CANCELADA' && !visita.reporte_fecha;
  const hasZoom = !!visita.zoom_join_url;

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
      {tieneIntegraciones && hasZoom && (
        <a
          href={visita.zoom_join_url ?? undefined}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '0.625rem', color: '#3b82f6', fontWeight: 600 }}
        >
          🎥 Zoom
        </a>
      )}
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
        {tieneIntegraciones && (hasZoom ? (
          <>
            <a
              href={visita.zoom_join_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="agenda-event-actions-btn"
              title="Unirse a Zoom"
              style={{ fontSize: '0.6875rem', color: '#3b82f6', padding: '2px 5px', lineHeight: 1.4,
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 4,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              🎥
            </a>
            <button onClick={onEliminarZoom} title="Eliminar reunión Zoom" disabled={isZoomLoading}>
              {isZoomLoading ? '⏳' : '🗑️'}
            </button>
          </>
        ) : (
          visita.estado !== 'CANCELADA' && visita.estado !== 'REALIZADA' && (
            <button
              onClick={onCrearZoom}
              title="Crear reunión Zoom"
              disabled={isZoomLoading}
              style={{ color: '#3b82f6' }}
            >
              {isZoomLoading ? '⏳' : '📹'}
            </button>
          )
        ))}
        <button onClick={onDelete} title="Eliminar" className="agenda-delete">✕</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function AgendaPage() {
  const { accessToken, planFeatures } = useAuthStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [modalState, setModalState] = useState<
    | { mode: 'create'; defaultDate?: Date }
    | { mode: 'edit'; visita: Visita }
    | { mode: 'reporte'; visita: Visita }
    | null
  >(null);

  const days = getWeekDays(weekStart);
  const weekEnd = addDays(weekStart, 6);
  weekEnd.setHours(23, 59, 59, 999);

  const { data: visitas = [], isLoading: loading, isError } = useVisitas(weekStart, weekEnd);
  const { data: pipelineMap = {} } = usePipeline();
  const pipeline = Object.values(pipelineMap).flat();
  const deleteMutation = useDeleteVisita();
  const crearMeetingMutation = useCrearMeeting();
  const eliminarMeetingMutation = useEliminarMeeting();

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: '¿Eliminar visita?', message: 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Visita eliminada'),
      onError: (err: Error) => toast.error(err.message ?? 'Error al eliminar la visita'),
    });
  };

  const handleCrearZoom = (id: string) => {
    crearMeetingMutation.mutate(id, {
      onSuccess: () => toast.success('Reunión Zoom creada'),
      onError: (err: Error) => toast.error(`Error al crear reunión Zoom: ${err.message}`),
    });
  };

  const handleEliminarZoom = async (id: string) => {
    const ok = await confirm({ title: '¿Eliminar reunión de Zoom?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    eliminarMeetingMutation.mutate(id, {
      onSuccess: () => toast.success('Reunión Zoom eliminada'),
      onError: (err: Error) => toast.error(`Error al eliminar reunión Zoom: ${err.message}`),
    });
  };

  const handleDownloadIcs = async (id: string) => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/visitas/${id}/ics`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) { toast.error('Error descargando el archivo'); return; }
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

      {/* ── Error state ── */}
      {isError && (
        <div className="page-error-state" style={{ margin: '32px auto' }}>
          <div className="page-error-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3>Error al cargar la agenda</h3>
          <p>No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      )}

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
                  <div className="agenda-day-skeleton">
                    <div className="skel" style={{ height: 48, borderRadius: 8, width: '100%' }} />
                  </div>
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
                        onCrearZoom={() => handleCrearZoom(v.id)}
                        onEliminarZoom={() => handleEliminarZoom(v.id)}
                        tieneIntegraciones={!!planFeatures?.tiene_integraciones}
                        isZoomLoading={
                          (crearMeetingMutation.isPending && crearMeetingMutation.variables === v.id) ||
                          (eliminarMeetingMutation.isPending && eliminarMeetingMutation.variables === v.id)
                        }
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
          existingVisitas={visitas}
          initial={modalState.mode === 'edit' ? modalState.visita : undefined}
          defaultDate={modalState.mode === 'create' ? modalState.defaultDate : undefined}
          onSaved={() => setModalState(null)}
          onClose={() => setModalState(null)}
        />
      )}
      {modalState?.mode === 'reporte' && (
        <ReporteModal
          visita={modalState.visita}
          onSaved={() => setModalState(null)}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
