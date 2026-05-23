import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Settings.css';
import './SettingsPerfil.css';

type TwoFAStep = 'idle' | 'setup' | 'disabling';

export default function SettingsPerfilPage() {
  const { tema, updateTema, accessToken } = useAuthStore();

  const [totpHabilitado, setTotpHabilitado] = useState<boolean | null>(null);
  const [step, setStep] = useState<TwoFAStep>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ totp_habilitado: boolean }>('/api/users/me', { token: accessToken })
      .then((data) => setTotpHabilitado(data.totp_habilitado))
      .catch(() => {});
  }, [accessToken]);

  async function handleStartSetup() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<{ secret: string; qrCodeDataUrl: string }>(
        '/api/auth/setup-2fa',
        { method: 'POST', token: accessToken! },
      );
      setQrCodeUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSetup() {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/api/auth/confirm-2fa', {
        method: 'POST',
        token: accessToken!,
        body: { totpCode: confirmCode },
      });
      setTotpHabilitado(true);
      setStep('idle');
      setConfirmCode('');
      setSuccessMsg('2FA activado exitosamente. Tu cuenta ahora tiene una capa extra de seguridad.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    setError('');
    try {
      await apiRequest('/api/auth/disable-2fa', {
        method: 'POST',
        token: accessToken!,
        body: { totpCode: disableCode },
      });
      setTotpHabilitado(false);
      setStep('idle');
      setDisableCode('');
      setSuccessMsg('2FA desactivado.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function cancelStep() {
    setStep('idle');
    setConfirmCode('');
    setDisableCode('');
    setError('');
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Preferencias</h1>
        <p>Personaliza tu experiencia en el CRM</p>
      </div>

      {/* ── Apariencia ─────────────────────────────────────────── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">🎨</div>
            <div>
              <h2>Apariencia</h2>
              <p>Selecciona el tema visual que prefieras</p>
            </div>
          </div>
        </div>

        <div className="tema-options">
          <button
            className={`tema-card${tema === 'oscuro' ? ' tema-card-active' : ''}`}
            onClick={() => updateTema('oscuro')}
            aria-pressed={tema === 'oscuro'}
          >
            <div className="tema-preview tema-preview-oscuro">
              <div className="tp-sidebar" />
              <div className="tp-content">
                <div className="tp-bar tp-bar-1" />
                <div className="tp-bar tp-bar-2" />
                <div className="tp-card" />
              </div>
            </div>
            <div className="tema-label">
              <span className="tema-name">Oscuro</span>
              {tema === 'oscuro' && <span className="tema-badge">Activo</span>}
            </div>
          </button>

          <button
            className={`tema-card${tema === 'claro' ? ' tema-card-active' : ''}`}
            onClick={() => updateTema('claro')}
            aria-pressed={tema === 'claro'}
          >
            <div className="tema-preview tema-preview-claro">
              <div className="tp-sidebar" />
              <div className="tp-content">
                <div className="tp-bar tp-bar-1" />
                <div className="tp-bar tp-bar-2" />
                <div className="tp-card" />
              </div>
            </div>
            <div className="tema-label">
              <span className="tema-name">Claro</span>
              {tema === 'claro' && <span className="tema-badge">Activo</span>}
            </div>
          </button>
        </div>
      </div>

      {/* ── Autenticación de dos factores ──────────────────────── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">🔐</div>
            <div>
              <h2>Autenticación de dos factores</h2>
              <p>Protege tu cuenta con un código adicional al iniciar sesión</p>
            </div>
          </div>
          {totpHabilitado !== null && (
            <span className={`settings-badge ${totpHabilitado ? 'settings-badge-ok' : 'settings-badge-off'}`}>
              {totpHabilitado ? '● Activo' : '○ Inactivo'}
            </span>
          )}
        </div>

        {successMsg && (
          <div className="twofa-alert twofa-alert-ok">
            {successMsg}
            <button className="twofa-alert-close" onClick={() => setSuccessMsg('')}>✕</button>
          </div>
        )}

        {/* Estado: desactivado */}
        {step === 'idle' && totpHabilitado === false && (
          <div className="twofa-section">
            <p className="twofa-desc">
              Usa una aplicación autenticadora (Google Authenticator, Authy, etc.) para generar
              códigos de un solo uso. Añade una capa extra de seguridad ante accesos no autorizados.
            </p>
            <button className="btn btn-primary" onClick={handleStartSetup} disabled={loading}>
              {loading ? 'Cargando…' : 'Configurar 2FA'}
            </button>
          </div>
        )}

        {/* Estado: configurando — mostrar QR */}
        {step === 'setup' && (
          <div className="twofa-section">
            <div className="twofa-step">
              <span className="twofa-step-num">1</span>
              <p>Escanea este código QR con tu aplicación autenticadora</p>
            </div>
            <img src={qrCodeUrl} alt="Código QR para 2FA" className="twofa-qr" />
            <p className="twofa-secret-hint">
              ¿No puedes escanear? Ingresa este código manualmente:<br />
              <code className="twofa-secret">{secret}</code>
            </p>
            <div className="twofa-step">
              <span className="twofa-step-num">2</span>
              <p>Ingresa el código de 6 dígitos que muestra la aplicación</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000 000"
              value={confirmCode}
              onChange={(e) => { setConfirmCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              className="twofa-code-input"
              autoFocus
            />
            {error && <p className="twofa-error">{error}</p>}
            <div className="twofa-actions">
              <button
                className="btn btn-primary"
                onClick={handleConfirmSetup}
                disabled={loading || confirmCode.length !== 6}
              >
                {loading ? 'Verificando…' : 'Activar 2FA'}
              </button>
              <button className="btn btn-ghost" onClick={cancelStep}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Estado: activado */}
        {step === 'idle' && totpHabilitado === true && (
          <div className="twofa-section">
            <p className="twofa-desc">
              Tu cuenta está protegida con 2FA. Se te pedirá un código de tu aplicación
              autenticadora cada vez que inicies sesión.
            </p>
            <button className="btn btn-danger-outline" onClick={() => setStep('disabling')}>
              Desactivar 2FA
            </button>
          </div>
        )}

        {/* Estado: desactivando */}
        {step === 'disabling' && (
          <div className="twofa-section">
            <p className="twofa-desc">
              Para desactivar el 2FA ingresa el código actual de tu aplicación autenticadora.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000 000"
              value={disableCode}
              onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              className="twofa-code-input"
              autoFocus
            />
            {error && <p className="twofa-error">{error}</p>}
            <div className="twofa-actions">
              <button
                className="btn btn-danger"
                onClick={handleDisable}
                disabled={loading || disableCode.length !== 6}
              >
                {loading ? 'Procesando…' : 'Confirmar desactivación'}
              </button>
              <button className="btn btn-ghost" onClick={cancelStep}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
