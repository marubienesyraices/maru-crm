import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Portal.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const TIPO_LABELS: Record<string, string> = {
  CASA: 'Casa', APARTAMENTO: 'Apartamento', TERRENO: 'Terreno',
  LOCAL_COMERCIAL: 'Local Comercial', OFICINA: 'Oficina',
  BODEGA: 'Bodega', FINCA: 'Finca', EDIFICIO: 'Edificio', OTRO: 'Otro',
};

function fmtPrice(prop: any): string {
  const moneda = prop.moneda || 'GTQ';
  if (prop.gestion === 'AMBAS' && prop.precio_venta && prop.precio_renta) {
    return `${moneda} ${Number(prop.precio_venta).toLocaleString('es-GT')} venta / ${Number(prop.precio_renta).toLocaleString('es-GT')} renta`;
  }
  const precio = prop.gestion === 'RENTA' ? prop.precio_renta : prop.precio_venta ?? prop.precio_renta;
  if (!precio) return '—';
  return `${moneda} ${Number(precio).toLocaleString('es-GT')}${prop.gestion === 'RENTA' ? ' /mes' : ''}`;
}

// ─── Mini map ──────────────────────────────────────────────────

function PropertyMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    let cancelled = false;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [lng, lat],
        zoom: 15,
        interactive: true,
      });

      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([lng, lat])
        .addTo(map);

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      return () => map.remove();
    });

    return () => { cancelled = true; };
  }, [lat, lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="portal-detail-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.875rem' }}>
        Mapa no disponible
      </div>
    );
  }

  return <div ref={containerRef} className="portal-detail-map" />;
}

// ─── Registration modal ────────────────────────────────────────

type ModalState = 'idle' | 'open' | 'submitting' | 'success';

