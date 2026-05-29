import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import './LoginPage.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-grid" />
        </div>
        <div className="login-container animate-slide-up">
          <div className="forgot-success">
            <div className="forgot-success-icon" style={{ color: 'var(--danger)' }}>✕</div>
            <h2>Enlace inválido</h2>
            <p>El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.</p>
            <button className="btn btn-primary btn-full" style={{ marginTop: 24 }} onClick={() => navigate('/forgot-password')}>
              Solicitar nuevo enlace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    setError('');
    try {
      const body: any = { token, newPassword: password };
      if (requiresTOTP && totpCode) body.totpCode = totpCode;
      await apiRequest('/api/auth/reset-password', { method: 'POST', body });
      setDone(true);
    } catch (err: any) {
      // Check if backend requires TOTP
      try {
        const parsed = JSON.parse(err.message ?? '{}');
        if (parsed.requiresTOTP) { setRequiresTOTP(true); setError(parsed.message ?? 'Ingresa el código de tu app autenticadora'); return; }
      } catch { /* not JSON */ }
      setError(err.message ?? 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

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
            <img src="/gestprop.png" alt="GestProp" style={{ height: 96, objectFit: 'contain' }} />
          </div>
          <h1>Nueva contraseña</h1>
          <p>Elige una contraseña segura para tu cuenta.</p>
        </div>

        {done ? (
          <div className="forgot-success">
            <div className="forgot-success-icon">✓</div>
            <h2>Contraseña actualizada</h2>
            <p>Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.</p>
            <button className="btn btn-primary btn-full" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
              Iniciar sesión
            </button>
          </div>
        ) : (
          <>
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
                    type={showPassword ? 'text' : 'password'}
                    className="input-field input-field-icon"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    disabled={loading}
                  />
                  <button type="button" className="input-toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? (
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
                <p className="reset-hint">Debe contener mayúsculas, minúsculas, números y un carácter especial (@$!%*?&)</p>
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
                    type={showPassword ? 'text' : 'password'}
                    className="input-field input-field-icon"
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {requiresTOTP && (
                <div className="input-group">
                  <label htmlFor="totp">Código de autenticación (2FA)</label>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Tu cuenta tiene verificación en 2 pasos. Ingresa el código de tu app autenticadora.
                  </p>
                  <input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    className="input-field"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-login" disabled={loading || !password || !confirm || (requiresTOTP && totpCode.length < 6)}>
                {loading ? <><div className="spinner" />Guardando...</> : requiresTOTP ? 'Verificar y restablecer' : 'Restablecer contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
