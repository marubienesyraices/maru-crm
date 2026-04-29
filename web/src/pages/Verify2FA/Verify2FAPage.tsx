import { useState, useRef, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import './Verify2FA.css';

export default function Verify2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verify2FA, isLoading, error, clearError } = useAuthStore();

  const tempToken = location.state?.tempToken;
  const email = location.state?.email || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!tempToken) {
    navigate('/login');
    return null;
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    inputRefs.current[nextEmpty]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const totpCode = code.join('');
    if (totpCode.length !== 6) return;

    try {
      await verify2FA(tempToken, totpCode);
      navigate('/dashboard');
    } catch {
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const fullCode = code.join('');

  return (
    <div className="verify-page">
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-grid" />
      </div>

      <div className="verify-container animate-slide-up">
        <div className="verify-header">
          <div className="verify-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1>Verificación 2FA</h1>
          <p>Ingrese el código de 6 dígitos de su aplicación de autenticación</p>
          {email && <span className="verify-email">{email}</span>}
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

        <form onSubmit={handleSubmit} className="verify-form">
          <div className="code-inputs" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`code-input ${digit ? 'code-input-filled' : ''}`}
                disabled={isLoading}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-login"
            disabled={isLoading || fullCode.length !== 6}
          >
            {isLoading ? (
              <>
                <div className="spinner" />
                Verificando...
              </>
            ) : (
              'Verificar Código'
            )}
          </button>
        </form>

        <div className="verify-footer">
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>
            ← Volver al login
          </button>
        </div>

        <div className="login-security">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>El código expira en 5 minutos</span>
        </div>
      </div>
    </div>
  );
}
