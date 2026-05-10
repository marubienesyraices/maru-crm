'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type Status = 'loading' | 'ok' | 'error' | 'no-token';

export default function VerificarClient() {
  const params = useSearchParams();
  const token  = params.get('token');

  const [status, setStatus]   = useState<Status>(token ? 'loading' : 'no-token');
  const [nombre, setNombre]   = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('no-token'); return; }

    fetch(`${API}/api/public/verificar-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message ?? 'El enlace no es válido o ha expirado.');
        setNombre(data.nombre ?? '');
        setStatus('ok');
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'El enlace no es válido o ha expirado.');
        setStatus('error');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="verify-card">
        <div className="verify-icon">⏳</div>
        <p className="verify-title">Verificando tu correo…</p>
        <p className="verify-sub">Espera un momento.</p>
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div className="verify-card">
        <div className="verify-icon">🎉</div>
        <p className="verify-title">¡Correo confirmado{nombre ? `, ${nombre}` : ''}!</p>
        <p className="verify-sub">
          Tu cuenta ha sido activada exitosamente. Ya puedes recibir información personalizada sobre propiedades.
        </p>
        <Link href="/" className="verify-btn">
          Ver propiedades →
        </Link>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="verify-card">
        <div className="verify-icon">⚠️</div>
        <p className="verify-title">Enlace no válido</p>
        <p className="verify-sub">{errorMsg}</p>
        <Link href="/" className="verify-btn verify-btn-ghost">
          ← Ir al inicio
        </Link>
      </div>
    );
  }

  // no-token
  return (
    <div className="verify-card">
      <div className="verify-icon">🔗</div>
      <p className="verify-title">Enlace inválido</p>
      <p className="verify-sub">
        No se encontró un token de verificación en la URL. Por favor usa el enlace que recibiste en tu correo.
      </p>
      <Link href="/" className="verify-btn verify-btn-ghost">
        ← Ir al inicio
      </Link>
    </div>
  );
}
