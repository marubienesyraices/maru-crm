import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Settings.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const resolveUrl = (url: string | null | undefined) =>
  url ? (url.startsWith('http') ? url : `${API}${url}`) : null;

interface TenantData {
  nombre: string;
  logo_url: string | null;
  color_primario: string | null;
  color_secundario: string | null;
  color_acento: string | null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="settings-field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/**
 * Color field with a swatch preview + hex text input.
 * The native <input type="color"> is rendered off-screen (invisible) and only
 * opened programmatically when the user clicks the swatch. React has ZERO event
 * listeners on the color picker — it only reads the value on `blur` (when the
 * dialog closes), causing a single re-render per interaction. This avoids the
 * browser freeze caused by Chrome's eye-dropper firing input events at
 * mouse-move frequency, which saturates the main thread.
 */
import { HexColorPicker } from 'react-colorful';

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

export default function SettingsEmpresaPage() {
  const { accessToken, refreshBranding } = useAuthStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState<TenantData>({
    nombre: '',
    logo_url: null,
    color_primario: '#1E3A5F',
    color_secundario: '#F5A623',
    color_acento: '#10B981',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<TenantData>('/api/tenants/mi-tenant', { token: accessToken! });
      setForm({
        nombre: data.nombre ?? '',
        logo_url: data.logo_url ?? null,
        color_primario: data.color_primario || '#1E3A5F',
        color_secundario: data.color_secundario || '#F5A623',
        color_acento: data.color_acento || '#10B981',
      });
    } catch {
      toast.error('No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { queueMicrotask(() => { load(); }); }, [load]);

  const uploadLogo = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato no válido. Usa JPEG, PNG, WebP o SVG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5 MB.');
      return;
    }
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/api/tenants/mi-tenant/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Error al subir el logo');
      }
      const { url } = await res.json();
      setForm((prev) => ({ ...prev, logo_url: url }));
      toast.success('Logo subido correctamente');
      await refreshBranding();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogo(file);
  };

  const save = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre de la empresa es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/api/tenants/mi-tenant', {
        method: 'PATCH',
        token: accessToken!,
        body: {
          nombre: form.nombre.trim(),
          logoUrl: form.logo_url || undefined,
          colorPrimario:   form.color_primario   || undefined,
          colorSecundario: form.color_secundario || undefined,
          colorAcento:     form.color_acento     || undefined,
        },
      });
      toast.success('Cambios guardados');
      await refreshBranding();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    setSaving(true);
    try {
      await apiRequest('/api/tenants/mi-tenant', {
        method: 'PATCH',
        token: accessToken!,
        body: { logoUrl: '' },
      });
      setForm((prev) => ({ ...prev, logo_url: null }));
      toast.success('Logo eliminado');
      await refreshBranding();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar el logo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '40px 0', color: 'var(--text-muted)' }}>
          <div className="spinner" /> Cargando…
        </div>
      </div>
    );
  }

  const logoSrc = resolveUrl(form.logo_url);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Mi empresa</h1>
        <p>Configura el nombre y logotipo que identifican a tu empresa en el CRM.</p>
      </div>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">🖼️</div>
            <div>
              <h2>Logotipo</h2>
              <p>PNG, JPG, WebP o SVG — máx. 5 MB. Recomendado: fondo transparente.</p>
            </div>
          </div>
        </div>

        <div className="empresa-logo-area">
          {/* Preview */}
          <div className="empresa-logo-preview">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo actual" />
            ) : (
              <div className="empresa-logo-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9l4-4 4 4 4-6 5 6" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                </svg>
                <span>Sin logo</span>
              </div>
            )}
          </div>

          {/* Upload zone */}
          <div className="empresa-logo-controls">
            <div
              className={`empresa-drop-zone${dragging ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
              aria-label="Subir logo"
            >
              {uploadingLogo ? (
                <>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  <span>Subiendo…</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Haz clic o arrastra el archivo aquí</span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {logoSrc && (
              <button
                className="empresa-remove-logo"
                onClick={removeLogo}
                disabled={saving}
                type="button"
              >
                Eliminar logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Nombre e identidad ───────────────────────────────── */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">🏢</div>
            <div>
              <h2>Nombre e identidad visual</h2>
              <p>Se muestra en la barra lateral del CRM y en los documentos generados.</p>
            </div>
          </div>
        </div>

        <div className="settings-grid">
          <Field label="Nombre de la empresa" hint="Nombre que aparece en la barra lateral y encabezado del CRM">
            <input
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Mi Inmobiliaria S.A."
              maxLength={120}
            />
          </Field>

          <div /> {/* spacer */}

          <ColorField
            label="Color primario"
            hint="Color principal de la marca (botones, acentos)"
            placeholder="#1E3A5F"
            value={form.color_primario || '#1E3A5F'}
            onChange={(v) => setForm((p) => ({ ...p, color_primario: v }))}
          />

          <ColorField
            label="Color secundario"
            hint="Color complementario de la marca"
            placeholder="#F5A623"
            value={form.color_secundario || '#F5A623'}
            onChange={(v) => setForm((p) => ({ ...p, color_secundario: v }))}
          />

          <ColorField
            label="Color de acento"
            hint="Color para elementos activos y destacados"
            placeholder="#10B981"
            value={form.color_acento || '#10B981'}
            onChange={(v) => setForm((p) => ({ ...p, color_acento: v }))}
          />
        </div>

        <div className="settings-save-bar">
          <button
            className="btn-settings-primary"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
