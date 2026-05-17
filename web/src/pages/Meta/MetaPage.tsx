import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmDialog';
import './Meta.css';

// ─── Types ────────────────────────────────────────────────────

type Plataforma = 'FACEBOOK' | 'INSTAGRAM' | 'AMBAS';
type Estado = 'BORRADOR' | 'PROGRAMADA' | 'PUBLICADA' | 'FALLIDA';

interface MetaPub {
  id: string; plataforma: Plataforma; estado: Estado; mensaje: string;
  imagen_url: string | null; programado_para: string | null; publicado_at: string | null;
  fb_post_id: string | null; ig_post_id: string | null; error_msg: string | null;
  created_at: string;
  propiedad: { id: string; codigo: string; titulo: string } | null;
  agente: { id: string; nombre: string };
}

interface Propiedad { id: string; codigo: string; titulo: string; }

const PLATAFORMA_ICONS: Record<Plataforma, string> = {
  FACEBOOK: '🔵 Facebook', INSTAGRAM: '🟣 Instagram', AMBAS: '🔵🟣 Facebook + Instagram',
};

const ESTADO_CLS: Record<Estado, string> = {
  BORRADOR: 'meta-badge-borrador', PROGRAMADA: 'meta-badge-programada',
  PUBLICADA: 'meta-badge-publicada', FALLIDA: 'meta-badge-fallida',
};
const ESTADO_LABELS: Record<Estado, string> = {
  BORRADOR: 'Borrador', PROGRAMADA: 'Programada', PUBLICADA: 'Publicada', FALLIDA: 'Fallida',
};

// ─── Publication List Tab ─────────────────────────────────────

