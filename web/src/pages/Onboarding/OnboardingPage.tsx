import { useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../Login/LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

type Step = 'form' | 'success' | 'invalid';

export default function OnboardingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConf, setShowConf]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [step, setStep]               = useState<Step>(token ? 'form' : 'invalid');

  const passwordOk  = PASSWORD_REGEX.test(password);
  const confirmOk   = password === confirm && confirm.length > 0;
  const canSubmit   = passwordOk && confirmOk && !loading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al activar la cuenta');
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'invalid') {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
          <div className="login-bg-grid" />
        </div>
        <div className="login-container animate-slide-up">
          <div className="login-header">
            <div className="login-logo">
              <img src="/gestpro.png" alt="GestPro" style={{ height: 64, objectFit: 'contain' }} />
            </div>
            <h1>Enlace inválido</h1>
            <p>El enlace de activación es inválido o ya expiró. Solicita un nuevo correo al administrador.</p>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => navigate('/login')}>
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
          <div className="login-bg-grid" />
        </div>
        <div className="login-container animate-slide-up">
          <div className="login-header">
            <div className="login-logo" style={{ fontSize: '3rem' }}>✓</div>
            <h1>¡Cuenta activada!</h1>
            <p>Tu contraseña ha sido establecida correctamente. Ya puedes iniciar sesión.</p>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-container animate-slide-up">
        <div className="login-header">
          <div className="login-logo">
            <img src="/gestpro.png" alt="GestPro" style={{ height: 64, objectFit: 'contain' }} />
          </div>
          <h1>Activa tu cuenta</h1>
          <p>Establece una contraseña para comenzar a usar GestPro CRM</p>
        </div>

        {error && (
          <div className="alert alert-error animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="password">Nueva contraseña</label>
            <div className="input-with-icon">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input-field input-field-icon"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" className="input-toggle-password" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {password.length > 0 && !passwordOk && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: 4 }}>
                Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&)
              </p>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <div className="input-with-icon">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="confirm"
                type={showConf ? 'text' : 'password'}
                className="input-field input-field-icon"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" className="input-toggle-password" onClick={() => setShowConf(!showConf)} tabIndex={-1}>
                {showConf ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {confirm.length > 0 && !confirmOk && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: 4 }}>
                Las contraseñas no coinciden
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-login" disabled={!canSubmit}>
            {loading ? (
              <>
                <div className="spinner" />
                Activando cuenta...
              </>
            ) : (
              'Activar mi cuenta'
            )}
          </button>
        </form>

        <div className="login-security">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Conexión segura • GestPro CRM</span>
        </div>
      </div>
    </div>
  );
}
