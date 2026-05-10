'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface GalleryImage { url: string; alt?: string | null }

interface Props {
  imagenes: GalleryImage[];
  titulo: string;
}

export default function ImageGallery({ imagenes, titulo }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const src = (url: string) => url.startsWith('http') ? url : `${API}${url}`;

  const close  = useCallback(() => setLightbox(null), []);
  const prev   = useCallback(() => setLightbox(i => i === null ? 0 : (i - 1 + imagenes.length) % imagenes.length), [imagenes.length]);
  const next   = useCallback(() => setLightbox(i => i === null ? 0 : (i + 1) % imagenes.length), [imagenes.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      close();
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, close, prev, next]);

  if (!imagenes.length) return null;

  const main   = imagenes[0];
  const thumbs = imagenes.slice(1, 4);
  const extra  = imagenes.length - 4;

  return (
    <>
      {/* Mosaic grid */}
      <div className={`gallery-mosaic${imagenes.length === 1 ? ' gallery-solo' : ''}`}>
        {/* Main image */}
        <div className="gallery-main" onClick={() => setLightbox(0)} role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setLightbox(0)} aria-label="Abrir galería">
          <Image
            src={src(main.url)}
            alt={main.alt || titulo}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 60vw"
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Thumbnails column */}
        {thumbs.length > 0 && (
          <div className="gallery-thumbs">
            {thumbs.map((img, i) => (
              <div
                key={i}
                className="gallery-thumb"
                onClick={() => setLightbox(i + 1)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setLightbox(i + 1)}
                aria-label={`Foto ${i + 2}`}
              >
                <Image
                  src={src(img.url)}
                  alt={img.alt || `${titulo} ${i + 2}`}
                  fill
                  sizes="40vw"
                  style={{ objectFit: 'cover' }}
                />
                {i === thumbs.length - 1 && extra > 0 && (
                  <div className="gallery-more-overlay">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>+{extra + 1} fotos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* See all button */}
        {imagenes.length > 1 && (
          <button className="gallery-view-all" onClick={() => setLightbox(0)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Ver {imagenes.length} fotos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Galería de imágenes"
        >
          {/* Prev */}
          {imagenes.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              aria-label="Foto anterior"
              style={{
                position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '2rem', padding: '8px 16px', borderRadius: 10,
                cursor: 'pointer', zIndex: 1, lineHeight: 1, fontFamily: 'inherit',
                backdropFilter: 'blur(8px)',
              }}
            >‹</button>
          )}

          {/* Image */}
          <div
            style={{ position: 'relative', width: 'min(92vw, 1100px)', height: 'min(82vh, 720px)' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={src(imagenes[lightbox].url)}
              alt={imagenes[lightbox].alt || titulo}
              fill
              sizes="92vw"
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Next */}
          {imagenes.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              aria-label="Foto siguiente"
              style={{
                position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: '2rem', padding: '8px 16px', borderRadius: 10,
                cursor: 'pointer', zIndex: 1, lineHeight: 1, fontFamily: 'inherit',
                backdropFilter: 'blur(8px)',
              }}
            >›</button>
          )}

          {/* Close */}
          <button
            onClick={close}
            aria-label="Cerrar galería"
            style={{
              position: 'fixed', top: 16, right: 16,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: '1.125rem', padding: '6px 14px', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(8px)',
            }}
          >✕</button>

          {/* Counter */}
          {imagenes.length > 1 && (
            <div style={{
              position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem',
              background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 100,
              backdropFilter: 'blur(6px)',
            }}>
              {lightbox + 1} / {imagenes.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
