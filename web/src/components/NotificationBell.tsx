import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../lib/api';
import './NotificationBell.css';

interface Notificacion {
  id: string;
  tipo: 'DOCUMENTO_POR_VENCER' | 'DOCUMENTO_VENCIDO' | 'SISTEMA' | 'MATCH_PROPIEDAD' | 'VISITA_AGENDADA' | 'LEAD_INACTIVO';
  titulo: string;
  mensaje: string;
  leida: boolean;
  entidad: string | null;
  entidad_id: string | null;
  created_at: string;
}

const TIPO_ICON: Record<string, string> = {
  DOCUMENTO_POR_VENCER: '⚠️',
  DOCUMENTO_VENCIDO: '🚨',
  SISTEMA: 'ℹ️',
  MATCH_PROPIEDAD: '🏠',
  VISITA_AGENDADA: '📅',
  LEAD_INACTIVO: '👤',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export default function NotificationBell() {
  const { accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await apiRequest<{ count: number }>('/api/notificaciones/unread-count', { token: accessToken });
      setUnread(data.count);
    } catch { /* silencioso */ }
  }, [accessToken]);

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ items: Notificacion[]; totalNoLeidas: number }>(
        '/api/notificaciones',
        { token: accessToken },
      );
      setItems(data.items);
      setUnread(data.totalNoLeidas);
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Poll unread count every 60 seconds
  useEffect(() => {
    queueMicrotask(() => { fetchCount(); });
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Load all when dropdown opens
  useEffect(() => {
    if (open) queueMicrotask(() => { fetchAll(); });
  }, [open, fetchAll]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    if (!accessToken) return;
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n));
    setUnread((c) => Math.max(0, c - 1));
    await apiRequest(`/api/notificaciones/${id}/leer`, { method: 'PATCH', token: accessToken });
  };

  const handleMarkAllRead = async () => {
    if (!accessToken) return;
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
    setUnread(0);
    await apiRequest('/api/notificaciones/leer-todas', { method: 'PATCH', token: accessToken });
  };

  return (
    <div className="notif-bell-wrap" ref={dropdownRef}>
      <button
        className={`notif-bell-btn ${open ? 'notif-bell-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unread > 0 ? ` — ${unread} sin leer` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        title="Notificaciones"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div
          className="notif-dropdown"
          role="dialog"
          aria-label="Notificaciones"
          aria-modal="false"
        >
          <div className="notif-header">
            <span className="notif-title" id="notif-heading">Notificaciones</span>
            {unread > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                Marcar todas leídas
              </button>
            )}
          </div>

          <div
            className="notif-list"
            role="list"
            aria-live="polite"
            aria-atomic="false"
            aria-labelledby="notif-heading"
          >
            {loading ? (
              <div className="notif-empty" role="status">Cargando...</div>
            ) : items.length === 0 ? (
              <div className="notif-empty" role="status">Sin notificaciones</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  role="listitem"
                  className={`notif-item ${n.leida ? 'notif-item-read' : 'notif-item-unread'}`}
                  onClick={() => !n.leida && handleMarkRead(n.id)}
                  aria-label={`${n.titulo}${n.leida ? '' : ' — sin leer'}`}
                >
                  <span className="notif-item-icon" aria-hidden="true">{TIPO_ICON[n.tipo] ?? 'ℹ️'}</span>
                  <div className="notif-item-body">
                    <span className="notif-item-titulo">{n.titulo}</span>
                    <span className="notif-item-mensaje">{n.mensaje}</span>
                    <span className="notif-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.leida && <span className="notif-dot" aria-hidden="true" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
