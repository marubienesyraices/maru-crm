import { useState, useEffect, useCallback, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Settings.css';

// ─── Types ───────────────────────────────────────────────────

interface TenantBranding {
  nombre: string;
  logo_url: string | null;
  color_primario?: string | null;
  color_secundario?: string | null;
  color_acento?: string | null;
}

interface ConfigPortal {
  nombre_empresa: string | null;
  slogan: string | null;
  email_contacto: string | null;
  telefono: string | null;
  whatsapp: string | null;
  direccion: string | null;
  horario_atencion: string | null;
  dominio_personalizado: string | null;
  subdominio: string | null;
  portal_activo: boolean;
  favicon_url: string | null;
  imagen_hero: string | null;
  titulo_hero: string | null;
  descripcion_hero: string | null;
  footer_texto: string | null;
  seo_titulo: string | null;
  seo_descripcion: string | null;
  seo_keywords: string | null;
  chatbot_activo: boolean;
  chatbot_mensaje_bienvenida: string | null;
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  mapbox_token_publico: string | null;
  mapa_lat_default: number | null;
  mapa_lng_default: number | null;
  mapa_zoom_default: number | null;
}

type Tab = 'identidad' | 'dominio' | 'apariencia' | 'seo' | 'chatbot' | 'analytics' | 'documentos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'identidad',  label: 'Identidad' },
  { id: 'dominio',    label: 'Dominio' },
  { id: 'apariencia', label: 'Apariencia' },
  { id: 'seo',        label: 'SEO' },
  { id: 'chatbot',    label: 'Chatbot' },
  { id: 'analytics',  label: 'Analytics & Mapa' },
  { id: 'documentos', label: 'Documentos' },
];

// ─── Helpers ─────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="settings-toggle" onClick={() => onChange(!value)} style={{ cursor: 'pointer' }}>
      <div className={`toggle-track${value ? ' on' : ''}`}>
        <div className="toggle-thumb" />
      </div>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        {value ? 'Activo' : 'Inactivo'}
      </span>
    </div>
  );
}

function ColorField({
  label, hint, placeholder, value, onChange,
}: {
  label: string; hint: string; placeholder: string;
  value: string; onChange: (v: string) => void;
}) {
  const isValid = /^#[0-9A-Fa-f]{3,6}$/.test(value);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <Field label={label} hint={hint}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div style={{ position: 'relative' }} ref={popoverRef}>
          <div
            onClick={() => setOpen((o) => !o)}
            style={{
              width: 44, height: 36, borderRadius: 6, flexShrink: 0,
              background: isValid ? value : 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          />
          {open && (
            <div style={{
              position: 'absolute', top: 40, left: 0, zIndex: 100,
              padding: 10, background: 'var(--bg-card)', 
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-subtle)'
            }}>
              <HexColorPicker color={isValid ? value : '#000000'} onChange={onChange} />
            </div>
          )}
        </div>
        
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
      </div>
    </Field>
  );
}


