import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
};

export default function PoliticaPrivacidadPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px', lineHeight: 1.7 }}>
        <h1>Política de Privacidad</h1>
        <p>
          La información que proporcionas en nuestros formularios (nombre, teléfono/WhatsApp,
          correo electrónico y preferencias de compra) se utiliza exclusivamente para que un
          asesor de Maru Bienes Raíces te contacte respecto a las propiedades en las que
          muestres interés.
        </p>
        <p>
          No compartimos tus datos con terceros ni los usamos para fines distintos a este
          contacto comercial.
        </p>
        <p>
          Puedes solicitar la eliminación de tus datos escribiendo a{' '}
          <a href="mailto:mleon@marubienesraices.com">mleon@marubienesraices.com</a> o al
          WhatsApp <a href="https://wa.me/50255325170">+502 5532-5170</a>.
        </p>
      </main>

      <footer className="portal-footer">
        <strong>GestProp</strong><br />
        © {new Date().getFullYear()} GestProp. Todos los derechos reservados.
      </footer>
    </>
  );
}