function RegistroModal({ propiedadId, onClose }: { propiedadId: string; onClose: () => void }) {
  const [state, setState] = useState<ModalState>('open');
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', mensaje: '' });
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim()) return;
    setState('submitting');
    setError('');
    try {
      const res = await fetch(`${API}/api/public/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          telefono: form.telefono.trim() || undefined,
          propiedad_id: propiedadId,
          mensaje: form.mensaje.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Error al enviar el registro');
      }
      setState('success');
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
      setState('open');
    }
  };

  return (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="portal-modal-header">
          <h3 className="portal-modal-title">Registrar interés</h3>
          <button className="portal-modal-close" onClick={onClose}>✕</button>
        </div>

        {state === 'success' ? (
          <div className="portal-modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📬</div>
            <h4 style={{ margin: '0 0 8px', color: '#f1f5f9' }}>¡Casi listo!</h4>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: '0.9375rem' }}>
              Revisa tu correo y haz clic en el enlace de confirmación para activar tu registro.
            </p>
            <button className="portal-contact-btn portal-contact-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="portal-modal-body">
              {error && <p className="portal-form-error">{error}</p>}
              <div className="portal-form-group">
                <label className="portal-form-label">Nombre *</label>
                <input
                  className="portal-form-input"
                  value={form.nombre}
                  onChange={set('nombre')}
                  placeholder="Tu nombre completo"
                  required
                  disabled={state === 'submitting'}
                />
              </div>
              <div className="portal-form-group">
                <label className="portal-form-label">Correo electrónico *</label>
                <input
                  className="portal-form-input"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="tu@correo.com"
                  required
                  disabled={state === 'submitting'}
                />
              </div>
              <div className="portal-form-group">
                <label className="portal-form-label">Teléfono / WhatsApp</label>
                <input
                  className="portal-form-input"
                  value={form.telefono}
                  onChange={set('telefono')}
                  placeholder="+502 0000-0000"
                  disabled={state === 'submitting'}
                />
              </div>
              <div className="portal-form-group">
                <label className="portal-form-label">Mensaje (opcional)</label>
                <textarea
                  className="portal-form-input portal-form-textarea"
                  value={form.mensaje}
                  onChange={set('mensaje')}
                  placeholder="¿Tienes alguna pregunta sobre esta propiedad?"
                  rows={3}
                  disabled={state === 'submitting'}
                />
              </div>
            </div>
            <div className="portal-modal-footer">
              <button type="button" className="portal-contact-btn portal-contact-secondary" onClick={onClose} disabled={state === 'submitting'}>
                Cancelar
              </button>
              <button type="submit" className="portal-contact-btn portal-contact-primary" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Enviando…' : 'Registrar interés →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Detail Page ───────────────────────────────────────────────

export default function PortalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prop, setProp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/public/propiedades/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProp(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="portal-root" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  if (notFound || !prop) {
    return (
      <div className="portal-root" style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: '2rem', margin: 0 }}>🏚️</p>
        <p style={{ color: '#64748b' }}>Propiedad no encontrada o no disponible</p>
        <button className="btn btn-ghost" onClick={() => navigate('/portal')}>← Volver al portal</button>
      </div>
    );
  }

  const images = prop.imagenes ?? [];
  const coverSrc = images[activeImg]?.url
    ? (images[activeImg].url.startsWith('http') ? images[activeImg].url : `${API}${images[activeImg].url}`)
    : null;

  const location = [prop.zona, prop.municipio, prop.departamento].filter(Boolean).join(', ');

  return (
    <div className="portal-detail-root">
      {/* Header */}
      <header className="portal-header">
        <div className="portal-brand">
          <div className="portal-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          Maru Bienes y Raíces
        </div>
        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => navigate('/portal')}>
          ← Ver todas las propiedades
        </button>
      </header>

      {/* Body */}
      <div className="portal-detail-body">
        {/* Left: gallery + map */}
        <div className="portal-detail-gallery">
          <div className="portal-detail-main-img">
            {coverSrc
              ? <img src={coverSrc} alt={prop.titulo} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: '3rem' }}>🏠</div>
            }
          </div>

          {images.length > 1 && (
            <div className="portal-detail-thumbs">
              {images.map((img: any, i: number) => {
                const src = img.url.startsWith('http') ? img.url : `${API}${img.url}`;
                return (
                  <div
                    key={i}
                    className={`portal-detail-thumb${i === activeImg ? ' active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={src} alt="" />
                  </div>
                );
              })}
            </div>
          )}

          {prop.latitud && prop.longitud && (
            <PropertyMap lat={Number(prop.latitud)} lng={Number(prop.longitud)} />
          )}
        </div>

        {/* Right: info */}
        <div className="portal-detail-info">
          <div className="portal-detail-heading">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {TIPO_LABELS[prop.tipo] || prop.tipo}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>·</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{prop.codigo}</span>
            </div>
            <h1 className="portal-detail-title">{prop.titulo}</h1>
            {location && <div className="portal-detail-location">📍 {location}</div>}
            <div className="portal-detail-price">{fmtPrice(prop)}</div>
          </div>

          {/* Specs grid */}
          <div className="portal-detail-specs">
            {prop.habitaciones && (
              <div className="portal-spec-chip">
                <span className="portal-spec-label">Habitaciones</span>
                <span className="portal-spec-value">🛏 {prop.habitaciones}</span>
              </div>
            )}
            {prop.banos && (
              <div className="portal-spec-chip">
                <span className="portal-spec-label">Baños</span>
                <span className="portal-spec-value">🚿 {prop.banos}</span>
              </div>
            )}
            {prop.parqueos && (
              <div className="portal-spec-chip">
                <span className="portal-spec-label">Parqueos</span>
                <span className="portal-spec-value">🚗 {prop.parqueos}</span>
              </div>
            )}
            {prop.area_construccion_m2 && (
              <div className="portal-spec-chip">
                <span className="portal-spec-label">Construcción</span>
                <span className="portal-spec-value">{Number(prop.area_construccion_m2).toLocaleString('es-GT')} m²</span>
              </div>
            )}
            {prop.area_terreno_m2 && (
              <div className="portal-spec-chip">
                <span className="portal-spec-label">Terreno</span>
                <span className="portal-spec-value">{Number(prop.area_terreno_m2).toLocaleString('es-GT')} m²</span>
              </div>
            )}
            {prop.niveles && (
              <div className="portal-spec-chip">
                <span className="portal-spec-label">Niveles</span>
                <span className="portal-spec-value">🏢 {prop.niveles}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {prop.descripcion && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Descripción</p>
              <p className="portal-detail-desc">{prop.descripcion}</p>
            </div>
          )}

          {/* Contact / Registration */}
          <div className="portal-detail-contact">
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ¿Te interesa esta propiedad?
            </p>
            {prop.tenant?.nombre && (
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 12px' }}>
                {prop.tenant.nombre}
              </p>
            )}
            <button
              className="portal-contact-btn portal-contact-primary"
              onClick={() => setShowModal(true)}
            >
              ✉️ Registrar mi interés
            </button>
            <button
              className="portal-contact-btn portal-contact-secondary"
              onClick={() => navigate('/portal')}
            >
              ← Ver más propiedades
            </button>
          </div>
        </div>
      </div>

      {showModal && id && (
        <RegistroModal propiedadId={id} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
