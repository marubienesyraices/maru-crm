import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../lib/api';
import './Tareas.css';

type EstadoTarea = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA';
type PrioridadTarea = 'BAJA' | 'MEDIA' | 'ALTA';

interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  fecha_limite?: string;
  completed_at?: string;
  created_at: string;
}

const PRIORIDAD_LABEL: Record<PrioridadTarea, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

const PRIORIDAD_COLOR: Record<PrioridadTarea, string> = {
  ALTA: '#ef4444',
  MEDIA: '#f59e0b',
  BAJA: '#6b7280',
};

const ESTADO_LABEL: Record<EstadoTarea, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  COMPLETADA: 'Completada',
};

function isOverdue(fecha_limite?: string, estado?: EstadoTarea): boolean {
  if (!fecha_limite || estado === 'COMPLETADA') return false;
  return new Date(fecha_limite) < new Date();
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('MEDIA');
  const [fechaLimite, setFechaLimite] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [filtroEstado, setFiltroEstado] = useState<EstadoTarea | 'TODAS'>('TODAS');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Tarea[]>('/api/tareas');
      setTareas(data);
    } catch {
      setError('Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setTitulo('');
    setDescripcion('');
    setPrioridad('MEDIA');
    setFechaLimite('');
    setError('');
    setShowForm(true);
  }

  function openEdit(t: Tarea) {
    setEditingId(t.id);
    setTitulo(t.titulo);
    setDescripcion(t.descripcion ?? '');
    setPrioridad(t.prioridad);
    setFechaLimite(t.fecha_limite ? t.fecha_limite.slice(0, 10) : '');
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setError('El título es requerido'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        prioridad,
        fechaLimite: fechaLimite || undefined,
      };
      if (editingId) {
        await apiRequest(`/api/tareas/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiRequest('/api/tareas', { method: 'POST', body: JSON.stringify(body) });
      }
      setShowForm(false);
      await load();
    } catch {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleEstado(t: Tarea, estado: EstadoTarea) {
    try {
      await apiRequest(`/api/tareas/${t.id}`, { method: 'PUT', body: JSON.stringify({ estado }) });
      await load();
    } catch {
      setError('Error al actualizar estado');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await apiRequest(`/api/tareas/${id}`, { method: 'DELETE' });
      setTareas(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('Error al eliminar');
    }
  }

  const filtered = filtroEstado === 'TODAS' ? tareas : tareas.filter(t => t.estado === filtroEstado);
  const pendientes = tareas.filter(t => t.estado !== 'COMPLETADA').length;
  const vencidas = tareas.filter(t => isOverdue(t.fecha_limite, t.estado)).length;

  return (
    <div className="tareas-page">
      <div className="tareas-header">
        <div>
          <h1>Mis Tareas</h1>
          <div className="tareas-stats">
            <span className="tareas-stat">{pendientes} pendientes</span>
            {vencidas > 0 && <span className="tareas-stat overdue">{vencidas} vencida{vencidas !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nueva tarea</button>
      </div>

      <div className="tareas-filters">
        {(['TODAS', 'PENDIENTE', 'EN_PROGRESO', 'COMPLETADA'] as const).map(e => (
          <button
            key={e}
            className={`filter-btn${filtroEstado === e ? ' active' : ''}`}
            onClick={() => setFiltroEstado(e)}
          >
            {e === 'TODAS' ? 'Todas' : ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {error && <p className="tareas-error">{error}</p>}

      {loading ? (
        <div className="tareas-empty">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="tareas-empty">
          {filtroEstado === 'TODAS' ? 'No tienes tareas aún. ¡Crea tu primera tarea!' : `No hay tareas con estado "${ESTADO_LABEL[filtroEstado as EstadoTarea]}"`}
        </div>
      ) : (
        <ul className="tareas-list">
          {filtered.map(t => (
            <li key={t.id} className={`tarea-card${t.estado === 'COMPLETADA' ? ' completed' : ''}${isOverdue(t.fecha_limite, t.estado) ? ' overdue' : ''}`}>
              <div className="tarea-check">
                <button
                  className={`check-btn${t.estado === 'COMPLETADA' ? ' checked' : ''}`}
                  title={t.estado === 'COMPLETADA' ? 'Marcar como pendiente' : 'Marcar como completada'}
                  onClick={() => handleEstado(t, t.estado === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA')}
                >
                  {t.estado === 'COMPLETADA' ? '✓' : ''}
                </button>
              </div>

              <div className="tarea-body">
                <div className="tarea-top">
                  <span className="tarea-titulo">{t.titulo}</span>
                  <span
                    className="tarea-prioridad"
                    style={{ color: PRIORIDAD_COLOR[t.prioridad] }}
                  >
                    {PRIORIDAD_LABEL[t.prioridad]}
                  </span>
                </div>
                {t.descripcion && <p className="tarea-desc">{t.descripcion}</p>}
                <div className="tarea-meta">
                  <span className={`tarea-estado-badge estado-${t.estado}`}>{ESTADO_LABEL[t.estado]}</span>
                  {t.fecha_limite && (
                    <span className={`tarea-fecha${isOverdue(t.fecha_limite, t.estado) ? ' overdue' : ''}`}>
                      {isOverdue(t.fecha_limite, t.estado) ? '⚠ ' : ''}Vence: {formatDate(t.fecha_limite)}
                    </span>
                  )}
                </div>
              </div>

              <div className="tarea-actions">
                {t.estado === 'PENDIENTE' && (
                  <button className="btn-sm" onClick={() => handleEstado(t, 'EN_PROGRESO')} title="En progreso">▶</button>
                )}
                <button className="btn-sm" onClick={() => openEdit(t)} title="Editar">✏</button>
                <button className="btn-sm danger" onClick={() => handleDelete(t.id)} title="Eliminar">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar tarea' : 'Nueva tarea'}</h2>
            <form onSubmit={handleSubmit} className="tarea-form">
              <label>
                Título <span className="required">*</span>
                <input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="¿Qué necesitas hacer?"
                  maxLength={200}
                  autoFocus
                />
              </label>
              <label>
                Descripción
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Detalles opcionales..."
                  rows={3}
                  maxLength={1000}
                />
              </label>
              <div className="form-row">
                <label>
                  Prioridad
                  <select value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadTarea)}>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </label>
                <label>
                  Fecha límite
                  <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} />
                </label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
