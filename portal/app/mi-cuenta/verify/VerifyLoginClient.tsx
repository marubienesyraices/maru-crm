'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function VerifyLoginClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus]  = useState<'loading' | 'ok' | 'error'>('loading');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMensaje('Token no encontrado en la URL.'); return; }

    fetch(`${API}/api/public/cliente/acceder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).message || 'Enlace inválido o expirado.');
        }
        return res.json() as Promise<{ token: string; nombre: string }>;
      })
      .then(({ token: jwt, nombre }) => {
        localStorage.setItem('cliente_token', jwt);
        localStorage.setItem('cliente_nombre', nombre);
        setStatus('ok');
        setTimeout(() => router.replace('/mi-cuenta'), 1200);
      })
      .catch((err: Error) => {
        setStatus('error');
        setMensaje(err.message);
      });
  }, [params, router]);

  if (status === 'loading') {
    return (
      <>
        <div className="mc-spinner" />
        <p>Verificando tu acceso…</p>
      </>
    );
  }

  if (status === 'ok') {
    return (
      <>
        <div className="mc-verify-icon">✓</div>
        <p>¡Acceso confirmado! Redirigiendo…</p>
      </>
    );
  }

  return (
    <>
      <div className="mc-verify-icon mc-verify-icon--error">✗</div>
      <p>{mensaje}</p>
      <a href="/mi-cuenta" className="mc-btn mc-btn-primary" style={{ marginTop: 16 }}>
        Volver a Mi cuenta
      </a>
    </>
  );
}
