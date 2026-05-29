'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FavoriteButtonProps {
  propiedadId: string;
  favoritoIds?: string[]; // pre-loaded server-side if available
  className?: string;
}

export default function FavoriteButton({ propiedadId, favoritoIds, className = '' }: FavoriteButtonProps) {
  const [token, setToken]         = useState<string | null>(null);
  const [isFav, setIsFav]         = useState(false);
  const [loading, setLoading]     = useState(false);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('cliente_token');
    setToken(t);
    if (favoritoIds) {
      setIsFav(favoritoIds.includes(propiedadId));
    }
    setMounted(true);
  }, [propiedadId, favoritoIds]);

  if (!mounted || !token) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const method = isFav ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/public/cliente/favoritos/${propiedadId}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIsFav(!isFav);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`fav-btn ${isFav ? 'fav-btn-active' : ''} ${className}`}
      title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      {isFav ? '♥' : '♡'}
    </button>
  );
}
