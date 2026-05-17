import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Settings.css';

// ─── Types ───────────────────────────────────────────────────

interface IntegConfig {
  // Email
  resend_api_key:   string;
  email_from:       string;
  // WhatsApp
  whatsapp_token:           string;
  whatsapp_phone_number_id: string;
  // Meta
  meta_page_token:  string;
  meta_page_id:     string;
  meta_ig_user_id:  string;
  // Zoom
  zoom_account_id:    string;
  zoom_client_id:     string;
  zoom_client_secret: string;
  // DocuSign
  docusign_integration_key: string;
  docusign_account_id:      string;
  docusign_user_id:         string;
  docusign_rsa_private_key: string;
  docusign_base_url:        string;
  // Sindicación
  encuentra24_api_key: string;
  ml_access_token:     string;
}

type Section = 'email' | 'whatsapp' | 'meta' | 'zoom' | 'docusign' | 'sindicacion';

const SECTIONS: { id: Section; label: string; icon: string; description: string }[] = [
  { id: 'email',      icon: '✉️',  label: 'Email (Resend)',       description: 'Envío de notificaciones y campañas' },
  { id: 'whatsapp',   icon: '💬',  label: 'WhatsApp Business',    description: 'Mensajes directos desde el CRM' },
  { id: 'meta',       icon: '📱',  label: 'Meta (Facebook / IG)', description: 'Publicación automática en redes sociales' },
  { id: 'zoom',       icon: '🎥',  label: 'Zoom',                 description: 'Videollamadas para visitas virtuales' },
  { id: 'docusign',   icon: '✍️',  label: 'DocuSign',             description: 'Firma digital de contratos' },
  { id: 'sindicacion',icon: '🌐',  label: 'Sindicación',          description: 'Publicación en Encuentra24 y MercadoLibre' },
];

const MASKED = '••••••••';

function isMasked(v: string) { return v === MASKED; }
function isConfigured(v: string) { return v && v !== '' && !isMasked(v) || v === MASKED; }

// ─── Sub-components ──────────────────────────────────────────

function PlanLockedCard({ feature }: { feature: string }) {
  return (
    <div className="settings-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
      <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>{feature}</h2>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', maxWidth: 420, marginInline: 'auto' }}>
        Tu plan actual no incluye esta funcionalidad.
        Contacta con el administrador para actualizar tu plan.
      </p>
      <span className="settings-badge settings-badge-off">Plan no incluye esta función</span>
    </div>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`settings-badge ${configured ? 'settings-badge-ok' : 'settings-badge-off'}`}>
      <span>{configured ? '●' : '○'}</span>
      {configured ? 'Configurado' : 'Sin configurar'}
    </span>
  );
}

