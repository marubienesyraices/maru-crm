import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar el correo');
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
          <h1>Recuperar contraseña</h1>
          <p>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
        </div>

        {sent ? (
          <div className="forgot-success">
            <div className="forgot-success-icon">✉</div>
            <h2>Correo enviado</h2>
            <p>Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos. Revisa también tu carpeta de spam.</p>
            <button className="btn btn-primary btn-full" style={{ marginTop: 24 }} onClick={() => navigate('/login')}>
              Volver al login
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
                <label htmlFor="email">Correo electrónico</label>
                <div className="input-with-icon">
                  <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    className="input-field input-field-icon"
                    placeholder="usuario@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-login" disabled={loading}>
                {loading ? <><div className="spinner" />Enviando...</> : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div className="login-footer">
              <button className="btn btn-ghost" onClick={() => navigate('/login')}>
                ← Volver al login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
