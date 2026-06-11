import { useState, useCallback, useRef, useEffect } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthStore } from '../stores/authStore';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmDialog';
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
const MAX_IMAGENES = 30;
const MAX_VIDEOS   = 3;

/** If the URL is already absolute (R2/CDN), use it as-is; otherwise prefix with API base */
const resolveUrl = (url: string) => url.startsWith('http') ? url : `${API}${url}`;

function SortableThumb({
  img, idx, onSetPortada, onDelete, onOpen,
}: {
  img: PropiedadImagen; idx: number;
  onSetPortada: (id: string) => void;
  onDelete: (id: string, tipo: string) => void;
  onOpen: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`img-thumb ${img.tipo === 'portada' ? 'img-thumb-cover' : ''}`}
      {...attributes}
      {...listeners}
    >
      <img
        src={resolveUrl(img.url)}
        alt={img.nombre || 'Imagen'}
        draggable={false}
        onClick={() => onOpen(idx)}
        style={{ cursor: 'pointer' }}
      />
      {img.tipo === 'portada' && <span className="img-cover-badge">★ Portada</span>}
      <div className="img-thumb-actions">
        {img.tipo !== 'portada' && (
          <button title="Marcar como portada" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSetPortada(img.id); }}>★</button>
        )}
        <button title="Eliminar" className="img-btn-delete" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(img.id, img.tipo); }}>✕</button>
      </div>
    </div>
  );
}

