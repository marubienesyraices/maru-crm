import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../../components/Toast';
import { HexColorPicker } from 'react-colorful';
import {
  useCartaConfig, useUpdateCartaConfig,
  useCartaPlantilla, useUpdateCartaPlantilla, useResetCartaPlantilla,
  useBrochureConfig, useUpdateBrochureConfig, useResetBrochureConfig,
} from '../../hooks/useConfigDocumentos';
import type { BrochureSeccion } from '../../hooks/useConfigDocumentos';
import './Settings.css';

// ── Types ───────────────────────────────────────────────────────

type Tab = 'carta' | 'brochure';

// ── Variables disponibles en la plantilla HTML ──────────────────

const CARTA_VARIABLES = [
  { tag: '{{empresa_nombre}}',   desc: 'Nombre de la empresa' },
  { tag: '{{{logo_src}}}',       desc: 'Logo (data URI — usar en <img src>)' },
  { tag: '{{tagline}}',          desc: 'Tagline de la empresa' },
  { tag: '{{color_primario}}',   desc: 'Color primario (#hex)' },
  { tag: '{{color_oscuro}}',     desc: 'Color primario oscurecido' },
  { tag: '{{on_primario}}',      desc: 'Color de texto sobre primario' },
  { tag: '{{ref_num}}',          desc: 'Número de referencia de la carta' },
  { tag: '{{fecha}}',            desc: 'Fecha de generación' },
  { tag: '{{propietario_nombre}}', desc: 'Nombre del propietario' },
  { tag: '{{agente_nombre}}',    desc: 'Nombre del agente' },
  { tag: '{{agente_email}}',     desc: 'Email del agente' },
  { tag: '{{gestion_texto}}',    desc: 'Tipo de gestión (venta / renta / ...)' },
  { tag: '{{codigo_propiedad}}', desc: 'Código de la propiedad' },
  { tag: '{{titulo_propiedad}}', desc: 'Título / nombre de la propiedad' },
  { tag: '{{tipo_inmueble}}',    desc: 'Tipo (casa, apartamento, etc.)' },
  { tag: '{{gestion}}',          desc: 'Gestión raw (VENTA / RENTA / AMBAS)' },
  { tag: '{{ubicacion}}',        desc: 'Zona, municipio, departamento' },
  { tag: '{{direccion}}',        desc: 'Dirección exacta (puede estar vacía)' },
  { tag: '{{precio_referencia}}', desc: 'Precio de referencia formateado' },
  { tag: '{{comision_pct}}',     desc: 'Porcentaje de comisión (número)' },
  { tag: '{{comision_monto}}',   desc: 'Monto estimado de comisión formateado' },
  { tag: '{{{clausulas_custom}}}', desc: 'Cláusulas personalizadas (puede contener HTML)' },
];

// ── Helpers ─────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="settings-toggle" onClick={() => onChange(!value)} style={{ cursor: 'pointer' }}>
      <div className={`toggle-track${value ? ' on' : ''}`}><div className="toggle-thumb" /></div>
    </div>
  );
}

