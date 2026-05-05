import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import TimelineModal from './TimelineModal';
import '../Clients/Clients.css';

const COLUMNS = [
  { key: 'NUEVO', label: 'Nuevo', color: '#64748b' },
  { key: 'CONTACTADO', label: 'Contactado', color: '#3b82f6' },
  { key: 'INTERESADO', label: 'Interesado', color: '#f59e0b' },
  { key: 'EN_NEGOCIACION', label: 'En Negociación', color: '#8b5cf6' },
  { key: 'GANADO', label: 'Ganado', color: '#22c55e' },
  { key: 'PERDIDO', label: 'Perdido', color: '#ef4444' },
];

const NEXT_ESTADO: Record<string, string[]> = {
  NUEVO: ['CONTACTADO', 'PERDIDO'],
  CONTACTADO: ['INTERESADO', 'PERDIDO'],
  INTERESADO: ['EN_NEGOCIACION', 'PERDIDO'],
  EN_NEGOCIACION: ['GANADO', 'PERDIDO'],
  GANADO: [],
  PERDIDO: ['NUEVO'],
};

const NEXT_ESTADO_JUNIOR: Record<string, string[]> = {
  ...NEXT_ESTADO,
  EN_NEGOCIACION: ['PERDIDO'], // JUNIOR no puede cerrar como GANADO
};

// ─── Draggable Card ──────────────────────────────────────────

