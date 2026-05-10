'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Props { propiedadId: string }

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function RegistroInteresForm({ propiedadId }: Props) {
  const [open, setOpen]   = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm]   = useState({ nombre: '', email: '', telefono: '', mensaje: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const body: Record<string, string> = {
        nombre:      form.nombre.trim(),
        email:       form.email.trim(),
        propiedad_id: propiedadId,
      };
      if (form.telefono.trim()) body.telefono = form.telefono.trim();
      if (form.mensaje.trim())  body.mensaje  = form.mensaje.trim();

      const res = await fetch(`${API}/api/public/registro`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(data.message) ? data.message[0] : data.message ?? 'Error al enviar');
      }
      setStatus('done');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="registro-done">
        <div className="registro-done-icon">✅</div>
        <p className="registro-done-title">¡Solicitud enviada!</p>
        <p className="registro-done-sub">
          Revisa tu correo electrónico y haz clic en el enlace de confirmación para activar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="registro-wrap">
      {!open ? (
        <button className="contact-btn registro-toggle" onClick={() => setOpen(true)}>
          📝 Registrar interés
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="registro-form" noValidate>
          <div className="registro-form-header">
            <span className="registro-title">Registrar interés</span>
            <button
              type="button"
              className="registro-close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar formulario"
            >✕</button>
          </div>

          <input
            className="registro-input"
            type="text"
            name="nombre"
            placeholder="Nombre completo *"
            required
            minLength={2}
            maxLength={120}
            value={form.nombre}
            onChange={handleChange}
            autoComplete="name"
          />
          <input
            className="registro-input"
            type="email"
            name="email"
            placeholder="Correo electrónico *"
            required
            maxLength={200}
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
          <input
            className="registro-input"
            type="tel"
            name="telefono"
            placeholder="Teléfono (opcional)"
            maxLength={30}
            value={form.telefono}
            onChange={handleChange}
            autoComplete="tel"
          />
          <textarea
            className="registro-input registro-textarea"
            name="mensaje"
            placeholder="Mensaje (opcional)"
            maxLength={1000}
            rows={3}
            value={form.mensaje}
            onChange={handleChange}
          />

          {status === 'error' && (
            <div className="registro-error" role="alert">{errorMsg}</div>
          )}

          <button
            type="submit"
            className="contact-btn contact-btn-email"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '⏳ Enviando…' : '✉️ Enviar solicitud'}
          </button>

          <p className="registro-note">
            Recibirás un correo para confirmar tu cuenta. Sin spam.
          </p>
        </form>
      )}
    </div>
  );
}
