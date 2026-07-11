import { MetadataRoute } from 'next';

// sitemap() corre server-side: usar la URL interna del contenedor `api`.
const API  = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://gestprop.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  try {
    const res = await fetch(`${API}/api/public/propiedades?limit=500`, { cache: 'no-store' });
    if (!res.ok) return statics;
    const { data } = await res.json();
    const propiedades: MetadataRoute.Sitemap = (data as { id: string }[]).map((p) => ({
      url: `${BASE}/propiedades/${p.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
    return [...statics, ...propiedades];
  } catch {
    return statics;
  }
}
