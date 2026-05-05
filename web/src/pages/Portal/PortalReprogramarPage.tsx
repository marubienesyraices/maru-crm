import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Portal.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type LoadState = 'loading' | 'ready' | 'expired' | 'error';
type ActionState = 'idle' | 'submitting' | 'done';
type Accion = 'CONFIRMAR' | 'REPROGRAMAR' | 'CANCELAR';

interface VisitaInfo {
  id: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion?: string;
  propiedad: { codigo: string; titulo: string };
  cliente_nombre: string;
  agente_nombre: string;
  reschedule_propuesta_inicio?: string;
  reschedule_propuesta_fin?: string;
  reschedule_notas?: string;
  reschedule_solicitado_at?: string;
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-GT', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PortalReprogramarPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [visita, setVisita] = useState<VisitaInfo | null>(null);

  const [accionSeleccionada, setAccionSeleccionada] = useState<Accion | null>(null);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [actionResult, setActionResult] = useState<Accion | null>(null);

  const [repForm, setRepForm] = useState({ fecha_inicio: '', fecha_fin: '', notas: '' });
  const [cancelNotas, setCancelNotas] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) { setLoadState('error'); setErrorMsg('Enlace inválido.'); return; }

    fetch(`${API}/api/public/reprogramar/${token}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || 'Enlace no válido');
        setVisita(json);
        setLoadState('ready');
      })
      .catch((err: any) => {
        const msg: string = err.message || '';
        if (msg.includes('expirado') || msg.includes('cancelada') || msg.includes('realizada')) {
          setErrorMsg(msg);
          setLoadState('expired');
        } else {
          setErrorMsg(msg || 'Error al cargar la visita.');
          setLoadState('error');
        }
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviarAccion = async (accion: Accion) => {
    setFormError('');

    if (accion === 'REPROGRAMAR') {
      if (!repForm.fecha_inicio || !repForm.fecha_fin) {
        setFormError('Indica la fecha y hora propuestas.');
        return;
      }
      if (new Date(repForm.fecha_fin) <= new Date(repForm.fecha_inicio)) {
        setFormError('La hora de fin debe ser posterior a la hora de inicio.');
        return;
      }
      if (new Date(repForm.fecha_inicio) <= new Date()) {
        setFormError('La fecha propuesta debe ser futura.');
        return;
      }
    }

    setActionState('submitting');

    try {
      const body: any = { accion };
      if (accion === 'REPROGRAMAR') {
        body.fecha_inicio = new Date(repForm.fecha_inicio).toISOString();
        body.fecha_fin = new Date(repForm.fecha_fin).toISOString();
        if (repForm.notas) body.notas = repForm.notas;
      }
      if (accion === 'CANCELAR' && cancelNotas) body.notas = cancelNotas;

      const res = await fetch(`${API}/api/public/reprogramar/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Error al procesar la acción');

      setActionResult(accion);
      setActionState('done');
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión');
      setActionState('idle');
    }
  };

  // ─── Layouts ─────────────────────────────────────────────────

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="portal-root" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="portal-verify-card" style={{ maxWidth: 520 }}>
        <div className="portal-brand" style={{ justifyContent: 'center', marginBottom: 28 }}>
          <div className="portal-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          Maru Bienes y Raíces
        </div>
        {children}
      </div>
    </div>
  );

  if (loadState === 'loading') {
    return (
      <Card>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 12px' }} />
        <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>Cargando tu visita…</p>
      </Card>
    );
  }

  if (loadState === 'expired' || loadState === 'error') {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{loadState === 'expired' ? '⏰' : '❌'}</div>
          <h2 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: '1.125rem' }}>
            {loadState === 'expired' ? 'Enlace expirado' : 'Enlace inválido'}
          </h2>
          <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6 }}>{errorMsg}</p>
          <button className="portal-contact-btn portal-contact-secondary" onClick={() => navigate('/portal')}>
            ← Ver propiedades
          </button>
        </div>
      </Card>
    );
  }

  // ─── Action done ─────────────────────────────────────────────

  if (actionState === 'done' && actionResult) {
    const msgs: Record<Accion, { icon: string; title: string; body: string }> = {
      CONFIRMAR: {
        icon: '✅',
        title: '¡Visita confirmada!',
        body: 'Tu agente ha sido notificado. Te esperamos el día acordado.',
      },
      CANCELAR: {
        icon: '🚫',
        title: 'Visita cancelada',
        body: 'Tu agente ha sido notificado de la cancelación. Puedes contactarlo para reagendar.',
      },
      REPROGRAMAR: {
        icon: '📅',
        title: 'Solicitud enviada',
        body: `Tu agente revisará la nueva fecha propuesta y se pondrá en contacto contigo.`,
      },
    };
    const m = msgs[actionResult];
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{m.icon}</div>
          <h2 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: '1.125rem' }}>{m.title}</h2>
          <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6 }}>{m.body}</p>
          <button className="portal-contact-btn portal-contact-primary" onClick={() => navigate('/portal')}>
            Ver propiedades →
          </button>
        </div>
      </Card>
    );
  }

  // ─── Main UI ─────────────────────────────────────────────────

  if (!visita) return null;

  return (
    <Card>
      {/* Visit summary */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tu visita
        </p>
        <h2 style={{ margin: '0 0 4px', color: '#f1f5f9', fontSize: '1.0625rem' }}>
          {visita.propiedad.codigo} — {visita.propiedad.titulo}
        </h2>
        <p style={{ margin: '0 0 2px', color: '#94a3b8', fontSize: '0.875rem' }}>
          📅 {fmtFecha(visita.fecha_inicio)}
        </p>
        {visita.ubicacion && (
          <p style={{ margin: '0 0 2px', color: '#94a3b8', fontSize: '0.875rem' }}>📍 {visita.ubicacion}</p>
        )}
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>👤 Agente: {visita.agente_nombre}</p>
      </div>

      {/* Pending reschedule notice */}
      {visita.reschedule_solicitado_at && !actionResult && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.25)', borderRadius: 8 }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', fontWeight: 600, color: '#fbbf24' }}>Propuesta enviada anteriormente</p>
          {visita.reschedule_propuesta_inicio && (
            <p style={{ margin: '0 0 2px', color: '#cbd5e1', fontSize: '0.8125rem' }}>
              Nueva fecha: {fmtFecha(visita.reschedule_propuesta_inicio)}
            </p>
          )}
          {visita.reschedule_notas && (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8125rem' }}>{visita.reschedule_notas}</p>
          )}
        </div>
      )}

      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.875rem' }}>¿Qué deseas hacer?</p>

      {/* Action buttons */}
      {!accionSeleccionada && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="portal-reprogramar-btn portal-reprogramar-confirm"
            onClick={() => enviarAccion('CONFIRMAR')}
            disabled={actionState === 'submitting'}
          >
            ✅ Confirmar asistencia
          </button>
          <button
            className="portal-reprogramar-btn portal-reprogramar-reschedule"
            onClick={() => setAccionSeleccionada('REPROGRAMAR')}
          >
            📅 Proponer nueva fecha
          </button>
          <button
            className="portal-reprogramar-btn portal-reprogramar-cancel"
            onClick={() => setAccionSeleccionada('CANCELAR')}
          >
            🚫 Cancelar la visita
          </button>
        </div>
      )}

      {/* Reschedule form */}
      {accionSeleccionada === 'REPROGRAMAR' && (
        <div style={{ marginTop: 4 }}>
          <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: '0.875rem' }}>
            Selecciona tu disponibilidad y tu agente lo confirmará:
          </p>
          {formError && <p className="portal-form-error" style={{ marginBottom: 12 }}>{formError}</p>}
          <div className="portal-form-group" style={{ marginBottom: 12 }}>
            <label className="portal-form-label">Fecha y hora de inicio *</label>
            <input
              className="portal-form-input"
              type="datetime-local"
              value={repForm.fecha_inicio}
              min={toLocalInput(new Date().toISOString())}
              onChange={(e) => setRepForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
              disabled={actionState === 'submitting'}
            />
          </div>
          <div className="portal-form-group" style={{ marginBottom: 12 }}>
            <label className="portal-form-label">Fecha y hora de fin *</label>
            <input
              className="portal-form-input"
              type="datetime-local"
              value={repForm.fecha_fin}
              min={repForm.fecha_inicio || toLocalInput(new Date().toISOString())}
              onChange={(e) => setRepForm((f) => ({ ...f, fecha_fin: e.target.value }))}
              disabled={actionState === 'submitting'}
            />
          </div>
          <div className="portal-form-group" style={{ marginBottom: 16 }}>
            <label className="portal-form-label">Notas (opcional)</label>
            <textarea
              className="portal-form-input portal-form-textarea"
              value={repForm.notas}
              onChange={(e) => setRepForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="¿Algún horario o condición especial?"
              rows={2}
              disabled={actionState === 'submitting'}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="portal-contact-btn portal-contact-secondary"
              onClick={() => { setAccionSeleccionada(null); setFormError(''); }}
              disabled={actionState === 'submitting'}
            >
              Volver
            </button>
            <button
              className="portal-contact-btn portal-contact-primary"
              onClick={() => enviarAccion('REPROGRAMAR')}
              disabled={actionState === 'submitting'}
            >
              {actionState === 'submitting' ? 'Enviando…' : 'Enviar propuesta →'}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {accionSeleccionada === 'CANCELAR' && (
        <div style={{ marginTop: 4 }}>
          <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: '0.875rem' }}>
            ¿Seguro que deseas cancelar la visita?
          </p>
          {formError && <p className="portal-form-error" style={{ marginBottom: 12 }}>{formError}</p>}
          <div className="portal-form-group" style={{ marginBottom: 16 }}>
            <label className="portal-form-label">Motivo (opcional)</label>
            <textarea
              className="portal-form-input portal-form-textarea"
              value={cancelNotas}
              onChange={(e) => setCancelNotas(e.target.value)}
              placeholder="¿Por qué debes cancelar?"
              rows={2}
              disabled={actionState === 'submitting'}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="portal-contact-btn portal-contact-secondary"
              onClick={() => { setAccionSeleccionada(null); setFormError(''); }}
              disabled={actionState === 'submitting'}
            >
              No cancelar
            </button>
            <button
              style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              onClick={() => enviarAccion('CANCELAR')}
              disabled={actionState === 'submitting'}
            >
              {actionState === 'submitting' ? 'Cancelando…' : 'Cancelar visita'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