function ListaTab({ token, onNew }: { token: string; onNew: () => void }) {
  const [list, setList] = useState<MetaPub[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await apiRequest<MetaPub[]>('/api/meta', { token })); }
    catch { /* noop */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const publicar = async (id: string) => {
    const ok = await confirm({ title: '¿Publicar ahora?', message: 'La publicación se enviará a las redes configuradas.', confirmLabel: 'Publicar' });
    if (!ok) return;
    setPublishing(id);
    try {
      await apiRequest(`/api/meta/${id}/publicar`, { token, method: 'POST' });
      toast.success('Publicado correctamente');
      load();
    } catch (e: any) { toast.error(e?.message ?? 'Error al publicar'); }
    finally { setPublishing(null); }
  };

  const eliminar = async (id: string) => {
    const ok = await confirm({ title: '¿Eliminar publicación?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    setDeleting(id);
    try {
      await apiRequest(`/api/meta/${id}`, { token, method: 'DELETE' });
      toast.success('Publicación eliminada');
      load();
    } catch { /* noop */ }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="meta-loading"><div className="spinner" /><span>Cargando…</span></div>;

  return (
    <div>
      <div className="meta-toolbar">
        <span>{list.length} publicación{list.length !== 1 ? 'es' : ''}</span>
        <button className="btn-primary" onClick={onNew}>+ Nueva publicación</button>
      </div>

      {list.length === 0
        ? <div className="meta-empty">Sin publicaciones aún. Crea la primera.</div>
        : <div className="meta-list">
            {list.map((p) => (
              <div key={p.id} className="meta-card">
                <div className="meta-card-header">
                  <div className="meta-card-meta">
                    <span className={`meta-badge ${ESTADO_CLS[p.estado]}`}>{ESTADO_LABELS[p.estado]}</span>
                    <span>{PLATAFORMA_ICONS[p.plataforma]}</span>
                    {p.propiedad && <span>· {p.propiedad.titulo} ({p.propiedad.codigo})</span>}
                    <span>· {p.agente.nombre}</span>
                  </div>
                  <div className="meta-card-actions">
                    {p.estado === 'BORRADOR' && (
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.8125rem', padding: '5px 12px' }}
                        onClick={() => publicar(p.id)}
                        disabled={publishing === p.id}
                      >
                        {publishing === p.id ? '…' : '📤 Publicar'}
                      </button>
                    )}
                    {(p.estado === 'BORRADOR' || p.estado === 'FALLIDA') && (
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => eliminar(p.id)}
                        disabled={deleting === p.id}
                        title="Eliminar"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                {p.imagen_url && (
                  <img src={p.imagen_url} alt="imagen" className="meta-card-imagen" />
                )}
                <div className="meta-card-mensaje">{p.mensaje}</div>
                <div className="meta-card-footer">
                  {p.publicado_at && <span>Publicado: {new Date(p.publicado_at).toLocaleString('es-GT')}</span>}
                  {p.programado_para && p.estado === 'PROGRAMADA' && (
                    <span>Programado: {new Date(p.programado_para).toLocaleString('es-GT')}</span>
                  )}
                  {p.fb_post_id  && <span>FB ID: {p.fb_post_id}</span>}
                  {p.ig_post_id  && <span>IG ID: {p.ig_post_id}</span>}
                  {p.error_msg   && <span className="meta-error-msg">⚠ {p.error_msg}</span>}
                  <span>Creado: {new Date(p.created_at).toLocaleDateString('es-GT')}</span>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── New Publication Tab ──────────────────────────────────────

function NuevaTab({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [plataforma, setPlataforma] = useState<Plataforma>('FACEBOOK');
  const [propiedadId, setPropiedadId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [modo, setModo] = useState<'ahora' | 'programar'>('ahora');
  const [programadoPara, setProgramadoPara] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingTexto, setLoadingTexto] = useState(false);
  const toast = useToast();

  // FB max 63206 chars; IG max 2200
  const maxChars = plataforma === 'INSTAGRAM' ? 2200 : 63206;
  const charWarning = mensaje.length > maxChars;

  useEffect(() => {
    apiRequest<Propiedad[]>('/api/propiedades?limit=200', { token })
      .then((data: any) => setPropiedades(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => {});
  }, [token]);

  const cargarTexto = async () => {
    if (!propiedadId) return;
    setLoadingTexto(true);
    try {
      const res = await apiRequest<{ mensaje: string; imagen_url: string | null }>(
        `/api/meta/preview-texto/${propiedadId}`, { token, method: 'POST' },
      );
      setMensaje(res.mensaje);
      if (res.imagen_url) setImagenUrl(res.imagen_url);
    } catch { /* noop */ }
    finally { setLoadingTexto(false); }
  };

  const submit = async (publicarAhora: boolean) => {
    if (!mensaje.trim() || charWarning) return;
    setSaving(true);
    try {
      const pub = await apiRequest<MetaPub>('/api/meta', {
        token, method: 'POST',
        body: {
          plataforma,
          mensaje: mensaje.trim(),
          propiedad_id: propiedadId || undefined,
          imagen_url: imagenUrl.trim() || undefined,
        },
      });

      if (publicarAhora) {
        await apiRequest(`/api/meta/${pub.id}/publicar`, { token, method: 'POST' });
      } else if (modo === 'programar' && programadoPara) {
        await apiRequest(`/api/meta/${pub.id}/programar`, {
          token, method: 'POST',
          body: { programado_para: new Date(programadoPara).toISOString() },
        });
      }

      setMensaje(''); setImagenUrl(''); setPropiedadId(''); setProgramadoPara('');
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  // Minimum datetime: 10 min from now
  const minDatetime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="meta-form-section">
      <h2>Nueva publicación</h2>

      {/* Platform selector */}
      <div className="meta-field">
        <label>Plataforma</label>
        <div className="meta-platform-btns">
          {(['FACEBOOK', 'INSTAGRAM', 'AMBAS'] as Plataforma[]).map((p) => (
            <button
              key={p}
              className={`meta-platform-btn ${plataforma === p ? 'selected' : ''}`}
              onClick={() => setPlataforma(p)}
              type="button"
            >
              {p === 'FACEBOOK' ? '🔵 Facebook' : p === 'INSTAGRAM' ? '🟣 Instagram' : '🔵🟣 Ambas'}
            </button>
          ))}
        </div>
        {(plataforma === 'INSTAGRAM' || plataforma === 'AMBAS') && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Instagram requiere imagen. Sin imagen, solo se publicará en Facebook.
          </p>
        )}
      </div>

      {/* Property picker */}
      <div className="meta-field">
        <label>Propiedad (opcional)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="meta-field select"
            value={propiedadId}
            onChange={(e) => setPropiedadId(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: '0.875rem' }}
          >
            <option value="">Sin propiedad</option>
            {propiedades.map((p) => (
              <option key={p.id} value={p.id}>{p.titulo} ({p.codigo})</option>
            ))}
          </select>
          <button
            className="btn-ghost"
            onClick={cargarTexto}
            disabled={!propiedadId || loadingTexto}
            type="button"
          >
            {loadingTexto ? '…' : '✨ Auto-texto'}
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="meta-field">
        <label>Mensaje</label>
        <textarea
          rows={8}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Escribe el texto del post o usa ✨ Auto-texto para generar desde una propiedad…"
        />
        <div className={`meta-char-count ${charWarning ? 'meta-error-msg' : ''}`}>
          {mensaje.length} / {maxChars.toLocaleString()}
          {charWarning && ' — supera el límite'}
        </div>
      </div>

      {/* Image URL */}
      <div className="meta-field">
        <label>URL de imagen (opcional)</label>
        <input
          type="url"
          value={imagenUrl}
          onChange={(e) => setImagenUrl(e.target.value)}
          placeholder="https://…"
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          La imagen debe ser pública. Para propiedades, usa ✨ Auto-texto para cargar la portada.
        </p>
      </div>

      {/* Preview */}
      {mensaje && (
        <div className="meta-preview">
          <div className="meta-preview-title">Vista previa</div>
          <div className="meta-preview-post">{mensaje}</div>
          {imagenUrl && <img src={imagenUrl} alt="preview" className="meta-preview-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        </div>
      )}

      {/* Publish mode */}
      <div className="meta-field" style={{ marginTop: 20 }}>
        <label>Cuándo publicar</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'normal' }}>
            <input type="radio" checked={modo === 'ahora'} onChange={() => setModo('ahora')} /> Publicar ahora
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'normal' }}>
            <input type="radio" checked={modo === 'programar'} onChange={() => setModo('programar')} /> Programar
          </label>
        </div>
        {modo === 'programar' && (
          <div className="meta-schedule-row">
            <input
              type="datetime-local"
              min={minDatetime}
              value={programadoPara}
              onChange={(e) => setProgramadoPara(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: '0.875rem' }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="meta-actions">
        <button
          className="btn-ghost"
          disabled={saving || !mensaje.trim() || charWarning}
          onClick={() => submit(false)}
          type="button"
        >
          {saving ? '…' : '💾 Guardar borrador'}
        </button>
        <button
          className="btn-primary"
          disabled={saving || !mensaje.trim() || charWarning || (modo === 'programar' && !programadoPara)}
          onClick={() => submit(modo === 'ahora')}
          type="button"
        >
          {saving ? '…' : modo === 'ahora' ? '📤 Publicar ahora' : '🕐 Programar'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

type Tab = 'lista' | 'nueva';

export default function MetaPage() {
  const { accessToken, planFeatures } = useAuthStore();
  const [tab, setTab] = useState<Tab>('lista');
  const [configured, setConfigured] = useState<boolean | null>(null);

  const planAllowed = planFeatures === null || planFeatures.tiene_meta;

  useEffect(() => {
    if (!planAllowed) return;
    apiRequest<{ configured: boolean; ig_configured: boolean }>('/api/meta/status', { token: accessToken! })
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, [accessToken, planAllowed]);

  if (!planAllowed) {
    return (
      <div className="meta-page">
        <div className="meta-header"><h1>Publicaciones en Meta</h1></div>
        <div style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Función no disponible en tu plan</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 420, marginInline: 'auto' }}>
            La publicación automática en Facebook e Instagram está disponible a partir del plan <strong>PRO</strong>.
            Contacta con el administrador para actualizar tu plan.
          </p>
        </div>
      </div>
    );
  }

  const goList = () => setTab('lista');

  return (
    <div className="meta-page">
      <div className="meta-header">
        <h1>Publicaciones en Meta</h1>
      </div>

      {configured === false && (
        <div className="meta-config-warn">
          ⚠️ Las credenciales de Meta no están configuradas. Agrega <code>META_PAGE_ACCESS_TOKEN</code>, <code>META_PAGE_ID</code>
          {' '}y <code>META_IG_USER_ID</code> al archivo <code>.env</code> para activar la publicación real.
          Puedes crear borradores igualmente.
        </div>
      )}

      <div className="meta-tabs">
        <button className={`meta-tab ${tab === 'lista' ? 'active' : ''}`} onClick={() => setTab('lista')}>
          📋 Publicaciones
        </button>
        <button className={`meta-tab ${tab === 'nueva' ? 'active' : ''}`} onClick={() => setTab('nueva')}>
          + Nueva
        </button>
      </div>

      {tab === 'lista'
        ? <ListaTab token={accessToken!} onNew={() => setTab('nueva')} />
        : <NuevaTab token={accessToken!} onCreated={goList} />
      }
    </div>
  );
}