function CredField({
  label, hint, value, onChange, type = 'text', placeholder, textarea,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; type?: string;
  placeholder?: string; textarea?: boolean;
}) {
  const [reveal, setReveal] = useState(false);

  const handleFocus = () => {
    if (isMasked(value)) onChange('');
  };

  return (
    <div className="settings-field full">
      <label>{label}</label>
      {textarea ? (
        <div className="settings-cred-row">
          <textarea
            value={reveal && isMasked(value) ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            rows={3}
            style={{ flex: 1, resize: 'vertical', background: 'var(--bg-input,#151b2e)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.875rem' }}
          />
        </div>
      ) : (
        <div className="settings-cred-row">
          <input
            type={type === 'password' && !reveal ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            placeholder={isMasked(value) ? '(guardado — escribe para reemplazar)' : placeholder}
          />
          {type === 'password' && (
            <button className="btn-sm" onClick={() => setReveal((r) => !r)} type="button">
              {reveal ? 'Ocultar' : 'Ver'}
            </button>
          )}
        </div>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

// ─── Section cards ───────────────────────────────────────────

function EmailSection({ cfg, onChange, onSave, saving, savedMsg }: SectionProps) {
  const configured = isConfigured(cfg.resend_api_key) || isConfigured(cfg.email_from);
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">✉️</div>
          <div>
            <h2>Email — Resend</h2>
            <p>Envío de notificaciones automáticas y campañas de email.</p>
          </div>
        </div>
        <StatusBadge configured={configured} />
      </div>
      <div className="settings-grid single">
        <CredField label="API Key de Resend" type="password" value={cfg.resend_api_key}
          onChange={(v) => onChange('resend_api_key', v)} placeholder="re_..."
          hint="Obtener en resend.com → API Keys" />
        <CredField label="Dirección de envío (FROM)" value={cfg.email_from}
          onChange={(v) => onChange('email_from', v)}
          placeholder="Mi Empresa <noreply@miempresa.com>" />
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Sin configurar, se usan las credenciales globales del sistema (si existen).
      </p>
      <SaveBar saving={saving} msg={savedMsg} onSave={onSave} />
    </div>
  );
}

function WhatsAppSection({ cfg, onChange, onSave, saving, savedMsg }: SectionProps) {
  const configured = isConfigured(cfg.whatsapp_token);
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">💬</div>
          <div>
            <h2>WhatsApp Business Cloud API</h2>
            <p>Envía mensajes desde el CRM. Sin configurar, usa el enlace wa.me.</p>
          </div>
        </div>
        <StatusBadge configured={configured} />
      </div>
      <div className="settings-grid single">
        <CredField label="Token de acceso (API Token)" type="password" value={cfg.whatsapp_token}
          onChange={(v) => onChange('whatsapp_token', v)} placeholder="EAAxxxxxxxx"
          hint="Meta Business → WhatsApp → Configuración → Token de acceso" />
        <CredField label="Phone Number ID" value={cfg.whatsapp_phone_number_id}
          onChange={(v) => onChange('whatsapp_phone_number_id', v)} placeholder="123456789012345"
          hint="ID del número registrado en Meta Business" />
      </div>
      <SaveBar saving={saving} msg={savedMsg} onSave={onSave} />
    </div>
  );
}

function MetaSection({ cfg, onChange, onSave, saving, savedMsg }: SectionProps) {
  const configured = isConfigured(cfg.meta_page_token) && isConfigured(cfg.meta_page_id);
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">📱</div>
          <div>
            <h2>Meta Graph API</h2>
            <p>Publicación automática de propiedades en Facebook e Instagram.</p>
          </div>
        </div>
        <StatusBadge configured={configured} />
      </div>
      <div className="settings-grid single">
        <CredField label="Page Access Token" type="password" value={cfg.meta_page_token}
          onChange={(v) => onChange('meta_page_token', v)} placeholder="EAAxxxxxxxx"
          hint="Token de larga duración de la página de Facebook" />
        <CredField label="Facebook Page ID" value={cfg.meta_page_id}
          onChange={(v) => onChange('meta_page_id', v)} placeholder="123456789012345" />
        <CredField label="Instagram User ID" value={cfg.meta_ig_user_id}
          onChange={(v) => onChange('meta_ig_user_id', v)} placeholder="987654321098765"
          hint="ID de la cuenta de Instagram Business vinculada a la página" />
      </div>
      <SaveBar saving={saving} msg={savedMsg} onSave={onSave} />
    </div>
  );
}

function ZoomSection({ cfg, onChange, onSave, saving, savedMsg }: SectionProps) {
  const configured = isConfigured(cfg.zoom_account_id);
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">🎥</div>
          <div>
            <h2>Zoom</h2>
            <p>Genera links de videollamada al crear visitas virtuales.</p>
          </div>
        </div>
        <StatusBadge configured={configured} />
      </div>
      <div className="settings-grid single">
        <CredField label="Account ID" value={cfg.zoom_account_id}
          onChange={(v) => onChange('zoom_account_id', v)} placeholder="xxxxxxxxxx"
          hint="Crear Server-to-Server OAuth app en marketplace.zoom.us" />
        <CredField label="Client ID" value={cfg.zoom_client_id}
          onChange={(v) => onChange('zoom_client_id', v)} placeholder="xxxxxxxxxx" />
        <CredField label="Client Secret" type="password" value={cfg.zoom_client_secret}
          onChange={(v) => onChange('zoom_client_secret', v)} placeholder="xxxxxxxxxxxxxxxxxx" />
      </div>
      <SaveBar saving={saving} msg={savedMsg} onSave={onSave} />
    </div>
  );
}

function DocuSignSection({ cfg, onChange, onSave, saving, savedMsg }: SectionProps) {
  const configured = isConfigured(cfg.docusign_integration_key);
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">✍️</div>
          <div>
            <h2>DocuSign</h2>
            <p>Firma digital de contratos y cartas de comisión.</p>
          </div>
        </div>
        <StatusBadge configured={configured} />
      </div>
      <div className="settings-grid single">
        <CredField label="Integration Key (Client ID)" value={cfg.docusign_integration_key}
          onChange={(v) => onChange('docusign_integration_key', v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          hint="developers.docusign.com → Apps and Keys" />
        <CredField label="Account ID" value={cfg.docusign_account_id}
          onChange={(v) => onChange('docusign_account_id', v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        <CredField label="User ID (impersonation)" value={cfg.docusign_user_id}
          onChange={(v) => onChange('docusign_user_id', v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        <CredField label="RSA Private Key" type="password" textarea value={cfg.docusign_rsa_private_key}
          onChange={(v) => onChange('docusign_rsa_private_key', v)}
          placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
          hint="Clave privada RSA generada en DocuSign para JWT Grant" />
        <CredField label="Base URL" value={cfg.docusign_base_url}
          onChange={(v) => onChange('docusign_base_url', v)}
          placeholder="https://www.docusign.net/restapi"
          hint="Demo: https://demo.docusign.net/restapi — Producción: https://www.docusign.net/restapi" />
      </div>
      <SaveBar saving={saving} msg={savedMsg} onSave={onSave} />
    </div>
  );
}

function SindicacionSection({ cfg, onChange, onSave, saving, savedMsg }: SectionProps) {
  const configured = isConfigured(cfg.encuentra24_api_key) || isConfigured(cfg.ml_access_token);
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-title">
          <div className="settings-card-icon">🌐</div>
          <div>
            <h2>Sindicación — Portales externos</h2>
            <p>Publica propiedades en Encuentra24 y MercadoLibre automáticamente.</p>
          </div>
        </div>
        <StatusBadge configured={configured} />
      </div>
      <div className="settings-grid single">
        <CredField label="Encuentra24 API Key" type="password" value={cfg.encuentra24_api_key}
          onChange={(v) => onChange('encuentra24_api_key', v)} placeholder="xxxxxxxxxxxxxx"
          hint="Obtener en el portal de partners de Encuentra24" />
        <CredField label="MercadoLibre Access Token" type="password" value={cfg.ml_access_token}
          onChange={(v) => onChange('ml_access_token', v)} placeholder="APP_USR-..."
          hint="Token OAuth de MercadoLibre. Renovar cada 6 horas." />
      </div>
      <SaveBar saving={saving} msg={savedMsg} onSave={onSave} />
    </div>
  );
}

type SectionProps = {
  cfg: IntegConfig;
  onChange: (key: keyof IntegConfig, val: string) => void;
  onSave: () => void;
  saving: boolean;
  savedMsg: string;
};

// ─── Page ────────────────────────────────────────────────────

const emptyConfig: IntegConfig = {
  resend_api_key: '', email_from: '',
  whatsapp_token: '', whatsapp_phone_number_id: '',
  meta_page_token: '', meta_page_id: '', meta_ig_user_id: '',
  zoom_account_id: '', zoom_client_id: '', zoom_client_secret: '',
  docusign_integration_key: '', docusign_account_id: '', docusign_user_id: '',
  docusign_rsa_private_key: '', docusign_base_url: '',
  encuentra24_api_key: '', ml_access_token: '',
};

export default function SettingsIntegracionesPage() {
  const { accessToken, planFeatures } = useAuthStore();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<Section>('email');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [cfg, setCfg] = useState<IntegConfig>(emptyConfig);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Partial<IntegConfig>>('/api/tenants/mi-tenant/integraciones', { token: accessToken! });
      setCfg({ ...emptyConfig, ...data });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key: keyof IntegConfig, val: string) => {
    setCfg((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send only the known writable fields (excludes id/tenant_id/updated_at returned by the API)
      // Skip masked values — those are unchanged credentials the server already has.
      const payload: Partial<IntegConfig> = {};
      (Object.keys(emptyConfig) as (keyof IntegConfig)[]).forEach((k) => {
        if (cfg[k] !== MASKED) payload[k] = cfg[k] || undefined as any;
      });
      const updated = await apiRequest<Partial<IntegConfig>>('/api/tenants/mi-tenant/integraciones', {
        method: 'PATCH', token: accessToken!, body: payload,
      });
      setCfg({ ...emptyConfig, ...updated });
      setSavedMsg('Guardado');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e: any) { toast.error(e?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const sectionProps: SectionProps = { cfg, onChange: handleChange, onSave: handleSave, saving, savedMsg };

  if (loading) return (
    <div className="settings-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', color: 'var(--text-muted)' }}>
        <div className="spinner" /> Cargando integraciones…
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Integraciones</h1>
        <p>Configura las credenciales de los servicios externos. Los campos guardados se muestran como ••••••••.</p>
      </div>

      {/* Mobile tabs / Desktop pills */}
      <div className="settings-tabs" style={{ marginBottom: 24 }}>
        {SECTIONS.map((s) => {
          const locked = s.id === 'meta' && planFeatures !== null && !planFeatures.tiene_integraciones;
          return (
            <button
              key={s.id}
              className={`settings-tab${activeSection === s.id ? ' active' : ''}${locked ? ' settings-tab-locked' : ''}`}
              onClick={() => setActiveSection(s.id)}
              title={locked ? 'No disponible en tu plan actual' : undefined}
            >
              {s.icon} {s.label}{locked ? ' 🔒' : ''}
            </button>
          );
        })}
      </div>

      {activeSection === 'email'       && <EmailSection       {...sectionProps} />}
      {activeSection === 'whatsapp'    && <WhatsAppSection    {...sectionProps} />}
      {activeSection === 'meta'        && (
        planFeatures !== null && !planFeatures.tiene_integraciones
          ? <PlanLockedCard feature="Publicación en Meta (Facebook / Instagram)" />
          : <MetaSection {...sectionProps} />
      )}
      {activeSection === 'zoom'        && <ZoomSection        {...sectionProps} />}
      {activeSection === 'docusign'    && <DocuSignSection    {...sectionProps} />}
      {activeSection === 'sindicacion' && <SindicacionSection {...sectionProps} />}
    </div>
  );
}

// ─── Save bar ─────────────────────────────────────────────────

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