function DraggableCard({
  item, onMove, onTimeline, nextEstados,
}: {
  item: any;
  onMove: (id: string, estado: string) => void;
  onTimeline: (item: any) => void;
  nextEstados: Record<string, string[]>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const navigate = useNavigate();

  const next = nextEstados[item.estado] || [];

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.4 : 1, transition: isDragging ? 'none' : undefined }}
      className="pipeline-card"
    >
      <div
        className="pipeline-card-drag-handle"
        {...attributes}
        {...listeners}
        title="Arrastrar"
      >
        ⠿
      </div>
      <div className="pipeline-card-client" onClick={() => navigate(`/clientes/${item.cliente?.id}`)}>
        {item.cliente?.nombre}
      </div>
      <div className="pipeline-card-property" onClick={() => navigate(`/propiedades/${item.propiedad?.id}`)}>
        {item.propiedad?.codigo} — {item.propiedad?.titulo}
      </div>
      <div className="pipeline-card-footer">
        <span className={`pipeline-nivel pipeline-nivel-${item.nivel_interes}`}>
          {item.nivel_interes}
        </span>
        <div className="pipeline-card-actions">
          <button
            className="pipeline-timeline-btn"
            onClick={() => onTimeline(item)}
            title="Ver historial de interacciones"
          >
            📋{item._count?.interacciones > 0 && (
              <span className="pipeline-timeline-count">{item._count.interacciones}</span>
            )}
          </button>
          {next.map((est) => (
            <button key={est} onClick={() => onMove(item.id, est)}>
              → {est === 'EN_NEGOCIACION' ? 'Negociar' : est === 'PERDIDO' ? '✕' : est.charAt(0) + est.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      {item.estado === 'GANADO' && (item.precio_cierre || item.comision_calculada) && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
          {item.precio_cierre && (
            <div style={{ color: 'var(--text-muted)' }}>
              Precio: <strong>{item.propiedad?.moneda || 'GTQ'} {fmtNum(Number(item.precio_cierre))}</strong>
            </div>
          )}
          {item.comision_calculada && (
            <div style={{ color: '#22c55e' }}>
              Comisión: <strong>{item.propiedad?.moneda || 'GTQ'} {fmtNum(Number(item.comision_calculada))}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Card Overlay (shown while dragging) ─────────────────────

function CardOverlay({ item }: { item: any }) {
  return (
    <div className="pipeline-card pipeline-card-dragging" style={{ cursor: 'grabbing', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{item.cliente?.nombre}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        {item.propiedad?.codigo} — {item.propiedad?.titulo}
      </div>
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────

function DroppableColumn({
  col, items, isActive, isValid, onMove, onTimeline, nextEstados, isJuniorLocked,
}: {
  col: typeof COLUMNS[0];
  items: any[];
  isActive: boolean;
  isValid: boolean;
  onMove: (id: string, estado: string) => void;
  onTimeline: (item: any) => void;
  nextEstados: Record<string, string[]>;
  isJuniorLocked?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: col.key });

  const borderColor = isActive
    ? isOver
      ? isValid ? col.color : '#ef4444'
      : isValid ? `${col.color}44` : 'rgba(255,255,255,0.04)'
    : 'var(--border-subtle)';

  const bg = isOver && isValid ? `${col.color}18` : undefined;

  return (
    <div
      ref={setNodeRef}
      className="pipeline-column"
      style={{ border: `2px solid ${borderColor}`, borderRadius: 12, transition: 'border-color 0.15s, background 0.15s', background: bg }}
    >
      <div className="pipeline-col-header">
        <span className="pipeline-col-title" style={{ color: col.color }}>{col.label}</span>
        <span className="pipeline-col-count" style={{ background: col.color }}>{items.length}</span>
      </div>
      {isJuniorLocked && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 8px', textAlign: 'center', fontStyle: 'italic' }}>
          Solo supervisores pueden cerrar
        </div>
      )}
      <div className="pipeline-col-items">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onMove={onMove} onTimeline={onTimeline} nextEstados={nextEstados} />
        ))}
        {items.length === 0 && (
          <div className="pipeline-col-empty">
            {isActive && isValid ? 'Soltar aquí' : 'Sin items'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PERDIDO Modal ────────────────────────────────────────────

function PerdidoModal({
  onConfirm, onCancel,
}: {
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="pipeline-modal-overlay" onClick={onCancel}>
      <div className="pipeline-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Marcar como Perdido</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Indica el motivo de pérdida para el registro.
        </p>
        <textarea
          className="pipeline-modal-input"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Precio fuera de rango, cliente decidió no comprar..."
          autoFocus
        />
        <div className="pipeline-modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            style={{ background: '#ef4444', boxShadow: 'none' }}
            disabled={!motivo.trim()}
            onClick={() => { if (motivo.trim()) onConfirm(motivo); }}
          >
            Confirmar pérdida
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Number formatter ─────────────────────────────────────────

function fmtNum(n: number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─── GANADO Modal ─────────────────────────────────────────────

function GanadoModal({
  item, onConfirm, onCancel,
}: {
  item: any;
  onConfirm: (precioAcordado: number) => void;
  onCancel: () => void;
}) {
  const moneda = item.propiedad?.moneda || 'GTQ';
  const precioLista = item.propiedad?.gestion === 'RENTA'
    ? Number(item.propiedad?.precio_renta ?? 0)
    : Number(item.propiedad?.precio_venta ?? 0);
  const comisionPct = item.propiedad?.comision_porcentaje != null
    ? Number(item.propiedad.comision_porcentaje)
    : null;

  const [precio, setPrecio] = useState(precioLista > 0 ? String(precioLista) : '');
  const precioNum = parseFloat(precio) || 0;
  const comision = comisionPct != null && precioNum > 0
    ? Math.round(precioNum * (comisionPct / 100) * 100) / 100
    : null;

  return (
    <div className="pipeline-modal-overlay" onClick={onCancel}>
      <div className="pipeline-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Confirmar cierre del trámite</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {item.propiedad?.codigo} — {item.propiedad?.titulo}
        </p>
        <label style={{ display: 'block', fontSize: '0.8125rem', marginBottom: 4, color: 'var(--text-muted)' }}>
          Precio de cierre ({moneda})
        </label>
        <input
          type="number"
          className="pipeline-modal-input"
          style={{ height: 40, padding: '0 12px', resize: 'none' }}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          placeholder="Ej. 450000"
          autoFocus
          min={0}
        />
        {comisionPct != null && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8, fontSize: '0.875rem', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Comisión ({comisionPct}%): </span>
            <strong style={{ color: '#22c55e' }}>
              {comision != null ? `${moneda} ${fmtNum(comision)}` : '—'}
            </strong>
          </div>
        )}
        <div className="pipeline-modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            style={{ background: '#22c55e', boxShadow: 'none' }}
            disabled={precioNum <= 0}
            onClick={() => { if (precioNum > 0) onConfirm(precioNum); }}
          >
            Confirmar cierre ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function PipelinePage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const isJunior = user?.rol === 'JUNIOR';
  const nextEstados = isJunior ? NEXT_ESTADO_JUNIOR : NEXT_ESTADO;
  const [pipeline, setPipeline] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; target: string } | null>(null);
  const [pendingGanado, setPendingGanado] = useState<{ id: string; item: any } | null>(null);
  const [timelineItem, setTimelineItem] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const fetchPipeline = useCallback(async () => {
    try {
      const data = await apiRequest<Record<string, any[]>>('/api/pipeline', { token: accessToken! });
      setPipeline(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const doMove = useCallback(async (id: string, nuevoEstado: string, motivoPerdida?: string, precioAcordado?: number) => {
    // Optimistic update
    setPipeline((prev) => {
      const item = Object.values(prev).flat().find((i) => i.id === id);
      if (!item) return prev;
      const next = { ...prev };
      next[item.estado] = (next[item.estado] || []).filter((i) => i.id !== id);
      next[nuevoEstado] = [...(next[nuevoEstado] || []), { ...item, estado: nuevoEstado }];
      return next;
    });

    try {
      await apiRequest(`/api/pipeline/${id}/estado`, {
        method: 'PATCH',
        body: {
          nuevoEstado,
          ...(motivoPerdida ? { motivoPerdida } : {}),
          ...(precioAcordado != null ? { precioAcordado } : {}),
        },
        token: accessToken!,
      });
      // Refresh to get commission values from server
      if (nuevoEstado === 'GANADO') fetchPipeline();
    } catch (err: any) {
      fetchPipeline(); // rollback
      alert(err.message);
    }
  }, [accessToken, fetchPipeline]);

  const handleMove = (id: string, estado: string) => {
    if (estado === 'PERDIDO') {
      setPendingMove({ id, target: estado });
    } else if (estado === 'GANADO') {
      const item = Object.values(pipeline).flat().find((i) => i.id === id);
      setPendingGanado({ id, item });
    } else {
      doMove(id, estado);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current?.item ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || !activeItem) return;

    const targetCol = over.id as string;
    if (targetCol === activeItem.estado) return;

    const valid = nextEstados[activeItem.estado]?.includes(targetCol);
    if (!valid) return;

    handleMove(active.id as string, targetCol);
  };

  const validTargets = activeItem ? new Set(nextEstados[activeItem.estado] || []) : new Set<string>();

  if (loading) return (
    <div className="clients-loading"><div className="spinner" /><span>Cargando pipeline...</span></div>
  );

  return (
    <>
      <div className="pipeline-page">
        <div className="pipeline-header">
          <div>
            <h1>Pipeline de Ventas</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 2 }}>
              Arrastra las tarjetas entre columnas o usa los botones para avanzar
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/clientes')}>← Clientes</button>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="pipeline-board">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.key}
                col={col}
                items={pipeline[col.key] || []}
                isActive={!!activeItem}
                isValid={validTargets.has(col.key)}
                onMove={handleMove}
                onTimeline={setTimelineItem}
                nextEstados={nextEstados}
                isJuniorLocked={isJunior && col.key === 'GANADO'}
              />
            ))}
          </div>
          <DragOverlay>
            {activeItem ? <CardOverlay item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {pendingMove && (
        <PerdidoModal
          onConfirm={(motivo) => {
            doMove(pendingMove.id, pendingMove.target, motivo);
            setPendingMove(null);
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {pendingGanado && (
        <GanadoModal
          item={pendingGanado.item}
          onConfirm={(precio) => {
            doMove(pendingGanado.id, 'GANADO', undefined, precio);
            setPendingGanado(null);
          }}
          onCancel={() => setPendingGanado(null)}
        />
      )}

      {timelineItem && (
        <TimelineModal
          item={timelineItem}
          onClose={() => setTimelineItem(null)}
        />
      )}
    </>
  );
}
