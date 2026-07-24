import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
import './ImageUpload.css';

export interface PropiedadDocumento {
  id: string;
  url: string;
  nombre: string | null;
  tipo: string;
  fecha_vencimiento: string | null;
}

interface Props {
  propiedadId: string;
  documentos: PropiedadDocumento[];
  onUpdate: () => void;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function DocumentUpload({ propiedadId, documentos, onUpdate }: Props) {
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    tipo: 'ESCRITURA',
    fechaVencimiento: '',
  });

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', files[0]); // Documentos sube de uno en uno
      formData.append('tipo', uploadData.tipo);
      if (uploadData.fechaVencimiento) {
        // Enviar al final del dia
        const date = new Date(uploadData.fechaVencimiento);
        date.setUTCHours(23, 59, 59);
        formData.append('fecha_vencimiento', date.toISOString());
      }

      const res = await fetch(`${API}/api/propiedades/${propiedadId}/documentos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message || 'Error al subir');
      }

      setUploadData({ tipo: 'ESCRITURA', fechaVencimiento: '' });
      toast.success('Documento subido correctamente');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el documento');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }, [propiedadId, accessToken, uploadData, onUpdate, toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleDelete = async (docId: string) => {
    const ok = await confirm({ title: '¿Eliminar documento?', message: 'Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/propiedades/${propiedadId}/documentos/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Documento eliminado');
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el documento');
    }
  };

  const formatDocType = (tipo: string) => {
    const labels: Record<string, string> = {
      ESCRITURA: 'Escritura',
      DPI: 'DPI/Identificación',
      MANDATO: 'Mandato',
      PLANOS: 'Planos',
      CARTA_COMISION: 'Carta de Comisión',
      OTRO: 'Otro',
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="img-upload-section">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Tipo de Documento</label>
          <select 
            className="input-field" 
            value={uploadData.tipo} 
            onChange={(e) => setUploadData({ ...uploadData, tipo: e.target.value })}
          >
            <option value="ESCRITURA">Escritura</option>
            <option value="DPI">DPI/Identificación</option>
            <option value="MANDATO">Mandato</option>
            <option value="PLANOS">Planos</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
          <label>Fecha de Vencimiento (opcional)</label>
          <input 
            type="date" 
            className="input-field" 
            value={uploadData.fechaVencimiento} 
            onChange={(e) => setUploadData({ ...uploadData, fechaVencimiento: e.target.value })}
          />
        </div>
      </div>

      {/* Dropzone */}
      <div
        className={`img-dropzone ${dragOver ? 'img-dropzone-active' : ''} ${uploading ? 'img-dropzone-uploading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        style={{ minHeight: '120px' }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <div className="spinner" />
            <span>Subiendo documento...</span>
          </>
        ) : (
          <>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <span className="img-dropzone-text">
              Arrastra un documento PDF/Imagen aquí o <strong>haz clic para seleccionar</strong>
            </span>
            <span className="img-dropzone-hint">PDF, JPG, PNG — máx 20MB</span>
          </>
        )}
      </div>

      {/* Document List */}
      {documentos.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {documentos.map((doc) => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent-blue)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div>
                  <div style={{ fontWeight: 500 }}>{doc.nombre || 'Documento'}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {formatDocType(doc.tipo)}
                    {doc.fecha_vencimiento && ` • Vence: ${new Date(doc.fecha_vencimiento).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={`${API}${doc.url}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8125rem' }}>
                  Ver
                </a>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8125rem', color: 'var(--danger)' }} onClick={() => handleDelete(doc.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
