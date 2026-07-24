import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Settings.css';
import './SettingsPerfil.css';

type Tab = 'apariencia' | 'seguridad';
type TwoFAStep = 'idle' | 'setup' | 'disabling';

export default function SettingsPerfilPage() {
  const { tema, updateTema, accessToken, user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('apariencia');

  // ── Cambio de contraseña ──────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Las contraseñas nuevas no coinciden');
      return;
    }
    setPwLoading(true);
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        token: accessToken!,
        body: { currentPassword: pwForm.current, newPassword: pwForm.next },
      });
      setPwSuccess('Contraseña actualizada correctamente.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPwError(e instanceof Error ? e.message : String(e));
    } finally {
      setPwLoading(false);
    }
  }

  // ── 2FA ──────────────────────────────────────────────────
  const [totpHabilitado, setTotpHabilitado] = useState<boolean | null>(null);
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ totp_habilitado: boolean }>('/api/users/me', { token: accessToken })
      .then((d) => setTotpHabilitado(d.totp_habilitado))
      .catch(() => {});
  }, [accessToken]);

  async function handleStartSetup() {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      const data = await apiRequest<{ secret: string; qrCodeDataUrl: string }>(
        '/api/auth/setup-2fa',
        { method: 'POST', token: accessToken! },
      );
      setQrCodeUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setTwoFAStep('setup');
    } catch (e) {
      setTwoFAError(e instanceof Error ? e.message : String(e));
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleConfirmSetup() {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await apiRequest('/api/auth/confirm-2fa', {
        method: 'POST',
        token: accessToken!,
        body: { totpCode: confirmCode },
      });
      setTotpHabilitado(true);
      setTwoFAStep('idle');
      setConfirmCode('');
      setTwoFASuccess('2FA activado. Tu cuenta ahora tiene una capa extra de seguridad.');
    } catch (e) {
      setTwoFAError(e instanceof Error ? e.message : String(e));
    } finally {
      setTwoFALoading(false);
    }
  }

  async function handleDisable2FA() {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await apiRequest('/api/auth/disable-2fa', {
        method: 'POST',
        token: accessToken!,
        body: { totpCode: disableCode },
      });
      setTotpHabilitado(false);
      setTwoFAStep('idle');
      setDisableCode('');
      setTwoFASuccess('2FA desactivado.');
    } catch (e) {
      setTwoFAError(e instanceof Error ? e.message : String(e));
    } finally {
      setTwoFALoading(false);
    }
  }

  function cancelTwoFA() {
    setTwoFAStep('idle');
    setConfirmCode('');
    setDisableCode('');
    setTwoFAError('');
  }

  const PASSWORD_HINT = 'Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&)';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Mi Perfil</h1>
        <p>{user?.email}</p>
      </div>

      <div className="settings-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'apariencia'}
          className={`settings-tab${tab === 'apariencia' ? ' active' : ''}`}
          onClick={() => setTab('apariencia')}
        >
          Apariencia
        </button>
        <button
          role="tab"
          aria-selected={tab === 'seguridad'}
          className={`settings-tab${tab === 'seguridad' ? ' active' : ''}`}
          onClick={() => setTab('seguridad')}
        >
          Seguridad
        </button>
      </div>

      {/* ── TAB: Apariencia ──────────────────────────────────── */}
      {tab === 'apariencia' && (
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
      )}

      {/* ── TAB: Seguridad ───────────────────────────────────── */}
      {tab === 'seguridad' && (
        <>
          {/* Cambio de contraseña */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <div className="settings-card-icon">🔑</div>
                <div>
                  <h2>Cambiar contraseña</h2>
                  <p>Actualiza tu contraseña de acceso al CRM</p>
                </div>
              </div>
            </div>

            {pwSuccess && (
              <div className="twofa-alert twofa-alert-ok" style={{ marginBottom: 16 }}>
                {pwSuccess}
                <button className="twofa-alert-close" onClick={() => setPwSuccess('')}>✕</button>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="pw-form" noValidate>
              <div className="pw-field">
                <label htmlFor="pw-current">Contraseña actual</label>
                <div className="pw-input-wrap">
                  <input
                    id="pw-current"
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}>
                    {showPw.current ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="pw-field">
                <label htmlFor="pw-next">Nueva contraseña</label>
                <div className="pw-input-wrap">
                  <input
                    id="pw-next"
                    type={showPw.next ? 'text' : 'password'}
                    value={pwForm.next}
                    onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}>
                    {showPw.next ? '🙈' : '👁️'}
                  </button>
                </div>
                <span className="pw-hint">{PASSWORD_HINT}</span>
              </div>

              <div className="pw-field">
                <label htmlFor="pw-confirm">Confirmar nueva contraseña</label>
                <div className="pw-input-wrap">
                  <input
                    id="pw-confirm"
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}>
                    {showPw.confirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <span className="pw-mismatch">Las contraseñas no coinciden</span>
                )}
              </div>

              {pwError && <p className="twofa-error">{pwError}</p>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={pwLoading || !pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm}
              >
                {pwLoading ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>

          {/* 2FA */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <div className="settings-card-icon">🔐</div>
                <div>
                  <h2>Autenticación de dos factores</h2>
                  <p>Código adicional requerido al iniciar sesión</p>
                </div>
              </div>
              {totpHabilitado !== null && (
                <span className={`settings-badge ${totpHabilitado ? 'settings-badge-ok' : 'settings-badge-off'}`}>
                  {totpHabilitado ? '● Activo' : '○ Inactivo'}
                </span>
              )}
            </div>

            {twoFASuccess && (
              <div className="twofa-alert twofa-alert-ok">
                {twoFASuccess}
                <button className="twofa-alert-close" onClick={() => setTwoFASuccess('')}>✕</button>
              </div>
            )}

            {/* Desactivado — botón de activar */}
            {twoFAStep === 'idle' && totpHabilitado === false && (
              <div className="twofa-section">
                <p className="twofa-desc">
                  Usa Google Authenticator, Authy u otra aplicación para generar códigos de un solo uso.
                  Añade protección extra ante accesos no autorizados.
                </p>
                <button className="btn btn-primary" onClick={handleStartSetup} disabled={twoFALoading}>
                  {twoFALoading ? 'Cargando…' : 'Activar 2FA'}
                </button>
              </div>
            )}

            {/* Setup: mostrar QR */}
            {twoFAStep === 'setup' && (
              <div className="twofa-section">
                <div className="twofa-step">
                  <span className="twofa-step-num">1</span>
                  <p>Escanea el código QR con tu aplicación autenticadora</p>
                </div>
                <img src={qrCodeUrl} alt="QR 2FA" className="twofa-qr" />
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
                  onChange={(e) => { setConfirmCode(e.target.value.replace(/\D/g, '')); setTwoFAError(''); }}
                  className="twofa-code-input"
                  autoFocus
                />
                {twoFAError && <p className="twofa-error">{twoFAError}</p>}
                <div className="twofa-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmSetup}
                    disabled={twoFALoading || confirmCode.length !== 6}
                  >
                    {twoFALoading ? 'Verificando…' : 'Activar 2FA'}
                  </button>
                  <button className="btn btn-ghost" onClick={cancelTwoFA}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Activado */}
            {twoFAStep === 'idle' && totpHabilitado === true && (
              <div className="twofa-section">
                <p className="twofa-desc">
                  Tu cuenta está protegida. Se te pedirá un código de tu aplicación autenticadora
                  cada vez que inicies sesión.
                </p>
                <button className="btn btn-danger-outline" onClick={() => setTwoFAStep('disabling')}>
                  Desactivar 2FA
                </button>
              </div>
            )}

            {/* Desactivando */}
            {twoFAStep === 'disabling' && (
              <div className="twofa-section">
                <p className="twofa-desc">
                  Ingresa el código actual de tu aplicación autenticadora para confirmar.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000 000"
                  value={disableCode}
                  onChange={(e) => { setDisableCode(e.target.value.replace(/\D/g, '')); setTwoFAError(''); }}
                  className="twofa-code-input"
                  autoFocus
                />
                {twoFAError && <p className="twofa-error">{twoFAError}</p>}
                <div className="twofa-actions">
                  <button
                    className="btn btn-danger"
                    onClick={handleDisable2FA}
                    disabled={twoFALoading || disableCode.length !== 6}
                  >
                    {twoFALoading ? 'Procesando…' : 'Confirmar desactivación'}
                  </button>
                  <button className="btn btn-ghost" onClick={cancelTwoFA}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
