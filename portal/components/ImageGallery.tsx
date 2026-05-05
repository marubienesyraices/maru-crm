'use client';

import { useState } from 'react';
import Image from 'next/image';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ImageGallery({ imagenes, titulo }: {
  imagenes: { url: string; alt?: string | null }[];
  titulo: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!imagenes.length) return null;

  const src = (url: string) => url.startsWith('http') ? url : `${API}${url}`;

  const main = imagenes[0];
  const rest = imagenes.slice(1, 5);
  const extra = imagenes.length - 5;

  return (
    <>
      <div className="gallery-grid">
        {/* Main image */}
        <div className="gallery-main" onClick={() => setLightbox(0)}>
          <Image src={src(main.url)} alt={main.alt || titulo} fill sizes="100vw" style={{ objectFit: 'cover' }} />
        </div>
        {/* Thumbnails */}
        {rest.map((img, i) => (
          <div key={i} className="gallery-thumb" onClick={() => setLightbox(i + 1)}>
            <Image src={src(img.url)} alt={img.alt || `${titulo} ${i + 2}`} fill sizes="50vw" style={{ objectFit: 'cover' }} />
            {i === rest.length - 1 && extra > 0 && (
              <div className="gallery-more-overlay">+{extra} fotos</div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((l) => l! > 0 ? l! - 1 : imagenes.length - 1); }}
            style={{ position: 'fixed', left: 24, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '2rem', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', zIndex: 1 }}
          >‹</button>
          <div style={{ position: 'relative', width: 'min(90vw, 1100px)', height: 'min(80vh, 700px)' }} onClick={(e) => e.stopPropagation()}>
            <Image
              src={src(imagenes[lightbox].url)}
              alt={imagenes[lightbox].alt || titulo}
              fill sizes="90vw" style={{ objectFit: 'contain' }}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox((l) => l! < imagenes.length - 1 ? l! + 1 : 0); }}
            style={{ position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '2rem', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', zIndex: 1 }}
          >›</button>
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '1.25rem', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
          >✕</button>
          <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
            {lightbox + 1} / {imagenes.length}
          </div>
        </div>
      )}
    </>
  );
}
