import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Portal.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type State = 'loading' | 'success' | 'error';

export default function PortalVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [nombre, setNombre] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      queueMicrotask(() => {
        setErrorMsg('Enlace de verificación inválido.');
        setState('error');
      });
      return;
    }

    fetch(`${API}/api/public/verificar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || 'El enlace no es válido o ha expirado.');
        setNombre(json.nombre || '');
        setState('success');
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'Error de verificación.');
        setState('error');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="portal-root" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="portal-verify-card">
        <div className="portal-brand" style={{ justifyContent: 'center', marginBottom: 32 }}>
          <div className="portal-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          GestProp
        </div>

        {state === 'loading' && (
          <>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 16px' }} />
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>Verificando tu correo…</p>
          </>
        )}

        {state === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: '1.25rem' }}>
              ¡Correo confirmado{nombre ? `, ${nombre}` : ''}!
            </h2>
            <p style={{ margin: '0 0 28px', color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Tu registro está activo. Un agente de GestProp se pondrá en contacto contigo pronto.
            </p>
            <button className="portal-contact-btn portal-contact-primary" onClick={() => navigate('/portal')}>
              Ver propiedades →
            </button>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
            <h2 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: '1.25rem' }}>
              Enlace no válido
            </h2>
            <p style={{ margin: '0 0 28px', color: '#94a3b8', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            <button className="portal-contact-btn portal-contact-secondary" onClick={() => navigate('/portal')}>
              ← Volver al portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
