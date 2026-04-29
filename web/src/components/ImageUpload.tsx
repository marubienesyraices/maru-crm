import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import './ImageUpload.css';

interface PropiedadImagen {
  id: string;
  url: string;
  nombre: string | null;
  tipo: string;
  orden: number;
}

interface Props {
  propiedadId: string;
  imagenes: PropiedadImagen[];
  onUpdate: () => void;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ImageUpload({ propiedadId, imagenes, onUpdate }: Props) {
  const { accessToken } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));

      const res = await fetch(`${API}/api/propiedades/${propiedadId}/imagenes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al subir');
      }

      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }, [propiedadId, accessToken, onUpdate]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const handleSetPortada = async (imagenId: string) => {
    await fetch(`${API}/api/propiedades/${propiedadId}/imagenes/${imagenId}/portada`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    onUpdate();
  };

  const handleDelete = async (imagenId: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    await fetch(`${API}/api/propiedades/${propiedadId}/imagenes/${imagenId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    onUpdate();
  };

  return (
    <div className="img-upload-section">
      {/* Dropzone */}
      <div
        className={`img-dropzone ${dragOver ? 'img-dropzone-active' : ''} ${uploading ? 'img-dropzone-uploading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <div className="spinner" />
            <span>Subiendo imágenes...</span>
          </>
        ) : (
          <>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="img-dropzone-text">
              Arrastra imágenes aquí o <strong>haz clic para seleccionar</strong>
            </span>
            <span className="img-dropzone-hint">JPG, PNG, WebP — máx 10MB por imagen</span>
          </>
        )}
      </div>

      {/* Gallery */}
      {imagenes.length > 0 && (
        <div className="img-gallery">
          {imagenes.map((img) => (
            <div key={img.id} className={`img-thumb ${img.tipo === 'portada' ? 'img-thumb-cover' : ''}`}>
              <img
                src={`${API}${img.url}`}
                alt={img.nombre || 'Imagen'}
                onClick={() => setLightbox(`${API}${img.url}`)}
              />
              {img.tipo === 'portada' && (
                <span className="img-cover-badge">★ Portada</span>
              )}
              <div className="img-thumb-actions">
                {img.tipo !== 'portada' && (
                  <button title="Marcar como portada" onClick={(e) => { e.stopPropagation(); handleSetPortada(img.id); }}>
                    ★
                  </button>
                )}
                <button title="Eliminar" className="img-btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="img-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Vista ampliada" />
          <button className="img-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
