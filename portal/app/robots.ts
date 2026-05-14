import { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maruinmobiliaria.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/verificar' },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