function ColorField({ label, hint, value, onChange }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isValid = /^#[0-9A-Fa-f]{3,6}$/.test(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="settings-field" ref={ref} style={{ position: 'relative' }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
            background: isValid ? value : '#ccc',
            border: '2px solid var(--border-subtle)',
          }}
          onClick={() => setOpen(v => !v)}
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1 }}
          placeholder="#2563eb"
          maxLength={7}
        />
      </div>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 100, top: '100%', left: 0, marginTop: 6,
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <HexColorPicker color={isValid ? value : '#2563eb'} onChange={onChange} />
        </div>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function SaveBar({ saving, msg, onSave, onReset, resetLabel, disableReset }: {
  saving: boolean; msg: string; onSave: () => void;
  onReset?: () => void; resetLabel?: string; disableReset?: boolean;
}) {
  return (
    <div className="settings-save-bar">
      {msg && <span className="save-msg">✓ {msg}</span>}
      {onReset && (
        <button className="btn-settings-ghost" onClick={onReset} disabled={disableReset || saving}>
          {resetLabel ?? 'Restaurar'}
        </button>
      )}
      <button className="btn-settings-primary" onClick={onSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );
}

// ── Sortable section row ─────────────────────────────────────────

function SortableSeccion({
  seccion, onToggle, onLabelChange,
}: {
  seccion: BrochureSeccion;
  onToggle: (id: string, v: boolean) => void;
  onLabelChange: (id: string, v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: seccion.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`brochure-section-row${isDragging ? ' dragging' : ''}`}
    >
      <span className="drag-handle" {...attributes} {...listeners} title="Arrastrar para reordenar">
        ⠿
      </span>
      <Toggle value={seccion.visible} onChange={v => onToggle(seccion.id, v)} />
      <input
        className="section-label-input"
        value={seccion.label}
        onChange={e => onLabelChange(seccion.id, e.target.value)}
        disabled={!seccion.visible}
        placeholder="Nombre de la sección"
      />
      <span className="section-id-badge">{seccion.id}</span>
    </div>
  );
}

// ── Tab: Carta de Comisión ───────────────────────────────────────

function TabCarta() {
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Apariencia
  const { data: cartaConfig, isLoading: loadingConfig } = useCartaConfig();
  const updateConfig = useUpdateCartaConfig();
  const [config, setConfig] = useState({
    carta_color_primario: '',
    carta_tagline: '',
    carta_logo_url: '',
    carta_clausulas_custom: '',
  });
  const [msgConfig, setMsgConfig] = useState('');

  useEffect(() => {
    if (cartaConfig) {
      setConfig({
        carta_color_primario: cartaConfig.carta_color_primario ?? '',
        carta_tagline: cartaConfig.carta_tagline ?? '',
        carta_logo_url: cartaConfig.carta_logo_url ?? '',
        carta_clausulas_custom: cartaConfig.carta_clausulas_custom ?? '',
      });
    }
  }, [cartaConfig]);

  const saveConfig = async () => {
    try {
      await updateConfig.mutateAsync({
        carta_color_primario: config.carta_color_primario || null,
        carta_tagline: config.carta_tagline || null,
        carta_logo_url: config.carta_logo_url || null,
        carta_clausulas_custom: config.carta_clausulas_custom || null,
      });
      setMsgConfig('Guardado');
      setTimeout(() => setMsgConfig(''), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    }
  };

  // Plantilla HTML
  const { data: plantillaData, isLoading: loadingPlantilla } = useCartaPlantilla();
  const updatePlantilla = useUpdateCartaPlantilla();
  const resetPlantilla = useResetCartaPlantilla();
  const [html, setHtml] = useState('');
  const [msgPlantilla, setMsgPlantilla] = useState('');

  useEffect(() => {
    if (plantillaData) setHtml(plantillaData.plantilla_html);
  }, [plantillaData]);

  const savePlantilla = async () => {
    try {
      await updatePlantilla.mutateAsync(html);
      setMsgPlantilla('Guardado');
      setTimeout(() => setMsgPlantilla(''), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Restaurar la plantilla al diseño por defecto? Se perderán los cambios personalizados.')) return;
    try {
      const data = await resetPlantilla.mutateAsync();
      setHtml((data as any).plantilla_html ?? '');
      setMsgPlantilla('Restaurada al diseño original');
      setTimeout(() => setMsgPlantilla(''), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al restaurar');
    }
  };

  const insertVariable = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) { setHtml(h => h + tag); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = html.slice(0, start) + tag + html.slice(end);
    setHtml(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    });
  };

  const setField = (k: keyof typeof config) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setConfig(p => ({ ...p, [k]: e.target.value }));

  if (loadingConfig || loadingPlantilla) {
    return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando configuración…</div>;
  }

  return (
    <>
      {/* Apariencia */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">🎨</div>
            <div>
              <h2>Apariencia</h2>
              <p>Color, logo y tagline que aparecen en la carta</p>
            </div>
          </div>
        </div>
        <div className="settings-grid">
          <ColorField
            label="Color primario"
            hint="Acento de color en sidebar, título y firma"
            value={config.carta_color_primario}
            onChange={v => setConfig(p => ({ ...p, carta_color_primario: v }))}
          />
          <div className="settings-field">
            <label>URL del logo</label>
            <input
              value={config.carta_logo_url}
              onChange={setField('carta_logo_url')}
              placeholder="https://... o /uploads/logo.png"
            />
            <span className="hint">Deja en blanco para usar el logo principal de la empresa</span>
          </div>
          <div className="settings-field full">
            <label>Tagline</label>
            <input
              value={config.carta_tagline}
              onChange={setField('carta_tagline')}
              placeholder="Bienes y Raíces · Especialistas en propiedades"
            />
          </div>
          <div className="settings-field full">
            <label>Cláusulas personalizadas</label>
            <textarea
              rows={4}
              value={config.carta_clausulas_custom}
              onChange={setField('carta_clausulas_custom')}
              placeholder="Texto de vigencia y condiciones del compromiso de comisión…"
            />
            <span className="hint">
              Reemplaza las cláusulas por defecto (6 meses de vigencia). Puedes usar HTML básico.
            </span>
          </div>
        </div>
        <SaveBar saving={updateConfig.isPending} msg={msgConfig} onSave={saveConfig} />
      </div>

      {/* Plantilla HTML */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">📄</div>
            <div>
              <h2>Plantilla HTML</h2>
              <p>
                Diseño completo de la carta en HTML. Usa{' '}
                <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  {'{{variable}}'}
                </code>{' '}
                para insertar datos dinámicos.
              </p>
            </div>
          </div>
          {plantillaData?.es_default && (
            <span className="settings-badge settings-badge-off">Plantilla por defecto</span>
          )}
        </div>

        <div className="doc-editor-wrap">
          <div className="settings-field" style={{ margin: 0 }}>
            <label>HTML de la carta</label>
            <textarea
              ref={textareaRef}
              value={html}
              onChange={e => setHtml(e.target.value)}
              spellCheck={false}
              style={{ minHeight: 500 }}
            />
          </div>
          <div className="doc-vars-panel">
            <p className="doc-vars-title">Variables disponibles</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>
              Haz clic para insertar en la posición del cursor
            </p>
            <div className="doc-var-list">
              {CARTA_VARIABLES.map(v => (
                <div
                  key={v.tag}
                  className="doc-var-item"
                  onClick={() => insertVariable(v.tag)}
                  title={`Insertar ${v.tag}`}
                >
                  <span className="doc-var-tag">{v.tag}</span>
                  <span className="doc-var-desc">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SaveBar
          saving={updatePlantilla.isPending || resetPlantilla.isPending}
          msg={msgPlantilla}
          onSave={savePlantilla}
          onReset={handleReset}
          resetLabel="Restaurar plantilla original"
        />
      </div>
    </>
  );
}

// ── Tab: Brochure ────────────────────────────────────────────────

function TabBrochure() {
  const toast = useToast();
  const { data, isLoading } = useBrochureConfig();
  const update = useUpdateBrochureConfig();
  const reset = useResetBrochureConfig();

  const [secciones, setSecciones] = useState<BrochureSeccion[]>([]);
  const [footerTexto, setFooterTexto] = useState('');
  const [watermarkTexto, setWatermarkTexto] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (data) {
      setSecciones([...data.secciones].sort((a, b) => a.order - b.order));
      setFooterTexto(data.footer_texto ?? '');
      setWatermarkTexto(data.watermark_texto ?? '');
    }
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSecciones(prev => {
      const oldIdx = prev.findIndex(s => s.id === active.id);
      const newIdx = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, []);

  const toggleSeccion = useCallback((id: string, visible: boolean) => {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, visible } : s));
  }, []);

  const changeLabel = useCallback((id: string, label: string) => {
    setSecciones(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  const save = async () => {
    try {
      await update.mutateAsync({
        secciones,
        footer_texto: footerTexto || null,
        watermark_texto: watermarkTexto || null,
      } as any);
      setMsg('Guardado');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al guardar');
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Restaurar la configuración del brochure a los valores por defecto?')) return;
    try {
      await reset.mutateAsync();
      setMsg('Restaurado');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al restaurar');
    }
  };

  if (isLoading) {
    return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando configuración…</div>;
  }

  return (
    <>
      {/* Secciones */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">⠿</div>
            <div>
              <h2>Secciones del brochure</h2>
              <p>Arrastra para reordenar · activa o desactiva secciones · renombra los títulos</p>
            </div>
          </div>
          {data?.es_default && (
            <span className="settings-badge settings-badge-off">Configuración por defecto</span>
          )}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={secciones.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="brochure-sections">
              {secciones.map(sec => (
                <SortableSeccion
                  key={sec.id}
                  seccion={sec}
                  onToggle={toggleSeccion}
                  onLabelChange={changeLabel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>
          <strong>Columna izquierda:</strong> descripción, características, amenidades ·{' '}
          <strong>Columna derecha:</strong> ubicación, agente ·{' '}
          <strong>Pie de página:</strong> galería (tira y pág. 2)
        </p>
      </div>

      {/* Personalización */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">✏️</div>
            <div>
              <h2>Personalización del pie</h2>
              <p>Texto del footer y marca de agua del brochure</p>
            </div>
          </div>
        </div>
        <div className="settings-grid">
          <div className="settings-field">
            <label>Texto del footer</label>
            <input
              value={footerTexto}
              onChange={e => setFooterTexto(e.target.value)}
              placeholder="Nombre empresa · Código propiedad · Fecha (por defecto)"
            />
            <span className="hint">Deja en blanco para usar el texto automático</span>
          </div>
          <div className="settings-field">
            <label>Marca de agua</label>
            <input
              value={watermarkTexto}
              onChange={e => setWatermarkTexto(e.target.value)}
              placeholder="CONFIDENCIAL (por defecto)"
            />
            <span className="hint">Texto que aparece en la esquina inferior derecha</span>
          </div>
        </div>

        <SaveBar
          saving={update.isPending || reset.isPending}
          msg={msg}
          onSave={save}
          onReset={handleReset}
          resetLabel="Restaurar todo a valores por defecto"
        />
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'carta',    label: 'Carta de Comisión' },
  { id: 'brochure', label: 'Brochure de Propiedad' },
];

export default function SettingsDocumentosPage() {
  const [tab, setTab] = useState<Tab>('carta');

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Documentos PDF</h1>
        <p>Personaliza el diseño y contenido de los documentos generados por el CRM</p>
      </div>

      <div className="settings-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`settings-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'carta'    && <TabCarta />}
      {tab === 'brochure' && <TabBrochure />}
    </div>
  );
}
