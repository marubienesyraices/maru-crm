import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePipeline, useMovePipeline } from '../../hooks/usePipeline';
import type { PipelineItem } from '../../hooks/usePipeline';
import { useToast } from '../../components/Toast';
import Modal from '../../components/Modal';
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
  { key: 'CIERRE', label: 'Cierre', color: '#ec4899' },
  { key: 'GANADO', label: 'Ganado', color: '#22c55e' },
  { key: 'PERDIDO', label: 'Perdido', color: '#ef4444' },
];

const NEXT_ESTADO: Record<string, string[]> = {
  NUEVO: ['CONTACTADO', 'PERDIDO'],
  CONTACTADO: ['INTERESADO', 'PERDIDO'],
  INTERESADO: ['EN_NEGOCIACION', 'PERDIDO'],
  EN_NEGOCIACION: ['CIERRE', 'PERDIDO'],
  CIERRE: ['GANADO', 'PERDIDO'],
  GANADO: [],
  PERDIDO: ['NUEVO'],
};

const NEXT_ESTADO_JUNIOR: Record<string, string[]> = {
  ...NEXT_ESTADO,
  CIERRE: ['PERDIDO'], // JUNIOR no puede finalizar como GANADO
};

// ─── Draggable Card ──────────────────────────────────────────

