import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import '../Settings/Settings.css';

// ─── Types ───────────────────────────────────────────────────

interface SistemaConfig {
  resend_api_key: string;
  email_from:     string;
}

const MASKED = '••••••••';
const emptyConfig: SistemaConfig = { resend_api_key: '', email_from: '' };

function isMasked(v: string) { return v === MASKED; }
function isConfigured(v: string) { return (v && v !== '' && !isMasked(v)) || v === MASKED; }

// ─── Sub-components ──────────────────────────────────────────

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`settings-badge ${configured ? 'settings-badge-ok' : 'settings-badge-off'}`}>
      <span>{configured ? '●' : '○'}</span>
      {configured ? 'Configurado' : 'Sin configurar'}
    </span>
  );
}

function CredField({
  label, hint, value, onChange, type = 'text', placeholder,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className="settings-field full">
      <label>{label}</label>
      <div className="settings-cred-row">
        <input
          type={type === 'password' && !reveal ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (isMasked(value)) onChange(''); }}
          placeholder={isMasked(value) ? '(guardado — escribe para reemplazar)' : placeholder}
        />
        {type === 'password' && (
          <button className="btn-sm" onClick={() => setReveal((r) => !r)} type="button">
            {reveal ? 'Ocultar' : 'Ver'}
          </button>
        )}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function SaveBar({ saving, msg, onSave }: { saving: boolean; msg: string; onSave: () => void }) {
  return (
    <div className="settings-save-bar">
      {msg && <span className="save-msg">✓ {msg}</span>}
      <button className="btn-settings-primary" onClick={onSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function AdminSistemaPage() {
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [cfg, setCfg]           = useState<SistemaConfig>(emptyConfig);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Partial<SistemaConfig>>(
        '/api/superadmin/config-sistema',
        { token: accessToken! },
      );
      setCfg({ ...emptyConfig, ...data });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<SistemaConfig> = {};
      if (!isMasked(cfg.resend_api_key)) payload.resend_api_key = cfg.resend_api_key || undefined as any;
      if (cfg.email_from !== MASKED)     payload.email_from     = cfg.email_from     || undefined as any;

      const updated = await apiRequest<Partial<SistemaConfig>>(
        '/api/superadmin/config-sistema',
        { method: 'PATCH', token: accessToken!, body: payload },
      );
      setCfg({ ...emptyConfig, ...updated });
      setSavedMsg('Guardado');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const configured = isConfigured(cfg.resend_api_key);

  if (loading) return (
    <div className="settings-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Cargando configuración…
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Configuración del Sistema</h1>
        <p>
          Credenciales globales usadas para emails de sistema: invitaciones de usuarios,
          recuperación de contraseñas y notificaciones internas a agentes.
          Los tenants con su propia clave Resend en Integraciones la usarán para sus emails de negocio;
          el resto también heredará esta configuración como fallback.
        </p>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">✉️</div>
            <div>
              <h2>Email del Sistema — Resend</h2>
              <p>
                Clave global de Resend. Se aplica a emails de autenticación y notificaciones
                de agentes cuando el tenant no tiene su propia clave configurada.
              </p>
            </div>
          </div>
          <StatusBadge configured={configured} />
        </div>

        <div className="settings-grid single">
          <CredField
            label="API Key de Resend"
            type="password"
            value={cfg.resend_api_key}
            onChange={(v) => setCfg((p) => ({ ...p, resend_api_key: v }))}
            placeholder="re_..."
            hint="Obtener en resend.com → API Keys. Requiere dominio verificado."
          />
          <CredField
            label="Dirección de envío (FROM)"
            value={cfg.email_from}
            onChange={(v) => setCfg((p) => ({ ...p, email_from: v }))}
            placeholder="GestProp CRM <noreply@gestprop.net>"
            hint="Formato: Nombre <correo@dominio.com>. El dominio debe estar verificado en Resend."
          />
        </div>

        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--bg-subtle, #1e2540)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Prioridad de credenciales de email:</strong>
          <ol style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Clave propia del tenant (configurada en <em>Integraciones</em>) → emails de clientes y campañas</li>
            <li>Esta configuración de sistema → emails de autenticación y notificaciones a agentes</li>
            <li>Variable de entorno <code>RESEND_API_KEY</code> → fallback si no hay nada en DB</li>
          </ol>
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg-subtle, #1e2540)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--color-accent, #3b82f6)' }}>
          <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
            Cómo obtener las credenciales de Resend
          </strong>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
            <li>
              Crear una cuenta en{' '}
              <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent, #3b82f6)' }}>
                resend.com/signup
              </a>
            </li>
            <li>
              Verificar el dominio de envío en{' '}
              <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent, #3b82f6)' }}>
                resend.com/domains
              </a>{' '}
              (agrega los registros DNS que indica Resend)
            </li>
            <li>
              Generar la API Key en{' '}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent, #3b82f6)' }}>
                resend.com/api-keys
              </a>{' '}
              — permiso <em>Sending access</em> es suficiente
            </li>
            <li>
              Pegar la key aquí y usar <code>Nombre {'<'}correo@dominio-verificado.com{'>'}</code> como dirección FROM
            </li>
          </ol>
        </div>

        <SaveBar saving={saving} msg={savedMsg} onSave={handleSave} />
      </div>
    </div>
  );
}