export default function ImageUpload({ propiedadId, imagenes, onUpdate }: Props) {
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverVideo, setDragOverVideo] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const fotos  = imagenes.filter((i) => i.tipo !== 'video');
  const videos = imagenes.filter((i) => i.tipo === 'video');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = fotos.findIndex((f) => f.id === active.id);
    const newIdx = fotos.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(fotos, oldIdx, newIdx);
    setReordering(true);
    try {
      await fetch(`${API}/api/propiedades/${propiedadId}/imagenes/reorder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: reordered.map((f) => f.id) }),
      });
      onUpdate();
    } catch {
      toast.error('Error al reordenar imágenes');
    } finally {
      setReordering(false);
    }
  }, [fotos, propiedadId, accessToken, onUpdate, toast]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => i === null ? null : (i + 1) % fotos.length);
      if (e.key === 'ArrowLeft')  setLightboxIndex((i) => i === null ? null : (i - 1 + fotos.length) % fotos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, fotos.length]);

  const uploadImages = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;

    const remaining = MAX_IMAGENES - fotos.length;
    if (remaining <= 0) {
      toast.error(`Límite alcanzado: máximo ${MAX_IMAGENES} imágenes por propiedad.`);
      return;
    }
    if (arr.length > remaining) {
      toast.error(`Solo puedes agregar ${remaining} imagen${remaining !== 1 ? 'es' : ''} más (límite ${MAX_IMAGENES}).`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      arr.forEach((f) => formData.append('files', f));
      const res = await fetch(`${API}/api/propiedades/${propiedadId}/imagenes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Error al subir'); }
      toast.success('Imágenes subidas correctamente');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al subir imágenes');
    } finally {
      setUploading(false);
    }
  }, [propiedadId, accessToken, fotos.length, onUpdate, toast]);

  const uploadVideos = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (!arr.length) return;

    const remaining = MAX_VIDEOS - videos.length;
    if (remaining <= 0) {
      toast.error(`Límite alcanzado: máximo ${MAX_VIDEOS} videos por propiedad.`);
      return;
    }
    if (arr.length > remaining) {
      toast.error(`Solo puedes agregar ${remaining} video${remaining !== 1 ? 's' : ''} más (límite ${MAX_VIDEOS}).`);
      return;
    }

    setUploadingVideo(true);
    try {
      const formData = new FormData();
      arr.forEach((f) => formData.append('files', f));
      const res = await fetch(`${API}/api/propiedades/${propiedadId}/imagenes/videos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Error al subir'); }
      toast.success('Video subido correctamente');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al subir video');
    } finally {
      setUploadingVideo(false);
    }
  }, [propiedadId, accessToken, videos.length, onUpdate, toast]);

  const handleSetPortada = async (imagenId: string) => {
    await fetch(`${API}/api/propiedades/${propiedadId}/imagenes/${imagenId}/portada`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    onUpdate();
  };

  const handleDelete = async (imagenId: string, tipo: string) => {
    const label = tipo === 'video' ? 'video' : 'imagen';
    const ok = await confirm({ title: `¿Eliminar ${label}?`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    setLightboxIndex(null);
    await fetch(`${API}/api/propiedades/${propiedadId}/imagenes/${imagenId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminada`);
    onUpdate();
  };

  const currentImage = lightboxIndex !== null && lightboxIndex < fotos.length ? fotos[lightboxIndex] : null;

  return (
    <div className="img-upload-section">

      {/* ── Sección imágenes ─────────────────────────────── */}
      <div className="img-section-header">
        <span className="img-section-title">Imágenes</span>
        <span className={`img-section-counter ${fotos.length >= MAX_IMAGENES ? 'img-counter-full' : ''}`}>
          {fotos.length} / {MAX_IMAGENES}
        </span>
      </div>

      {fotos.length < MAX_IMAGENES && (
        <div
          className={`img-dropzone ${dragOver ? 'img-dropzone-active' : ''} ${uploading ? 'img-dropzone-uploading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadImages(e.dataTransfer.files); }}
          onClick={() => fileInput.current?.click()}
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && uploadImages(e.target.files)}
          />
          {uploading ? (
            <><div className="spinner" /><span>Subiendo imágenes...</span></>
          ) : (
            <>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="img-dropzone-text">
                Arrastra imágenes aquí o <strong>haz clic para seleccionar</strong>
              </span>
              <span className="img-dropzone-hint">
                JPG, PNG, WebP — máx 10 MB — quedan {MAX_IMAGENES - fotos.length} espacios
              </span>
            </>
          )}
        </div>
      )}

      {fotos.length >= MAX_IMAGENES && (
        <div className="img-limit-banner">
          Límite de {MAX_IMAGENES} imágenes alcanzado. Elimina alguna para agregar más.
        </div>
      )}

      {fotos.length > 0 && (
        <>
          {fotos.length > 1 && (
            <p className="img-reorder-hint">{reordering ? 'Guardando orden…' : 'Arrastra las miniaturas para reordenar'}</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fotos.map((f) => f.id)} strategy={rectSortingStrategy}>
              <div className="img-gallery">
                {fotos.map((img, idx) => (
                  <SortableThumb
                    key={img.id}
                    img={img}
                    idx={idx}
                    onSetPortada={handleSetPortada}
                    onDelete={handleDelete}
                    onOpen={setLightboxIndex}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* ── Sección videos ───────────────────────────────── */}
      <div className="img-section-header" style={{ marginTop: '1.5rem' }}>
        <span className="img-section-title">Videos</span>
        <span className={`img-section-counter ${videos.length >= MAX_VIDEOS ? 'img-counter-full' : ''}`}>
          {videos.length} / {MAX_VIDEOS}
        </span>
      </div>

      {videos.length < MAX_VIDEOS && (
        <div
          className={`img-dropzone img-dropzone-video ${dragOverVideo ? 'img-dropzone-active' : ''} ${uploadingVideo ? 'img-dropzone-uploading' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOverVideo(true); }}
          onDragLeave={() => setDragOverVideo(false)}
          onDrop={(e) => { e.preventDefault(); setDragOverVideo(false); uploadVideos(e.dataTransfer.files); }}
          onClick={() => videoInput.current?.click()}
        >
          <input
            ref={videoInput}
            type="file"
            multiple
            accept="video/mp4,video/webm,video/quicktime"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && uploadVideos(e.target.files)}
          />
          {uploadingVideo ? (
            <><div className="spinner" /><span>Subiendo video...</span></>
          ) : (
            <>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span className="img-dropzone-text">
                Arrastra videos aquí o <strong>haz clic para seleccionar</strong>
              </span>
              <span className="img-dropzone-hint">
                MP4, WebM, MOV — máx 200 MB — quedan {MAX_VIDEOS - videos.length} espacios
              </span>
            </>
          )}
        </div>
      )}

      {videos.length >= MAX_VIDEOS && (
        <div className="img-limit-banner">
          Límite de {MAX_VIDEOS} videos alcanzado. Elimina alguno para agregar más.
        </div>
      )}

      {videos.length > 0 && (
        <div className="img-video-gallery">
          {videos.map((vid) => (
            <div key={vid.id} className="img-video-item">
              <video
                src={resolveUrl(vid.url)}
                controls
                preload="metadata"
                className="img-video-player"
              />
              <div className="img-video-name">{vid.nombre || 'Video'}</div>
              <button
                className="img-btn-delete img-video-delete"
                title="Eliminar video"
                onClick={() => handleDelete(vid.id, vid.tipo)}
              >
                ✕ Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox imágenes ────────────────────────────── */}
      {currentImage && (
        <div className="img-lightbox" onClick={() => setLightboxIndex(null)}>
          <img
            src={resolveUrl(currentImage.url)}
            alt={currentImage.nombre || 'Vista ampliada'}
            onClick={(e) => e.stopPropagation()}
          />
          <button className="img-lightbox-close" onClick={() => setLightboxIndex(null)}>✕</button>
          {fotos.length > 1 && (
            <>
              <button className="img-lightbox-prev" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i === null ? 0 : (i - 1 + fotos.length) % fotos.length); }}>‹</button>
              <button className="img-lightbox-next" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i === null ? 0 : (i + 1) % fotos.length); }}>›</button>
              <div className="img-lightbox-counter">{(lightboxIndex ?? 0) + 1} / {fotos.length}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
