import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Portal.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const GT_CENTER: [number, number] = [-90.5069, 14.6349]; // Guatemala City

// ─── Helpers ──────────────────────────────────────────────────

function fmtPrice(prop: any): string {
  const moneda = prop.moneda || 'GTQ';
  const precio = prop.gestion === 'RENTA'
    ? prop.precio_renta
    : prop.precio_venta ?? prop.precio_renta;
  if (!precio) return '—';
  const n = Number(precio);
  if (n >= 1_000_000) return `${moneda} ${(n / 1_000_000).toFixed(2)} M`;
  if (n >= 1_000)     return `${moneda} ${(n / 1_000).toFixed(0)} K`;
  return `${moneda} ${n.toLocaleString('es-GT')}`;
}

function gestBadgeClass(g: string) {
  if (g === 'VENTA') return 'portal-badge portal-badge-venta';
  if (g === 'RENTA') return 'portal-badge portal-badge-renta';
  return 'portal-badge portal-badge-ambas';
}

// ─── Property Card ─────────────────────────────────────────────

function PropertyCard({ prop, active, onClick }: {
  prop: any;
  active: boolean;
  onClick: () => void;
}) {
  const thumb = prop.imagenes?.[0]?.url;
  return (
    <div className={`portal-card${active ? ' active' : ''}`} onClick={onClick}>
      <div className="portal-card-thumb">
        {thumb
          ? <img src={thumb.startsWith('http') ? thumb : `${API}${thumb}`} alt={prop.titulo} loading="lazy" />
          : <div className="portal-card-no-img">🏠</div>
        }
      </div>
      <div className="portal-card-body">
        <div className="portal-card-title">{prop.titulo}</div>
        <div className="portal-card-location">
          {[prop.zona, prop.municipio, prop.departamento].filter(Boolean).join(', ') || 'Ubicación no especificada'}
        </div>
        <div className="portal-card-price">{fmtPrice(prop)}</div>
        <div className="portal-card-badges">
          <span className={gestBadgeClass(prop.gestion)}>{prop.gestion}</span>
          {prop.habitaciones && (
            <span className="portal-badge portal-badge-hab">🛏 {prop.habitaciones}</span>
          )}
          {prop.banos && (
            <span className="portal-badge portal-badge-hab">🚿 {prop.banos}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Map ───────────────────────────────────────────────────────

function MapboxMap({ properties, activeId, onSelect }: {
  properties: any[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Lazy-load mapbox-gl to avoid SSR issues and keep initial bundle lean
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    let cancelled = false;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled || mapRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: GT_CENTER,
        zoom: 10,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        map.addSource('props', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'props-circle',
          type: 'circle',
          source: 'props',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 7, 14, 13],
            'circle-color': [
              'case',
              ['==', ['get', 'gestion'], 'VENTA'], '#3b82f6',
              ['==', ['get', 'gestion'], 'RENTA'], '#22c55e',
              '#8b5cf6',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': [
              'case',
              ['boolean', ['feature-state', 'active'], false], '#fbbf24',
              '#fff',
            ],
            'circle-opacity': 0.9,
          },
        });

        map.on('click', 'props-circle', (e: any) => {
          const f = e.features?.[0];
          if (!f) return;
          const props = f.properties;
          const coords: [number, number] = [props.lng, props.lat];

          if (popupRef.current) popupRef.current.remove();

          const thumb = props.thumb
            ? `<div class="portal-popup-thumb"><img src="${props.thumb.startsWith('http') ? props.thumb : API + props.thumb}" /></div>`
            : '';

          const popup = new mapboxgl.Popup({ offset: 16, maxWidth: '240px' })
            .setLngLat(coords)
            .setHTML(`
              <div class="portal-popup">
                ${thumb}
                <p class="portal-popup-title">${props.titulo}</p>
                <p class="portal-popup-location">${props.location || ''}</p>
                <p class="portal-popup-price">${props.price}</p>
                <a class="portal-popup-btn" href="/portal/${props.id}">Ver detalle →</a>
              </div>
            `)
            .addTo(map);

          popupRef.current = popup;
          onSelect(props.id);
        });

        map.on('mouseenter', 'props-circle', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'props-circle', () => {
          map.getCanvas().style.cursor = '';
        });

        mapRef.current = map;
        if (!cancelled) setReady(true);
      });
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // Update GeoJSON data when properties change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const source = mapRef.current.getSource('props');
    if (!source) return;

    const features = properties
      .filter((p) => p.latitud && p.longitud)
      .map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        geometry: { type: 'Point' as const, coordinates: [Number(p.longitud), Number(p.latitud)] },
        properties: {
          id: p.id,
          titulo: p.titulo,
          gestion: p.gestion,
          price: fmtPrice(p),
          location: [p.zona, p.municipio].filter(Boolean).join(', '),
          thumb: p.imagenes?.[0]?.url || '',
          lat: Number(p.latitud),
          lng: Number(p.longitud),
        },
      }));

    source.setData({ type: 'FeatureCollection', features });

    // Fit bounds when we have geo data
    if (features.length > 0) {
      const lngs = features.map((f) => f.geometry.coordinates[0]);
      const lats = features.map((f) => f.geometry.coordinates[1]);
      mapRef.current.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 14, duration: 600 },
      );
    }
  }, [properties, ready]);

  // Highlight active feature
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    // Reset all feature states first
    properties.forEach((p) => {
      try {
        mapRef.current.setFeatureState({ source: 'props', id: p.id }, { active: false });
      } catch { /* feature may not exist in map */ }
    });
    if (activeId) {
      try {
        mapRef.current.setFeatureState({ source: 'props', id: activeId }, { active: true });
        const active = properties.find((p) => p.id === activeId);
        if (active?.latitud && active?.longitud) {
          mapRef.current.easeTo({
            center: [Number(active.longitud), Number(active.latitud)],
            zoom: Math.max(mapRef.current.getZoom(), 13),
            duration: 400,
          });
        }
      } catch { /* ignore */ }
    }
  }, [activeId, properties, ready]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="portal-map-placeholder">
        <span style={{ fontSize: '2rem' }}>🗺️</span>
        <span>Mapa no disponible</span>
        <p>VITE_MAPBOX_TOKEN</p>
      </div>
    );
  }

  return <div ref={containerRef} className="portal-map" />;
}