function DraggableCard({
  item, onMove, onTimeline, nextEstados,
}: {
  item: PipelineItem;
  onMove: (id: string, estado: string) => void;
  onTimeline: (item: PipelineItem) => void;
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
            📋{!!item._count?.interacciones && item._count.interacciones > 0 && (
              <span className="pipeline-timeline-count">{item._count.interacciones}</span>
            )}
          </button>
          {next.map((est) => (
            <button key={est} onClick={() => onMove(item.id, est)}>
              → {est === 'EN_NEGOCIACION' ? 'Negociar' : est === 'CIERRE' ? 'Cierre' : est === 'GANADO' ? 'Ganado' : est === 'PERDIDO' ? '✕' : est.charAt(0) + est.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      {item.estado === 'GANADO' && (item.precio_cierre || item.comision_calculada) && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
          {item.precio_cierre && (
            <div style={{ color: 'var(--text-muted)' }}>
              {item.tipo_operacion_cierre ? `[${item.tipo_operacion_cierre}] ` : ''}
              Precio: <strong>{item.propiedad?.moneda || 'GTQ'} {fmtNum(Number(item.precio_cierre))}</strong>
            </div>
          )}
          {item.duracion_contrato_meses && (
            <div style={{ color: 'var(--text-muted)' }}>
              Contrato: <strong>{item.duracion_contrato_meses} meses</strong>
            </div>
          )}
          {item.comision_calculada && (
            <div style={{ color: '#22c55e' }}>
              Comisión: <strong>{item.propiedad?.moneda || 'GTQ'} {fmtNum(Number(item.comision_calculada))}</strong>
              {item.comision_sugerida_venta && item.comision_sugerida_renta && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(acordada)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Card Overlay (shown while dragging) ─────────────────────

function CardOverlay({ item }: { item: PipelineItem }) {
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
  items: PipelineItem[];
  isActive: boolean;
  isValid: boolean;
  onMove: (id: string, estado: string) => void;
  onTimeline: (item: PipelineItem) => void;
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

function PerdidoModal({ onConfirm, onCancel }: { onConfirm: (motivo: string) => void; onCancel: () => void }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Modal isOpen onClose={onCancel} title="Marcar como Perdido" width={440}>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Indica el motivo de pérdida para el registro.
      </p>
      <textarea
        className="input-field"
        style={{ width: '100%', minHeight: 96, resize: 'vertical' }}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej. Precio fuera de rango, cliente decidió no comprar..."
        autoFocus
      />
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-danger" disabled={!motivo.trim()} onClick={() => { if (motivo.trim()) onConfirm(motivo); }}>
          Confirmar pérdida
        </button>
      </div>
    </Modal>
  );
}

// ─── Number formatter ─────────────────────────────────────────

function fmtNum(n: number) {
  return new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ─── CIERRE Modal (F-16) ──────────────────────────────────────

function CierreModal({ onConfirm, onCancel }: { onConfirm: (docs: string[]) => void; onCancel: () => void }) {
  const [lines, setLines] = useState('');
  const docs = lines.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <Modal isOpen onClose={onCancel} title="Documentos de cierre requeridos" width={480}>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
        Para pasar a estado <strong>Cierre</strong>, debes registrar al menos un documento de soporte.
        Escribe el nombre o descripción de cada documento (uno por línea).
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Ejemplos: Promesa de compraventa firmada, Comprobante de pago señal, Contrato de arrendamiento...
      </p>
      <textarea
        className="input-field"
        style={{ width: '100%', minHeight: 110, resize: 'vertical' }}
        value={lines}
        onChange={(e) => setLines(e.target.value)}
        placeholder={'Promesa de compraventa firmada\nComprobante de pago Q 50,000\nDPI del comprador adjunto'}
        autoFocus
      />
      {docs.length > 0 && (
        <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {docs.length} documento(s) registrado(s)
        </div>
      )}
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button
          className="btn btn-primary"
          disabled={docs.length === 0}
          onClick={() => { if (docs.length > 0) onConfirm(docs); }}
        >
          Pasar a Cierre →
        </button>
      </div>
    </Modal>
  );
}

// ─── Helpers comisiones CBR (mirror del backend) ──────────────

function comisionRentaCBR(rentaMensual: number, meses: number): number {
  if (meses <= 1)  return round2(rentaMensual * meses * 0.10);
  if (meses < 12)  return round2(rentaMensual * (meses / 12));
  const años = meses / 12;
  if (años <= 5)   return round2(rentaMensual);
  return round2(rentaMensual * Math.ceil(años / 5));
}
function round2(n: number) { return Math.round(n * 100) / 100; }

function labelCBR(meses: number): string {
  if (meses <= 1)  return `10% del monto total (≤1 mes)`;
  if (meses < 12)  return `Proporcional: ${(meses / 12).toFixed(2)} rentas (CBR)`;
  const años = meses / 12;
  if (años <= 5)   return `1 mes de renta — contrato ${meses}m (CBR)`;
  return `${Math.ceil(años / 5)} renta(s) — 1 por cada 5 años (CBR)`;
}

// ─── GANADO Modal ─────────────────────────────────────────────

function GanadoModal({ item, onConfirm, onCancel }: {
  item: PipelineItem;
  onConfirm: (args: { precioAcordado: number; tipoOperacionCierre?: string; duracionContratoMeses?: number; comisionAcordada?: number }) => void;
  onCancel: () => void;
}) {
  const moneda = item.propiedad?.moneda || 'GTQ';
  const gestion: string = item.propiedad?.gestion ?? 'VENTA';
  const precioVenta = Number(item.propiedad?.precio_venta ?? 0);
  const precioRenta = Number(item.propiedad?.precio_renta ?? 0);
  const comisionPct = item.propiedad?.comision_porcentaje != null ? Number(item.propiedad.comision_porcentaje) : 5.6;

  // Para AMBAS: el agente elige qué operación se concretó
  const [tipoOp, setTipoOp] = useState<'VENTA' | 'RENTA'>(gestion === 'RENTA' ? 'RENTA' : 'VENTA');
  const esRenta = gestion === 'RENTA' || (gestion === 'AMBAS' && tipoOp === 'RENTA');

  const precioDefault = esRenta ? precioRenta : precioVenta;
  const [precio, setPrecio] = useState(precioDefault > 0 ? String(precioDefault) : '');
  const [meses, setMeses] = useState('12');
  const [overrideComision, setOverrideComision] = useState('');
  const [editandoComision, setEditandoComision] = useState(false);

  const precioNum = parseFloat(precio) || 0;
  const mesesNum = parseInt(meses) || 0;

  // Comisión sugerida
  const sugeridaVenta = precioNum > 0 ? round2(precioNum * (comisionPct / 100)) : null;
  const sugeridaRenta = precioRenta > 0 && mesesNum > 0 ? comisionRentaCBR(precioRenta, mesesNum) : null;
  const sugerida = esRenta ? sugeridaRenta : sugeridaVenta;

  // Comisión final: override si editando, si no, sugerida
  const comisionFinal = editandoComision && overrideComision !== ''
    ? (parseFloat(overrideComision) || 0)
    : sugerida;

  // Cuando cambia tipo operación, resetear precio
  const handleTipoOp = (t: 'VENTA' | 'RENTA') => {
    setTipoOp(t);
    const p = t === 'RENTA' ? precioRenta : precioVenta;
    setPrecio(p > 0 ? String(p) : '');
    setOverrideComision('');
    setEditandoComision(false);
  };

  const canConfirm = precioNum > 0 && (!esRenta || mesesNum > 0);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      precioAcordado: precioNum,
      tipoOperacionCierre: gestion === 'AMBAS' ? tipoOp : undefined,
      duracionContratoMeses: esRenta ? mesesNum : undefined,
      comisionAcordada: editandoComision && overrideComision !== '' ? parseFloat(overrideComision) || undefined : undefined,
    });
  };

  return (
    <Modal isOpen onClose={onCancel} title="Confirmar cierre del trámite" width={500}>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        {item.propiedad?.codigo} — {item.propiedad?.titulo}
      </p>

      {/* Tipo operación — solo para AMBAS */}
      {gestion === 'AMBAS' && (
        <div className="input-group" style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Tipo de operación</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {(['VENTA', 'RENTA'] as const).map(t => (
              <button key={t} onClick={() => handleTipoOp(t)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: `2px solid ${tipoOp === t ? '#22c55e' : 'var(--border)'}`,
                background: tipoOp === t ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: tipoOp === t ? '#22c55e' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer',
              }}>
                {t === 'VENTA' ? '🏠 Venta' : '🔑 Renta'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Precio de cierre */}
      <div className="input-group" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {esRenta ? `Precio de renta mensual (${moneda})` : `Precio de cierre (${moneda})`}
        </label>
        <input type="number" className="input-field" value={precio}
          onChange={(e) => { setPrecio(e.target.value); setOverrideComision(''); setEditandoComision(false); }}
          placeholder={esRenta ? 'Ej. 5000' : 'Ej. 450000'} autoFocus min={0} />
      </div>

      {/* Duración contrato — solo RENTA */}
      {esRenta && (
        <div className="input-group" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Duración del contrato (meses)</label>
          <input type="number" className="input-field" value={meses}
            onChange={(e) => { setMeses(e.target.value); setOverrideComision(''); setEditandoComision(false); }}
            placeholder="Ej. 24" min={1} />
          {mesesNum > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              {labelCBR(mesesNum)}
            </span>
          )}
        </div>
      )}

      {/* Comisión sugerida + override */}
      {sugerida != null && (
        <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: '0.875rem', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: esRenta ? 6 : 0 }}>
            <span style={{ color: 'var(--text-muted)' }}>Comisión sugerida (CBR):</span>
            <strong style={{ color: '#22c55e' }}>{moneda} {fmtNum(sugerida)}</strong>
          </div>
          {/* Mostrar ambas cuando gestion=AMBAS */}
          {gestion === 'AMBAS' && sugeridaVenta != null && sugeridaRenta != null && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Ref venta: {moneda} {fmtNum(sugeridaVenta)} ({comisionPct}%) &nbsp;|&nbsp; Ref renta: {moneda} {fmtNum(sugeridaRenta)}
            </div>
          )}
          {!editandoComision ? (
            <button onClick={() => { setEditandoComision(true); setOverrideComision(String(sugerida)); }}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              ✏️ Modificar comisión acordada
            </button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Comisión acordada ({moneda}) — override manual:
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" className="input-field" value={overrideComision}
                  onChange={(e) => setOverrideComision(e.target.value)} min={0}
                  style={{ flex: 1, fontSize: '0.875rem' }} />
                <button onClick={() => { setEditandoComision(false); setOverrideComision(''); }}
                  style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comisión final */}
      {comisionFinal != null && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          Comisión final: <strong style={{ color: editandoComision ? '#f59e0b' : '#22c55e' }}>
            {moneda} {fmtNum(comisionFinal)}
          </strong>
          {editandoComision && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#f59e0b' }}>⚠ valor manual</span>}
        </div>
      )}

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
          Confirmar cierre ✓
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const isJunior = user?.rol === 'JUNIOR';
  const nextEstados = isJunior ? NEXT_ESTADO_JUNIOR : NEXT_ESTADO;

  const { data: pipeline = {}, isLoading: loading, isError } = usePipeline();
  const moveMutation = useMovePipeline();

  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);
  const [pendingMove, setPendingMove] = useState<{ id: string; target: string } | null>(null);
  const [pendingCierre, setPendingCierre] = useState<{ id: string } | null>(null);
  const [pendingGanado, setPendingGanado] = useState<{ id: string; item?: PipelineItem } | null>(null);
  const [timelineItem, setTimelineItem] = useState<PipelineItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const doMove = (id: string, nuevoEstado: string, motivoPerdida?: string, precioAcordado?: number, cierreDocumentos?: string[], tipoOperacionCierre?: string, duracionContratoMeses?: number, comisionAcordada?: number) => {
    moveMutation.mutate(
      { id, nuevoEstado, motivoPerdida, precioAcordado, cierreDocumentos, tipoOperacionCierre, duracionContratoMeses, comisionAcordada },
      {
        onSuccess: () => toast.success('Lead actualizado'),
        onError: (err: Error) => toast.error(err.message ?? 'Error al mover el lead'),
      },
    );
  };

  const handleMove = (id: string, estado: string) => {
    if (estado === 'PERDIDO') {
      setPendingMove({ id, target: estado });
    } else if (estado === 'CIERRE') {
      setPendingCierre({ id });
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
    <div className="page-loading"><div className="spinner" /><span>Cargando pipeline...</span></div>
  );

  if (isError) return (
    <div className="page-error-state" style={{ margin: '48px auto' }}>
      <div className="page-error-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3>Error al cargar el pipeline</h3>
      <p>No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
    </div>
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

      {pendingCierre && (
        <CierreModal
          onConfirm={(docs) => {
            doMove(pendingCierre.id, 'CIERRE', undefined, undefined, docs);
            setPendingCierre(null);
          }}
          onCancel={() => setPendingCierre(null)}
        />
      )}

      {pendingGanado?.item && (
        <GanadoModal
          item={pendingGanado.item}
          onConfirm={({ precioAcordado, tipoOperacionCierre, duracionContratoMeses, comisionAcordada }) => {
            doMove(pendingGanado.id, 'GANADO', undefined, precioAcordado, undefined, tipoOperacionCierre, duracionContratoMeses, comisionAcordada);
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
