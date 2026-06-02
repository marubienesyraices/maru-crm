'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────

interface Visita {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  zoom_join_url: string | null;
  ubicacion: string | null;
}

interface PropiedadResumen {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  gestion: string;
  precio_venta: string | null;
  precio_renta: string | null;
  moneda: string;
  estado: string;
  zona: string | null;
  municipio: string | null;
  departamento: string | null;
  imagenes: { url: string }[];
}

interface Interes {
  id: string;
  estado: string;
  nivel_interes: string;
  notas: string | null;
  fecha_contacto: string | null;
  fecha_cierre: string | null;
  precio_cierre: string | null;
  created_at: string;
  propiedad: PropiedadResumen;
  visitas: Visita[];
}

interface Favorito {
  id: string;
  created_at: string;
  propiedad: PropiedadResumen;
}

interface ClienteData {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  gestion_interes: string | null;
  zona_interes: string | null;
  presupuesto_max: string | null;
  tipo_interes: string | null;
  created_at: string;
  intereses: Interes[];
  favoritos: Favorito[];
}

// ─── Helpers ──────────────────────────────────────────────────

const ESTADO_LABELS: Record<string, string> = {
  NUEVO: 'Nuevo', CONTACTADO: 'Contactado', INTERESADO: 'Interesado',
  EN_NEGOCIACION: 'En negociación', CIERRE: 'En cierre',
  GANADO: 'Cerrado ✓', PERDIDO: 'Cancelado',
};
const ESTADO_COLORS: Record<string, string> = {
  NUEVO: '#6b7280', CONTACTADO: '#3b82f6', INTERESADO: '#8b5cf6',
  EN_NEGOCIACION: '#f59e0b', CIERRE: '#ec4899',
  GANADO: '#22c55e', PERDIDO: '#ef4444',
};
const PROP_ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador', DISPONIBLE: 'Disponible', RESERVADA: 'Reservada',
  EN_NEGOCIACION: 'En negociación', VENDIDA: 'Vendida', RENTADA: 'Rentada', SUSPENDIDA: 'Suspendida',
};