function Field({
  label, hint, children, full,
}: { label: string; hint?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`settings-field${full ? ' full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function SettingsPortalPage() {
  const { accessToken, plan } = useAuthStore();
  const hasSitioPropio = plan ? ['PRO', 'ENTERPRISE'].includes(plan) : true;
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('identidad');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [branding, setBranding] = useState<TenantBranding>({ nombre: '', logo_url: null });
  const [carta, setCarta]   = useState({ carta_color_primario: '', carta_tagline: '', carta_logo_url: '', carta_clausulas_custom: '' });

  const [portal, setPortal] = useState<ConfigPortal>({
    nombre_empresa: null, slogan: null, email_contacto: null, telefono: null,
    whatsapp: null, direccion: null, horario_atencion: null,
    dominio_personalizado: null, subdominio: null, portal_activo: true,
    favicon_url: null, imagen_hero: null, titulo_hero: null, descripcion_hero: null, footer_texto: null,
    seo_titulo: null, seo_descripcion: null, seo_keywords: null,
    chatbot_activo: true, chatbot_mensaje_bienvenida: null,
    google_analytics_id: null, facebook_pixel_id: null,
    mapbox_token_publico: null, mapa_lat_default: null, mapa_lng_default: null, mapa_zoom_default: 12,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, c] = await Promise.all([
        apiRequest<TenantBranding>('/api/tenants/branding', { token: accessToken! }),
        apiRequest<ConfigPortal>('/api/tenants/mi-tenant/portal', { token: accessToken! }),
        apiRequest<{ carta_color_primario: string | null; carta_tagline: string | null; carta_logo_url: string | null; carta_clausulas_custom: string | null }>(
          '/api/tenants/mi-tenant/carta-config', { token: accessToken! }
        ).catch(() => ({ carta_color_primario: null, carta_tagline: null, carta_logo_url: null, carta_clausulas_custom: null })),
      ]);
      setBranding(b);
      setPortal(p);
      setCarta({ carta_color_primario: c.carta_color_primario ?? '', carta_tagline: c.carta_tagline ?? '', carta_logo_url: c.carta_logo_url ?? '', carta_clausulas_custom: c.carta_clausulas_custom ?? '' });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const saveBranding = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/tenants/mi-tenant', {
        method: 'PATCH', token: accessToken!,
        body: {
          nombre: branding.nombre,
          logoUrl: branding.logo_url,
          colorPrimario:   branding.color_primario   || undefined,
          colorSecundario: branding.color_secundario || undefined,
          colorAcento:     branding.color_acento     || undefined,
        },
      });
      showSaved();
    } catch (e: any) { toast.error(e?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const savePortal = async () => {
    setSaving(true);
    try {
      // Strip server-managed fields that the DTO rejects (id, tenant_id, updated_at)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...dto } = portal as ConfigPortal & Record<string, unknown>;
      const { tenant_id: _tid, updated_at: _ua, ...cleanDto } = dto as Record<string, unknown>;
      const updated = await apiRequest<ConfigPortal>('/api/tenants/mi-tenant/portal', {
        method: 'PATCH', token: accessToken!, body: cleanDto,
      });
      setPortal(updated);
      showSaved();
    } catch (e: any) { toast.error(e?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const saveCarta = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/tenants/mi-tenant/carta-config', {
        method: 'PATCH', token: accessToken!,
        body: {
          carta_color_primario:   carta.carta_color_primario   || null,
          carta_tagline:          carta.carta_tagline          || null,
          carta_logo_url:         carta.carta_logo_url         || null,
          carta_clausulas_custom: carta.carta_clausulas_custom || null,
        },
      });
      showSaved();
    } catch (e: any) { toast.error(e?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const showSaved = () => {
    setSavedMsg('Guardado');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const sp = (key: keyof ConfigPortal) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setPortal((prev) => ({ ...prev, [key]: e.target.value || null }));

  const sn = (key: keyof ConfigPortal) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPortal((prev) => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : null }));

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
        <h1>Mi Portal</h1>
        <p>Configura la apariencia y contenido del portal público de tu empresa.</p>
      </div>

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`settings-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Identidad ─────────────────────────── */}
      {tab === 'identidad' && (
        <div className="settings-card">
          <div className="settings-grid">
            <Field label="Nombre de la empresa" hint="Se muestra en el header del portal">
              <input value={portal.nombre_empresa ?? ''} onChange={sp('nombre_empresa')} placeholder="Mi Inmobiliaria" />
            </Field>
            <Field label="Slogan">
              <input value={portal.slogan ?? ''} onChange={sp('slogan')} placeholder="Tu próxima propiedad te espera" />
            </Field>
            <Field label="Email de contacto">
              <input type="email" value={portal.email_contacto ?? ''} onChange={sp('email_contacto')} placeholder="info@tuempresa.com" />
            </Field>
            <Field label="Teléfono">
              <input value={portal.telefono ?? ''} onChange={sp('telefono')} placeholder="+502 1234 5678" />
            </Field>
            <Field label="WhatsApp" hint="Solo números con código de país: 50212345678">
              <input value={portal.whatsapp ?? ''} onChange={sp('whatsapp')} placeholder="50212345678" />
            </Field>
            <Field label="Horario de atención">
              <input value={portal.horario_atencion ?? ''} onChange={sp('horario_atencion')} placeholder="Lunes–Viernes 8–18h" />
            </Field>
            <Field label="Dirección" full>
              <input value={portal.direccion ?? ''} onChange={sp('direccion')} placeholder="5a Avenida 5-55, Zona 1, Guatemala" />
            </Field>
          </div>
          <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
        </div>
      )}

      {/* ── TAB: Dominio ───────────────────────────── */}
      {tab === 'dominio' && (
        <div className="settings-card">
          <div className="settings-grid single">
            <Field
              label="Subdominio en GestProp"
              hint={hasSitioPropio
                ? `Tu portal estará disponible en: ${portal.subdominio ? portal.subdominio + '.gestprop.net' : '(sin configurar)'}`
                : 'Disponible desde el plan PRO'}
            >
              <div style={{ position: 'relative' }}>
                <input
                  value={portal.subdominio ?? ''}
                  onChange={hasSitioPropio ? sp('subdominio') : undefined}
                  placeholder={hasSitioPropio ? 'miempresa  →  miempresa.gestprop.net' : 'Requiere plan PRO o superior'}
                  disabled={!hasSitioPropio}
                  style={!hasSitioPropio ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                />
                {!hasSitioPropio && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--accent-amber, #f59e0b)', fontWeight: 600 }}>
                    Plan PRO+
                  </span>
                )}
              </div>
            </Field>
            <Field
              label="Dominio personalizado"
              hint={hasSitioPropio
                ? 'Si tienes tu propio dominio: www.tuempresa.com — agrega el CNAME según la guía de despliegue.'
                : 'Disponible desde el plan PRO'}
            >
              <div style={{ position: 'relative' }}>
                <input
                  value={portal.dominio_personalizado ?? ''}
                  onChange={hasSitioPropio ? sp('dominio_personalizado') : undefined}
                  placeholder={hasSitioPropio ? 'www.tuempresa.com' : 'Requiere plan PRO o superior'}
                  disabled={!hasSitioPropio}
                  style={!hasSitioPropio ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                />
                {!hasSitioPropio && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--accent-amber, #f59e0b)', fontWeight: 600 }}>
                    Plan PRO+
                  </span>
                )}
              </div>
            </Field>
            <Field label="Estado del portal">
              <Toggle value={portal.portal_activo} onChange={(v) => setPortal((p) => ({ ...p, portal_activo: v }))} />
            </Field>
          </div>
          <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
        </div>
      )}

      {/* ── TAB: Apariencia ────────────────────────── */}
      {tab === 'apariencia' && (
        <>
          {/* Branding del tenant */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <div className="settings-card-icon">🏢</div>
                <div>
                  <h2>Identidad visual</h2>
                  <p>Nombre e imagen que se muestran en el portal público.</p>
                </div>
              </div>
            </div>
            <div className="settings-grid">
              <Field label="Nombre de la empresa (CRM)">
                <input value={branding.nombre} onChange={(e) => setBranding((b) => ({ ...b, nombre: e.target.value }))} />
              </Field>
              <Field label="URL del logotipo" hint="URL pública de la imagen (PNG/SVG recomendado)">
                <input value={branding.logo_url ?? ''} onChange={(e) => setBranding((b) => ({ ...b, logo_url: e.target.value || null }))} placeholder="https://..." />
              </Field>
              <ColorField
                label="Color primario"
                hint="Color principal de la marca (botones, acentos). Ej: #1E3A5F"
                placeholder="#1E3A5F"
                value={branding.color_primario || '#1E3A5F'}
                onChange={(v) => setBranding((b) => ({ ...b, color_primario: v }))}
              />
              <ColorField
                label="Color secundario"
                hint="Color complementario. Ej: #F5A623"
                placeholder="#F5A623"
                value={branding.color_secundario || '#F5A623'}
                onChange={(v) => setBranding((b) => ({ ...b, color_secundario: v }))}
              />
              <ColorField
                label="Color de acento"
                hint="Color para destacar elementos activos. Ej: #10B981"
                placeholder="#10B981"
                value={branding.color_acento || '#10B981'}
                onChange={(v) => setBranding((b) => ({ ...b, color_acento: v }))}
              />
            </div>
            <SaveBar saving={saving} msg={savedMsg} onSave={saveBranding} />
          </div>

          {/* Contenido visual del portal */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <div className="settings-card-icon">🖼️</div>
                <div>
                  <h2>Contenido visual</h2>
                  <p>Banner principal, favicon y pie de página del portal.</p>
                </div>
              </div>
            </div>
            <div className="settings-grid single">
              <Field label="URL del favicon" hint="Ícono de 32×32px. Recomendado: ICO o PNG">
                <input value={portal.favicon_url ?? ''} onChange={sp('favicon_url')} placeholder="https://..." />
              </Field>
              <Field label="Imagen hero (banner principal)" hint="URL de imagen. Recomendado: 1920×600px">
                <input value={portal.imagen_hero ?? ''} onChange={sp('imagen_hero')} placeholder="https://..." />
              </Field>
              <Field label="Título del hero">
                <input value={portal.titulo_hero ?? ''} onChange={sp('titulo_hero')} placeholder="Tu próxima propiedad te espera" />
              </Field>
              <Field label="Descripción del hero">
                <textarea value={portal.descripcion_hero ?? ''} onChange={sp('descripcion_hero')} placeholder="Explora nuestro catálogo de propiedades en Guatemala" rows={2} />
              </Field>
              <Field label="Texto del pie de página">
                <input value={portal.footer_texto ?? ''} onChange={sp('footer_texto')} placeholder="© 2026 Mi Empresa. Todos los derechos reservados." />
              </Field>
            </div>
            <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
          </div>
        </>
      )}

      {/* ── TAB: SEO ───────────────────────────────── */}
      {tab === 'seo' && (
        <div className="settings-card">
          <div className="settings-grid single">
            <Field label="Título SEO" hint="Aparece en la pestaña del navegador y resultados de Google (50-60 caracteres)">
              <input value={portal.seo_titulo ?? ''} onChange={sp('seo_titulo')} placeholder="Propiedades en Guatemala | Mi Empresa" maxLength={70} />
            </Field>
            <Field label="Descripción SEO" hint="Se muestra en los resultados de Google (150-160 caracteres)">
              <textarea value={portal.seo_descripcion ?? ''} onChange={sp('seo_descripcion')} placeholder="Encuentra casas, apartamentos y terrenos en Guatemala con los mejores agentes." rows={3} maxLength={200} />
            </Field>
            <Field label="Palabras clave" hint="Separadas por comas">
              <input value={portal.seo_keywords ?? ''} onChange={sp('seo_keywords')} placeholder="propiedades Guatemala, casas en venta, terrenos" />
            </Field>
          </div>
          <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
        </div>
      )}

      {/* ── TAB: Chatbot ───────────────────────────── */}
      {tab === 'chatbot' && (
        <div className="settings-card">
          <div className="settings-grid single">
            <Field label="Chatbot activo">
              <Toggle value={portal.chatbot_activo} onChange={(v) => setPortal((p) => ({ ...p, chatbot_activo: v }))} />
            </Field>
            <Field label="Mensaje de bienvenida" hint="Primera pregunta que el chatbot hace al visitante">
              <textarea
                value={portal.chatbot_mensaje_bienvenida ?? ''}
                onChange={sp('chatbot_mensaje_bienvenida')}
                placeholder="¡Hola! 👋 ¿Buscas casa, apartamento o terreno? Cuéntame un poco y te ayudo a encontrar la propiedad ideal."
                rows={3}
              />
            </Field>
          </div>
          <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
        </div>
      )}

      {/* ── TAB: Analytics & Mapa ──────────────────── */}
      {tab === 'analytics' && (
        <>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <div className="settings-card-icon">📊</div>
                <div><h2>Analytics</h2><p>Seguimiento de visitas en el portal público.</p></div>
              </div>
            </div>
            <div className="settings-grid">
              <Field label="Google Analytics ID" hint="Formato: G-XXXXXXXXXX">
                <input value={portal.google_analytics_id ?? ''} onChange={sp('google_analytics_id')} placeholder="G-XXXXXXXXXX" />
              </Field>
              <Field label="Facebook Pixel ID" hint="ID numérico del pixel de Meta">
                <input value={portal.facebook_pixel_id ?? ''} onChange={sp('facebook_pixel_id')} placeholder="123456789012345" />
              </Field>
            </div>
            <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">
                <div className="settings-card-icon">🗺️</div>
                <div><h2>Mapa</h2><p>Configura el centro y zoom predeterminado del mapa en el portal.</p></div>
              </div>
            </div>
            <div className="settings-grid single">
              <Field label="Mapbox Token público" hint="Token pk.eyJ1... para el mapa del portal. Obtener en mapbox.com">
                <input value={portal.mapbox_token_publico ?? ''} onChange={sp('mapbox_token_publico')} placeholder="pk.eyJ1..." />
              </Field>
            </div>
            <div className="settings-grid">
              <Field label="Latitud inicial">
                <input type="number" step="0.000001" value={portal.mapa_lat_default ?? ''} onChange={sn('mapa_lat_default')} placeholder="14.641871" />
              </Field>
              <Field label="Longitud inicial">
                <input type="number" step="0.000001" value={portal.mapa_lng_default ?? ''} onChange={sn('mapa_lng_default')} placeholder="-90.513280" />
              </Field>
              <Field label="Zoom inicial (1–22)">
                <input type="number" min={1} max={22} value={portal.mapa_zoom_default ?? 12} onChange={sn('mapa_zoom_default')} />
              </Field>
            </div>
            <SaveBar saving={saving} msg={savedMsg} onSave={savePortal} />
          </div>
        </>
      )}

      {/* ── TAB: Documentos ───────────────────────── */}
      {tab === 'documentos' && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">
              <div className="settings-card-icon">📄</div>
              <div>
                <h2>Carta de Comisión</h2>
                <p>Personaliza el aspecto y las cláusulas del PDF de la carta de compromiso de comisión.</p>
              </div>
            </div>
          </div>
          <div className="settings-grid">
            <ColorField
              label="Color primario"
              hint="Hex color, ej: #2563eb. Se usa en el encabezado y acentos del PDF."
              placeholder="#2563eb"
              value={carta.carta_color_primario || '#2563eb'}
              onChange={(v) => setCarta((prev) => ({ ...prev, carta_color_primario: v }))}
            />
            <Field label="Tagline / subtítulo" hint="Texto debajo del nombre de la empresa en el PDF.">
              <input
                value={carta.carta_tagline}
                onChange={(e) => setCarta((prev) => ({ ...prev, carta_tagline: e.target.value }))}
                placeholder="Bienes y Raíces · CRM"
              />
            </Field>
            <Field label="URL de logo para la carta" hint="URL pública de la imagen del logo que aparece en el PDF. Déjalo vacío para usar solo el nombre de empresa.">
              <input
                value={carta.carta_logo_url}
                onChange={(e) => setCarta((prev) => ({ ...prev, carta_logo_url: e.target.value }))}
                placeholder="https://cdn.empresa.com/logo.png"
              />
            </Field>
            <Field label="Cláusulas personalizadas" hint="Texto de los términos y condiciones de vigencia. Si se deja vacío se usan las cláusulas predeterminadas.">
              <textarea
                value={carta.carta_clausulas_custom}
                onChange={(e) => setCarta((prev) => ({ ...prev, carta_clausulas_custom: e.target.value }))}
                placeholder="La vigencia del presente compromiso es de..."
                rows={5}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </Field>
          </div>
          <SaveBar saving={saving} msg={savedMsg} onSave={saveCarta} />
        </div>
      )}
    </div>
  );
}

// ─── Shared save bar ─────────────────────────────────────────

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
