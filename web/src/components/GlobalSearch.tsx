import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../lib/api';
import './GlobalSearch.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────

interface SearchResults {
  propiedades: PropResult[];
  clientes:    ClientResult[];
  pipeline:    PipelineResult[];
}

interface PropResult {
  id: string; codigo: string; titulo: string;
  tipo: string; estado: string; zona?: string; municipio?: string;
  imagenes: { url: string }[];
}

interface ClientResult {
  id: string; nombre: string; email?: string; telefono?: string; origen: string;
}

interface PipelineResult {
  id: string; estado: string;
  cliente: { id: string; nombre: string };
  propiedad: { id: string; codigo: string; titulo: string };
}

// ─── Flat item for keyboard navigation ────────────────────────

type FlatItem =
  | { kind: 'prop';     data: PropResult }
  | { kind: 'client';   data: ClientResult }
  | { kind: 'pipeline'; data: PipelineResult };

function flattenResults(r: SearchResults): FlatItem[] {
  return [
    ...r.propiedades.map((d) => ({ kind: 'prop'     as const, data: d })),
    ...r.clientes.map((d)    => ({ kind: 'client'   as const, data: d })),
    ...r.pipeline.map((d)    => ({ kind: 'pipeline' as const, data: d })),
  ];
}

// ─── Estado colors ─────────────────────────────────────────────

const ESTADO_PROP_COLOR: Record<string, string> = {
  DISPONIBLE: '#22c55e', RESERVADA: '#f59e0b', EN_NEGOCIACION: '#8b5cf6',
  VENDIDA: '#3b82f6', RENTADA: '#14b8a6', BORRADOR: '#64748b', SUSPENDIDA: '#ef4444',
};

const ESTADO_PIPE_COLOR: Record<string, string> = {
  NUEVO: '#64748b', CONTACTADO: '#3b82f6', INTERESADO: '#f59e0b',
  EN_NEGOCIACION: '#8b5cf6', GANADO: '#22c55e', PERDIDO: '#ef4444',
};

// ─── Command Palette ───────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

