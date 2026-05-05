import type { Metadata } from 'next';
import './globals.css';

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Maru Bienes y Raíces';

export const metadata: Metadata = {
  title:       { default: `${COMPANY} | Propiedades en Guatemala`, template: `%s | ${COMPANY}` },
  description: 'Encuentra la propiedad ideal: casas, apartamentos, locales y terrenos en Guatemala. Asesoría personalizada.',
  openGraph:   { type: 'website', locale: 'es_GT', siteName: COMPANY },
  robots:      { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