// ─── Main Page ─────────────────────────────────────────────────

export default function PortalPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    busqueda: '', tipo: '', gestion: '', precioMax: '',
  });
  const [meta, setMeta] = useState({ total: 0 });

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filters.busqueda) params.set('busqueda', filters.busqueda);
      if (filters.tipo)     params.set('tipo', filters.tipo);
      if (filters.gestion)  params.set('gestion', filters.gestion);
      if (filters.precioMax) params.set('precioMax', filters.precioMax);

      const res = await fetch(`${API}/api/public/propiedades?${params}`);
      if (!res.ok) throw new Error('Error al cargar propiedades');
      const json = await res.json();
      setProperties(json.data ?? []);
      setMeta(json.meta ?? { total: 0 });
    } catch { }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="portal-root">
      {/* ── Header ── */}
      <header className="portal-header">
        <div className="portal-brand">
          <div className="portal-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          GestPro
        </div>
        <div className="portal-header-actions">
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem', padding: '6px 14px' }}
            onClick={() => navigate('/dashboard')}
          >
            CRM →
          </button>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="portal-filters">
        <div className="portal-search">
          <span className="portal-search-icon">🔍</span>
          <input
            className="portal-input"
            placeholder="Buscar por zona, colonia, código..."
            value={filters.busqueda}
            onChange={(e) => setFilter('busqueda', e.target.value)}
          />
        </div>
        <select className="portal-select" value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value)}>
          <option value="">Tipo</option>
          <option value="CASA">Casa</option>
          <option value="APARTAMENTO">Apartamento</option>
          <option value="TERRENO">Terreno</option>
          <option value="LOCAL_COMERCIAL">Local comercial</option>
          <option value="OFICINA">Oficina</option>
          <option value="BODEGA">Bodega</option>
          <option value="FINCA">Finca</option>
          <option value="EDIFICIO">Edificio</option>
        </select>
        <select className="portal-select" value={filters.gestion} onChange={(e) => setFilter('gestion', e.target.value)}>
          <option value="">Gestión</option>
          <option value="VENTA">Venta</option>
          <option value="RENTA">Renta</option>
          <option value="AMBAS">Venta o renta</option>
        </select>
        <select className="portal-select" value={filters.precioMax} onChange={(e) => setFilter('precioMax', e.target.value)}>
          <option value="">Precio máximo</option>
          <option value="500000">GTQ 500,000</option>
          <option value="1000000">GTQ 1,000,000</option>
          <option value="2000000">GTQ 2,000,000</option>
          <option value="5000000">GTQ 5,000,000</option>
        </select>
        <span className="portal-filter-count">
          {loading ? '...' : `${meta.total} propiedades`}
        </span>
      </div>

      {/* ── Body: list + map ── */}
      <div className="portal-body">
        {/* Property list */}
        <div className="portal-list">
          {loading ? (
            <div className="portal-loading">
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              <span>Buscando propiedades...</span>
            </div>
          ) : properties.length === 0 ? (
            <div className="portal-list-empty">
              <p style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>🏚️</p>
              <p style={{ margin: 0 }}>No se encontraron propiedades con esos filtros</p>
            </div>
          ) : (
            properties.map((p) => (
              <PropertyCard
                key={p.id}
                prop={p}
                active={p.id === activeId}
                onClick={() => {
                  setActiveId(p.id);
                  navigate(`/portal/${p.id}`);
                }}
              />
            ))
          )}
        </div>

        {/* Map */}
        <div className="portal-map-container">
          <MapboxMap
            properties={properties}
            activeId={activeId}
            onSelect={(id) => setActiveId(id)}
          />
        </div>
      </div>
    </div>
  );
}