function CommandPalette({ open, onClose }: Props) {
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<SearchResults>({ propiedades: [], clientes: [], pipeline: [] });
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(0);

  const flat = flattenResults(results);
  const total = flat.length;
  const hasResults = total > 0;

  // Focus input when opened
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setQuery('');
        setResults({ propiedades: [], clientes: [], pipeline: [] });
        setCursor(0);
      });
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      queueMicrotask(() => { setResults({ propiedades: [], clientes: [], pipeline: [] }); });
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest<SearchResults>(
          `/api/search?q=${encodeURIComponent(query)}`,
          { token: accessToken! },
        );
        setResults(data);
        setCursor(0);
      } catch { /* noop */ }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, accessToken]);

  // Navigate to selected item
  const go = useCallback((item: FlatItem) => {
    onClose();
    if (item.kind === 'prop')     navigate(`/propiedades/${item.data.id}`);
    if (item.kind === 'client')   navigate(`/clientes/${item.data.id}`);
    if (item.kind === 'pipeline') navigate(`/pipeline`);
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, total - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        if (flat[cursor]) go(flat[cursor]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, flat, total, go, onClose]);

  if (!open) return null;

  // Scroll active item into view
  const itemRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el && i === cursor) el.scrollIntoView({ block: 'nearest' });
  };

  // Running index across sections for keyboard cursor
  let idx = 0;

  const renderPropIcon = (p: PropResult) => {
    const src = p.imagenes?.[0]?.url;
    if (src) {
      const url = src.startsWith('http') ? src : `${API_URL}${src}`;
      return <img src={url} alt="" />;
    }
    const icons: Record<string, string> = {
      CASA: '🏠', APARTAMENTO: '🏢', TERRENO: '🌿', LOCAL_COMERCIAL: '🏪',
      OFICINA: '💼', BODEGA: '🏭', FINCA: '🌾', EDIFICIO: '🏗️', OTRO: '📦',
    };
    return <span>{icons[p.tipo] || '🏠'}</span>;
  };

  return (
    <div className="gs-backdrop" onClick={onClose} role="presentation">
      <div
        className="gs-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda global"
      >

        {/* ── Input ── */}
        <div className="gs-input-row">
          <span className="gs-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            className="gs-input"
            placeholder="Buscar propiedades, clientes, trámites..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Buscar en el CRM"
            aria-autocomplete="list"
            aria-controls="gs-results-list"
            aria-expanded={hasResults}
          />
          <span className="gs-kbd" aria-label="Presiona Escape para cerrar">Esc</span>
        </div>

        {/* ── Results ── */}
        <div className="gs-results" id="gs-results-list" role="listbox" aria-label="Resultados de búsqueda" aria-live="polite">
          {loading && (
            <div className="gs-loading" role="status" aria-live="polite">
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" />
              Buscando...
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <div className="gs-empty">
              Sin resultados para <strong>"{query}"</strong>
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="gs-empty" style={{ padding: '28px 18px' }}>
              Escribe al menos 2 caracteres para buscar
            </div>
          )}

          {/* Propiedades */}
          {results.propiedades.length > 0 && (
            <>
              <div className="gs-section-label">Propiedades</div>
              {results.propiedades.map((p) => {
                const i = idx++;
                const loc = [p.zona, p.municipio].filter(Boolean).join(', ');
                const color = ESTADO_PROP_COLOR[p.estado] ?? '#64748b';
                return (
                  <div
                    key={p.id}
                    ref={itemRef(i)}
                    className={`gs-item${i === cursor ? ' active' : ''}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go({ kind: 'prop', data: p })}
                  >
                    <div className="gs-item-icon">{renderPropIcon(p)}</div>
                    <div className="gs-item-body">
                      <div className="gs-item-title">{p.codigo} — {p.titulo}</div>
                      {loc && <div className="gs-item-sub">{loc}</div>}
                    </div>
                    <span
                      className="gs-item-badge"
                      style={{ background: `${color}22`, color }}
                    >
                      {p.estado}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Clientes */}
          {results.clientes.length > 0 && (
            <>
              <div className="gs-section-label">Clientes</div>
              {results.clientes.map((c) => {
                const i = idx++;
                return (
                  <div
                    key={c.id}
                    ref={itemRef(i)}
                    className={`gs-item${i === cursor ? ' active' : ''}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go({ kind: 'client', data: c })}
                  >
                    <div className="gs-item-icon">
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-blue)' }}>
                        {c.nombre[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="gs-item-body">
                      <div className="gs-item-title">{c.nombre}</div>
                      <div className="gs-item-sub">
                        {[c.email, c.telefono].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="gs-item-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                      {c.origen}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {/* Pipeline */}
          {results.pipeline.length > 0 && (
            <>
              <div className="gs-section-label">Pipeline</div>
              {results.pipeline.map((p) => {
                const i = idx++;
                const color = ESTADO_PIPE_COLOR[p.estado] ?? '#64748b';
                return (
                  <div
                    key={p.id}
                    ref={itemRef(i)}
                    className={`gs-item${i === cursor ? ' active' : ''}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go({ kind: 'pipeline', data: p })}
                  >
                    <div className="gs-item-icon">
                      <span>📋</span>
                    </div>
                    <div className="gs-item-body">
                      <div className="gs-item-title">{p.cliente.nombre}</div>
                      <div className="gs-item-sub">{p.propiedad.codigo} — {p.propiedad.titulo}</div>
                    </div>
                    <span
                      className="gs-item-badge"
                      style={{ background: `${color}22`, color }}
                    >
                      {p.estado}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="gs-footer">
          <span className="gs-footer-hint">
            <span className="gs-kbd">↑↓</span> navegar
          </span>
          <span className="gs-footer-hint">
            <span className="gs-kbd">↵</span> abrir
          </span>
          <span className="gs-footer-hint">
            <span className="gs-kbd">Esc</span> cerrar
          </span>
          {hasResults && (
            <span style={{ marginLeft: 'auto' }}>
              {total} resultado{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Exported hook + trigger ───────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with the palette it controls
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}

export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return (
    <button className="gs-trigger" onClick={onClick} title="Búsqueda global (Ctrl+K)">
      <span>🔍</span>
      <span style={{ color: 'var(--text-muted)' }}>Buscar...</span>
      <span className="gs-trigger-kbd">{isMac ? '⌘' : 'Ctrl'}+K</span>
    </button>
  );
}

export default CommandPalette;