function fmtPrecio(v: string | null, moneda = 'GTQ') {
  if (!v) return '—';
  const n = Number(v);
  if (n >= 1_000_000) return `${moneda} ${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000)     return `${moneda} ${(n / 1_000).toFixed(0)} K`;
  return `${moneda} ${n.toLocaleString('es-GT')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-GT', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Google OAuth helper ──────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// ─── Login form ───────────────────────────────────────────────

function LoginForm({ tenantId, onSuccess }: { tenantId?: string; onSuccess: (token: string, nombre: string) => void }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/public/cliente/solicitar-acceso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tenantId }),
      });
      if (!res.ok) throw new Error('Error al enviar el enlace.');
      setSent(true);
    } catch {
      setError('No se pudo enviar el enlace. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In credential callback
  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/public/cliente/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, tenantId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Error al autenticar con Google'); }
      const data = await res.json();
      localStorage.setItem('cliente_token', data.token);
      localStorage.setItem('cliente_nombre', data.nombre);
      onSuccess(data.token, data.nombre);
    } catch (err: any) {
      setError(err.message ?? 'Error al autenticar con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Expose callback globally for Google GSI script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    (window as any).__mcGoogleCallback = (response: { credential: string }) => {
      handleGoogleCredential(response.credential);
    };
    return () => { delete (window as any).__mcGoogleCallback; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  if (sent) {
    return (
      <div className="mc-card mc-card-center">
        <div className="mc-sent-icon">📧</div>
        <h2 className="mc-title">Revisa tu correo</h2>
        <p className="mc-subtitle">
          Si tu correo está registrado recibirás un enlace de acceso en los próximos minutos.
          El enlace expira en 15 minutos.
        </p>
        <button className="mc-btn mc-btn-ghost" onClick={() => setSent(false)}>
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <div className="mc-card mc-card-center">
      <div className="mc-login-icon">🏠</div>
      <h2 className="mc-title">Mi cuenta</h2>
      <p className="mc-subtitle">
        Ingresa tu correo y te enviaremos un enlace de acceso instantáneo.
      </p>

      {/* F-12: Google Sign-In button (shown only if NEXT_PUBLIC_GOOGLE_CLIENT_ID is set) */}
      {GOOGLE_CLIENT_ID && (
        <>
          <div
            id="g_id_onload"
            data-client_id={GOOGLE_CLIENT_ID}
            data-context="signin"
            data-ux_mode="popup"
            data-callback="__mcGoogleCallback"
            data-auto_prompt="false"
          />
          <div
            className="g_id_signin"
            data-type="standard"
            data-shape="rectangular"
            data-theme="outline"
            data-text="signin_with"
            data-size="large"
            data-locale="es"
            style={{ marginBottom: 12 }}
          />
          <div className="mc-divider" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 12px', color: '#94a3b8', fontSize: '0.8rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span>o usa tu correo</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>
          {googleLoading && <p className="mc-hint">Autenticando con Google…</p>}
        </>
      )}

      <form className="mc-form" onSubmit={submit}>
        <input
          className="mc-input"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus={!GOOGLE_CLIENT_ID}
        />
        {error && <p className="mc-error">{error}</p>}
        <button className="mc-btn mc-btn-primary" type="submit" disabled={loading || googleLoading}>
          {loading ? 'Enviando…' : 'Enviar enlace de acceso'}
        </button>
      </form>
      <p className="mc-hint">
        ¿Primera vez aquí? Regístrate en cualquier propiedad de nuestro catálogo.
      </p>
    </div>
  );
}

// ─── Property card ────────────────────────────────────────────

function InteresCard({ item }: { item: Interes }) {
  const p = item.propiedad;
  const thumb = p.imagenes[0]?.url;
  const precio = p.gestion === 'RENTA' ? p.precio_renta : (p.precio_venta ?? p.precio_renta);
  const proxVisita = item.visitas[0];

  return (
    <div className="mc-prop-card">
      <div className="mc-prop-thumb">
        {thumb
          ? <img src={thumb.startsWith('http') ? thumb : `${API}${thumb}`} alt={p.titulo} loading="lazy" />
          : <div className="mc-prop-no-img">🏠</div>
        }
        <span
          className="mc-prop-estado-badge"
          style={{ background: ESTADO_COLORS[item.estado] ?? '#6b7280' }}
        >
          {ESTADO_LABELS[item.estado] ?? item.estado}
        </span>
      </div>
      <div className="mc-prop-body">
        <div className="mc-prop-codigo">{p.codigo}</div>
        <div className="mc-prop-titulo">{p.titulo}</div>
        <div className="mc-prop-ubicacion">
          {[p.zona, p.municipio, p.departamento].filter(Boolean).join(', ') || 'Ubicación no especificada'}
        </div>
        <div className="mc-prop-precio">{fmtPrecio(precio, p.moneda)}</div>

        {/* Estado de la propiedad */}
        <div className="mc-prop-meta">
          <span className="mc-prop-meta-item">
            Propiedad: <strong>{PROP_ESTADO_LABELS[p.estado] ?? p.estado}</strong>
          </span>
          <span className="mc-prop-meta-item">
            Desde: <strong>{fmtDate(item.created_at)}</strong>
          </span>
        </div>

        {/* Próxima visita */}
        {proxVisita && (
          <div className="mc-visita-chip">
            <span>📅</span>
            <span>{fmtDateTime(proxVisita.fecha_inicio)}</span>
            {proxVisita.zoom_join_url && (
              <a href={proxVisita.zoom_join_url} target="_blank" rel="noreferrer" className="mc-zoom-btn">
                🎥 Zoom
              </a>
            )}
          </div>
        )}

        {/* Precio de cierre si aplica */}
        {item.precio_cierre && (
          <div className="mc-cierre-info">
            Precio de cierre: <strong>{fmtPrecio(item.precio_cierre, p.moneda)}</strong>
            {item.fecha_cierre && <span> · {fmtDate(item.fecha_cierre)}</span>}
          </div>
        )}

        <a href={`/propiedades/${p.id}`} className="mc-prop-link">
          Ver propiedad →
        </a>
      </div>
    </div>
  );
}

// ─── Favorito card ────────────────────────────────────────────

function FavoritoCard({ item, onRemove }: { item: Favorito; onRemove: (id: string) => void }) {
  const p = item.propiedad;
  const thumb = p.imagenes[0]?.url;
  const precio = p.gestion === 'RENTA' ? p.precio_renta : (p.precio_venta ?? p.precio_renta);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    const token = localStorage.getItem('cliente_token');
    try {
      await fetch(`${API}/api/public/cliente/favoritos/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onRemove(item.id);
    } catch {
      setRemoving(false);
    }
  };

  return (
    <div className="mc-prop-card">
      <div className="mc-prop-thumb">
        {thumb
          ? <img src={thumb.startsWith('http') ? thumb : `${API}${thumb}`} alt={p.titulo} loading="lazy" />
          : <div className="mc-prop-no-img">🏠</div>
        }
        <button
          className="mc-fav-remove-btn"
          onClick={handleRemove}
          disabled={removing}
          title="Quitar de favoritos"
        >
          ♥
        </button>
      </div>
      <div className="mc-prop-body">
        <div className="mc-prop-codigo">{p.codigo}</div>
        <div className="mc-prop-titulo">{p.titulo}</div>
        <div className="mc-prop-ubicacion">
          {[p.zona, p.municipio, p.departamento].filter(Boolean).join(', ') || 'Ubicación no especificada'}
        </div>
        <div className="mc-prop-precio">{fmtPrecio(precio, p.moneda)}</div>
        <a href={`/propiedades/${p.id}`} className="mc-prop-link">
          Ver propiedad →
        </a>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────

// §10 CA-2: Saved searches panel
function BusquedasGuardadasPanel({ clienteData }: { clienteData: any }) {
  const busquedas: Array<{ id: string; nombre: string; filtros: Record<string, unknown>; alertas: boolean; created_at: string }> =
    clienteData.busquedas_guardadas ?? [];
  const [lista, setLista] = useState(busquedas);

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('cliente_token');
    await fetch(`${API}/api/public/cliente/busquedas/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setLista((prev) => prev.filter((b) => b.id !== id));
  };

  if (!lista.length) return null;
  return (
    <section className="mc-section">
      <h2 className="mc-section-title">🔍 Mis búsquedas guardadas</h2>
      <div className="mc-busquedas-list">
        {lista.map((b) => (
          <div key={b.id} className="mc-busqueda-item">
            <div className="mc-busqueda-nombre">{b.nombre}</div>
            <div className="mc-busqueda-meta">
              {b.alertas && <span className="mc-busqueda-alerta">🔔 Con alertas</span>}
            </div>
            <button className="mc-busqueda-delete" onClick={() => handleDelete(b.id)} title="Eliminar búsqueda">✕</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ cliente, onLogout }: { cliente: ClienteData; onLogout: () => void }) {
  const activos  = cliente.intereses.filter((i) => !['GANADO', 'PERDIDO'].includes(i.estado));
  const cerrados = cliente.intereses.filter((i) =>  ['GANADO', 'PERDIDO'].includes(i.estado));
  const [favoritos, setFavoritos] = useState<Favorito[]>(cliente.favoritos ?? []);

  const removeFavorito = (id: string) => setFavoritos((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="mc-dashboard">
      {/* Header */}
      <div className="mc-dash-header">
        <div className="mc-dash-avatar">{cliente.nombre[0]?.toUpperCase()}</div>
        <div className="mc-dash-info">
          <h1 className="mc-dash-nombre">Hola, {cliente.nombre}</h1>
          <p className="mc-dash-email">{cliente.email}</p>
        </div>
        <button className="mc-btn mc-btn-ghost mc-logout-btn" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>

      {/* Stats */}
      <div className="mc-stats">
        <div className="mc-stat">
          <div className="mc-stat-num">{cliente.intereses.length}</div>
          <div className="mc-stat-lbl">Propiedades</div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-num">{activos.length}</div>
          <div className="mc-stat-lbl">En proceso</div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-num">
            {cliente.intereses.reduce((n, i) => n + i.visitas.length, 0)}
          </div>
          <div className="mc-stat-lbl">Próx. visitas</div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-num">{favoritos.length}</div>
          <div className="mc-stat-lbl">Favoritos</div>
        </div>
      </div>

      {/* Active interests */}
      {activos.length > 0 && (
        <section className="mc-section">
          <h2 className="mc-section-title">Propiedades en proceso</h2>
          <div className="mc-prop-grid">
            {activos.map((i) => <InteresCard key={i.id} item={i} />)}
          </div>
        </section>
      )}

      {/* Saved searches */}
      <BusquedasGuardadasPanel clienteData={cliente} />

      {/* Favorites */}
      {favoritos.length > 0 && (
        <section className="mc-section">
          <h2 className="mc-section-title">♥ Mis favoritos</h2>
          <div className="mc-prop-grid">
            {favoritos.map((f) => <FavoritoCard key={f.id} item={f} onRemove={removeFavorito} />)}
          </div>
        </section>
      )}

      {/* Closed */}
      {cerrados.length > 0 && (
        <section className="mc-section">
          <h2 className="mc-section-title">Historial</h2>
          <div className="mc-prop-grid">
            {cerrados.map((i) => <InteresCard key={i.id} item={i} />)}
          </div>
        </section>
      )}

      {cliente.intereses.length === 0 && favoritos.length === 0 && (
        <div className="mc-empty">
          <div style={{ fontSize: '3rem' }}>🏡</div>
          <h3>Sin propiedades registradas aún</h3>
          <p>Explora nuestro catálogo y registra tu interés en las propiedades que te gusten.</p>
          <a href="/" className="mc-btn mc-btn-primary">Ver propiedades</a>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function MiCuentaClient({ tenantId }: { tenantId?: string }) {
  const [state, setState]   = useState<'loading' | 'login' | 'dashboard'>('loading');
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [error, setError]   = useState('');

  const loadDashboard = useCallback(async (token: string) => {
    const res = await fetch(`${API}/api/public/cliente/mi-cuenta`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { localStorage.removeItem('cliente_token'); setState('login'); return; }
    if (!res.ok) throw new Error('Error al cargar tu cuenta.');
    const data: ClienteData = await res.json();
    setCliente(data);
    setState('dashboard');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('cliente_token');
    if (!token) { setState('login'); return; }
    loadDashboard(token).catch((e: Error) => { setError(e.message); setState('login'); });
  }, [loadDashboard]);

  // Load Google GSI script once if client ID is configured
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || document.getElementById('google-gsi')) return;
    const script = document.createElement('script');
    script.id = 'google-gsi';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleGoogleSuccess = useCallback((token: string) => {
    loadDashboard(token).catch((e: Error) => setError(e.message));
  }, [loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('cliente_nombre');
    setCliente(null);
    setState('login');
  };

  if (state === 'loading') {
    return (
      <div className="mc-loading">
        <div className="mc-spinner" />
        <span>Cargando…</span>
      </div>
    );
  }

  if (state === 'login') {
    return (
      <div className="mc-page">
        {error && <p className="mc-error mc-error-top">{error}</p>}
        <LoginForm tenantId={tenantId} onSuccess={handleGoogleSuccess} />
      </div>
    );
  }

  return (
    <div className="mc-page">
      {cliente && <Dashboard cliente={cliente} onLogout={handleLogout} />}
    </div>
  );
}
