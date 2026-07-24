import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import './ImportModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────

export type ImportEntity = 'clientes' | 'propiedades';

interface ImportError { row: number; campo: string; mensaje: string; }
interface ImportResult { created: number; skipped: number; errors: ImportError[]; warnings: string[]; }

interface Props {
  entity: ImportEntity;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────

export default function ImportModal({ entity, onClose, onSuccess }: Props) {
  const { accessToken } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const entityLabel = entity === 'clientes' ? 'Clientes' : 'Propiedades';
  const templateUrl = `${API_URL}/api/import/${entity}/template`;

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError('Solo se aceptan archivos .xlsx, .xls o .csv');
      return;
    }
    setError('');
    setResult(null);
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/import/${entity}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al importar');
      setResult(data);
      if (data.created > 0) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="import-overlay" onClick={onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="import-header">
          <div>
            <h3>Importar {entityLabel}</h3>
            <p>Sube un archivo Excel (.xlsx) o CSV con los datos a importar</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Template download ── */}
        <div className="import-template-row">
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            ¿No tienes el formato? Descarga la plantilla:
          </span>
          <a
            href={`${templateUrl}?token=${accessToken}`}
            className="import-template-link"
            onClick={(e) => {
              // Use fetch with auth header instead of direct link
              e.preventDefault();
              fetch(templateUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
                .then((r) => r.blob())
                .then((blob) => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `plantilla_${entity}.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                });
            }}
          >
            📥 Descargar plantilla CSV
          </a>
        </div>

        {/* ── Results view ── */}
        {result ? (
          <div className="import-results">
            <div className="import-summary">
              <div className="import-stat import-stat-ok">
                <span className="import-stat-num">{result.created}</span>
                <span className="import-stat-label">creados</span>
              </div>
              <div className="import-stat import-stat-skip">
                <span className="import-stat-num">{result.skipped}</span>
                <span className="import-stat-label">omitidos</span>
              </div>
              <div className="import-stat import-stat-err">
                <span className="import-stat-num">{result.errors.length}</span>
                <span className="import-stat-label">errores</span>
              </div>
            </div>

            {result.warnings?.length > 0 && (
              <div className="import-warnings-wrap">
                {result.warnings.map((w, i) => (
                  <div key={i} className="import-warning-row">
                    ⚠ {w}
                  </div>
                ))}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="import-error-table-wrap">
                <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Detalle de errores:
                </p>
                <div className="import-error-table">
                  <div className="import-error-header">
                    <span>Fila</span><span>Campo</span><span>Mensaje</span>
                  </div>
                  {result.errors.map((e, i) => (
                    <div key={i} className="import-error-row">
                      <span>{e.row}</span>
                      <span style={{ color: 'var(--accent-blue)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{e.campo}</span>
                      <span>{e.mensaje}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={reset}>Importar otro archivo</button>
              <button className="btn btn-primary" onClick={onClose}>
                {result.created > 0 ? `Ver ${entityLabel} →` : 'Cerrar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Drop zone ── */}
            <div
              className={`import-dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              {file ? (
                <div className="import-file-selected">
                  <span className="import-file-icon">📄</span>
                  <div>
                    <p className="import-file-name">{file.name}</p>
                    <p className="import-file-size">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    className="import-file-remove"
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    title="Quitar archivo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="import-dropzone-inner">
                  <span style={{ fontSize: '2rem' }}>📂</span>
                  <p className="import-dropzone-title">
                    {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo o haz clic para elegir'}
                  </p>
                  <p className="import-dropzone-sub">Excel (.xlsx, .xls) o CSV — máximo 5 MB</p>
                </div>
              )}
            </div>

            {error && <div className="import-error-msg">{error}</div>}

            {/* ── Column hints ── */}
            <div className="import-hints">
              <p className="import-hints-title">Columnas {entity === 'clientes' ? 'para Clientes' : 'para Propiedades'}:</p>
              <div className="import-hints-cols">
                {entity === 'clientes' ? (
                  <>
                    <span className="import-hint-col import-hint-req">nombre *</span>
                    <span className="import-hint-col">email</span>
                    <span className="import-hint-col">telefono</span>
                    <span className="import-hint-col">dpi</span>
                    <span className="import-hint-col">origen</span>
                    <span className="import-hint-col">notas</span>
                  </>
                ) : (
                  <>
                    <span className="import-hint-col import-hint-req">titulo *</span>
                    <span className="import-hint-col import-hint-req">tipo *</span>
                    <span className="import-hint-col import-hint-req">gestion *</span>
                    <span className="import-hint-col">precio_venta</span>
                    <span className="import-hint-col">precio_renta</span>
                    <span className="import-hint-col">zona</span>
                    <span className="import-hint-col">habitaciones</span>
                    <span className="import-hint-col">descripcion</span>
                    <span className="import-hint-col">...</span>
                  </>
                )}
              </div>
              {entity === 'propiedades' && (
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  tipo: CASA · APARTAMENTO · TERRENO · LOCAL_COMERCIAL · OFICINA · BODEGA · FINCA · EDIFICIO · OTRO<br />
                  gestion: VENTA · RENTA · AMBAS
                </p>
              )}
              {entity === 'clientes' && (
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  origen: PORTAL_WEB · REFERIDO · LLAMADA · WHATSAPP · REDES_SOCIALES · FERIA · OTRO
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!file || uploading}
                onClick={handleUpload}
              >
                {uploading ? (
                  <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Importando...</>
                ) : (
                  `Importar ${entityLabel}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
