import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ChatbotWidget from '@/components/ChatbotWidget';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

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
      <body className={inter.className}>
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}
