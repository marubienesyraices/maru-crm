'use client';

import { useEffect, useState } from 'react';

interface POI { name: string; type: string; distance: number }

const CATEGORY_LABELS: Record<string, string> = {
  school: '🏫 Escuelas', hospital: '🏥 Hospitales', supermarket: '🛒 Supermercados',
  pharmacy: '💊 Farmacias', bank: '🏦 Bancos', restaurant: '🍽️ Restaurantes',
};

const AMENITY_FILTER = 'school|hospital|supermarket|pharmacy|bank|restaurant';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyPlaces({ lat, lng }: { lat: number; lng: number }) {
  const [places, setPlaces] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const query = `[out:json][timeout:10];node(around:1200,${lat},${lng})[amenity~"${AMENITY_FILTER}"];out 30;`;
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        const pois: POI[] = (data.elements ?? [])
          .map((el: any) => ({
            name: el.tags?.name ?? el.tags?.amenity ?? 'Lugar cercano',
            type: el.tags?.amenity ?? 'other',
            distance: Math.round(haversine(lat, lng, el.lat, el.lon)),
          }))
          .sort((a: POI, b: POI) => a.distance - b.distance)
          .slice(0, 12);
        setPlaces(pois);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (loading) return <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '8px 0' }}>Cargando lugares cercanos…</div>;
  if (error || places.length === 0) return null;

  // Group by type
  const grouped: Record<string, POI[]> = {};
  for (const p of places) {
    (grouped[p.type] ??= []).push(p);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ margin: '0 0 10px', fontSize: '0.9375rem', fontWeight: 700 }}>Puntos de interés cercanos</h4>
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
            {CATEGORY_LABELS[type] ?? `📍 ${type}`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.slice(0, 4).map((p, i) => (
              <span key={i} style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
                {p.name} <span style={{ color: '#94a3b8' }}>{p.distance < 1000 ? `${p.distance}m` : `${(p.distance / 1000).toFixed(1)}km`}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
