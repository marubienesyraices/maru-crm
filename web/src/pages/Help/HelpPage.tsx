import { useState } from 'react';
import './HelpPage.css';

interface Section {
  id: string;
  title: string;
  icon: string;
  items: { q: string; a: string }[];
}

const SECTIONS: Section[] = [
  {
    id: 'inicio',
    title: 'Inicio rápido',
    icon: '🚀',
    items: [
      { q: '¿Cómo ingreso al sistema?', a: 'Ingresa tu email y contraseña en la pantalla de login. Si tu cuenta tiene 2FA activado, necesitarás ingresar el código de tu app autenticadora (Google Authenticator, Authy, etc.) en el segundo paso.' },
      { q: '¿Cómo activo mi cuenta por primera vez?', a: 'Recibirás un email de bienvenida con un enlace de activación. Al hacer clic, podrás establecer tu contraseña. El enlace es válido por 48 horas.' },
      { q: '¿Olvidé mi contraseña, qué hago?', a: 'En la pantalla de login, haz clic en "¿Olvidaste tu contraseña?". Recibirás un email con un enlace válido por 30 minutos para restablecerla.' },
    ],
  },
  {
    id: 'propiedades',
    title: 'Propiedades',
    icon: '🏠',
    items: [
      { q: '¿Cómo creo una propiedad?', a: 'Ve a Propiedades → botón "Nueva propiedad". Completa el formulario en 3 pasos: datos básicos, ubicación y multimedia. La propiedad se crea en estado BORRADOR hasta que la publiques.' },
      { q: '¿Cómo cambio el estado de una propiedad?', a: 'En el detalle de la propiedad, usa el selector de estado en la parte superior. Los estados siguen un flujo: BORRADOR → DISPONIBLE → RESERVADA/EN_NEGOCIACIÓN → VENDIDA/RENTADA.' },
      { q: '¿Cómo subo fotos?', a: 'En el formulario de propiedad (paso Multimedia), arrastra las imágenes o haz clic en el área de carga. Puedes subir hasta 10 imágenes. La primera se usa como portada. El sistema las comprime y agrega marca de agua automáticamente.' },
      { q: '¿Cómo genero el brochure PDF?', a: 'En el detalle de la propiedad, haz clic en "Generar brochure". Se procesará en segundo plano (puedes seguir trabajando) y se descargará automáticamente al terminar.' },
      { q: '¿Cómo obtengo el precio sugerido?', a: 'En el formulario de propiedad, haz clic en "Obtener precio sugerido". El motor analiza propiedades similares en un radio de 5 km usando PostGIS e IDW. Verás un precio con nivel de confianza ALTA/MEDIA/BAJA.' },
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes y Pipeline',
    icon: '👥',
    items: [
      { q: '¿Cómo registro un nuevo cliente?', a: 'Ve a Clientes → "Nuevo cliente". Los clientes también se pueden registrar desde el portal público cuando llenan el formulario de interés en una propiedad.' },
      { q: '¿Cómo inicio un trámite de venta?', a: 'Desde el detalle del cliente, haz clic en "+ Nuevo Trámite", selecciona la propiedad de interés. El trámite aparecerá en el Pipeline en estado NUEVO.' },
      { q: '¿Cómo avanzo un trámite en el Kanban?', a: 'En la página Pipeline, arrastra la tarjeta del trámite a la columna siguiente. También puedes hacer clic en la tarjeta y usar el selector de estado. Al pasar a EN_NEGOCIACIÓN, la propiedad se reserva automáticamente.' },
      { q: '¿Por qué no puedo mover un trámite a GANADO?', a: 'Solo ADMIN y SENIOR pueden cerrar trámites como Ganados. Si eres JUNIOR, necesitas que tu supervisor lo apruebe. Esto es una medida de control de calidad.' },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda y visitas',
    icon: '📅',
    items: [
      { q: '¿Cómo agendo una visita?', a: 'Ve a Agenda y haz clic en el día/hora deseado, o desde el detalle de un trámite en el tab "Visitas". El sistema verifica conflictos de horario automáticamente.' },
      { q: '¿Cómo descargo el evento al calendario?', a: 'En cualquier visita, haz clic en el ícono de calendario (.ics). El archivo es compatible con Google Calendar, Outlook y Apple Calendar.' },
      { q: '¿Cómo registro el reporte post-visita?', a: 'En la Agenda, las visitas que ya pasaron muestran un botón de portapapeles 📋. Haz clic para registrar: nivel de interés, reacción del cliente y siguiente paso sugerido.' },
      { q: '¿El cliente puede reprogramar la visita?', a: 'Sí. Cuando agendes la visita, el cliente recibe un email con un enlace seguro para confirmar, proponer nueva fecha o cancelar desde el portal público.' },
    ],
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    icon: '🔔',
    items: [
      { q: '¿Qué tipos de notificaciones existen?', a: 'El sistema envía: MATCH_PROPIEDAD (hay una propiedad que coincide con las preferencias de un cliente), VISITA_AGENDADA, LEAD_INACTIVO (un trámite lleva más de 21 días sin actividad), DOCUMENTO_POR_VENCER y DOCUMENTO_VENCIDO.' },
      { q: '¿Con qué frecuencia se actualizan las notificaciones?', a: 'El contador de notificaciones se actualiza cada 60 segundos. Al abrir el panel, se cargan todas las notificaciones en tiempo real.' },
    ],
  },
  {
    id: 'bi',
    title: 'Reportes y BI',
    icon: '📊',
    items: [
      { q: '¿Qué muestran los reportes de BI?', a: 'El módulo de BI (Reportes) tiene 4 tabs: Resumen (KPIs del período), Agentes (desempeño individual), Top Propiedades (por actividad), y Productividad (llamadas, emails, visitas por agente).' },
      { q: '¿Cómo filtro por período?', a: 'Usa el selector de fechas en la parte superior de cada tab. Los datos se cachean 15 minutos en Redis. Puedes forzar actualización usando el botón de refresh en los datos.' },
      { q: '¿Cómo exporto el reporte a Excel?', a: 'En el tab "Agentes", haz clic en el botón "Exportar XLSX". Se descargará un archivo con los datos del período seleccionado.' },
    ],
  },
  {
    id: 'campanas',
    title: 'Campañas de email',
    icon: '✉️',
    items: [
      { q: '¿Cómo creo una plantilla de email?', a: 'Ve a Campañas → tab "Plantillas" → "Nueva plantilla". Usa variables dinámicas con la sintaxis {{variable}} (ej: {{nombre}}, {{rol}}). El sistema las detecta automáticamente.' },
      { q: '¿Cómo envío una campaña?', a: 'Crea la campaña en el tab "Campañas", selecciona la plantilla y el filtro de audiencia por rol. Al hacer clic en "Enviar campaña", se enviará a todos los usuarios que coincidan.' },
      { q: '¿Puedo ver quién abrió el email?', a: 'Sí. Cada campaña muestra: total enviados, total abiertos, tasa de apertura. Los emails incluyen un pixel de seguimiento de 1×1 píxel que registra la apertura.' },
    ],
  },
  {
    id: 'atajos',
    title: 'Atajos de teclado',
    icon: '⌨️',
    items: [
      { q: 'Búsqueda global', a: 'Ctrl + K (o Cmd + K en Mac): abre la paleta de búsqueda global para encontrar propiedades, clientes y trámites desde cualquier pantalla.' },
      { q: 'Navegación en búsqueda', a: 'En la búsqueda global: ↑↓ para moverse entre resultados, Enter para ir al resultado seleccionado, Esc para cerrar.' },
      { q: 'Navegar al contenido principal', a: 'Tab desde el inicio de la página y luego Enter: activa el enlace "Saltar al contenido principal" para usuarios de teclado y lectores de pantalla.' },
    ],
  },
  {
    id: 'roles',
    title: 'Roles y permisos',
    icon: '🔐',
    items: [
      { q: '¿Cuáles son los roles disponibles?', a: 'SUPER_ADMIN (acceso total a todas las empresas), ADMIN (acceso total dentro de su empresa), SENIOR (ve su downline jerárquico), JUNIOR (solo ve sus propios clientes y trámites).' },
      { q: '¿Qué puede hacer cada rol?', a: 'JUNIOR: gestionar sus propios clientes y trámites (no puede cerrar como GANADO). SENIOR: ve y gestiona su equipo completo. ADMIN: acceso completo + BI + Campañas + Meta. SUPER_ADMIN: gestión de todas las empresas.' },
      { q: '¿Cómo funciona la jerarquía?', a: 'Los agentes se organizan en árbol con supervisores. Un SENIOR ve recursivamente a todos sus subordinados y los de ellos. El organigrama se puede consultar en Usuarios → Árbol de jerarquía.' },
    ],
  },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filtered = SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((sec) => !search || sec.items.length > 0);

  const activeData = filtered.find((s) => s.id === activeSection) ?? filtered[0];

  return (
    <div className="help-page">
      <div className="help-header">
        <h1 className="help-title">Centro de ayuda</h1>
        <p className="help-subtitle">Guías y preguntas frecuentes sobre GestProp CRM</p>
        <input
          className="help-search"
          type="search"
          placeholder="Buscar en la ayuda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar en el centro de ayuda"
        />
      </div>

      <div className="help-body">
        <nav className="help-nav" aria-label="Secciones de ayuda">
          {filtered.map((sec) => (
            <button
              key={sec.id}
              className={`help-nav-item ${activeSection === sec.id ? 'help-nav-active' : ''}`}
              onClick={() => setActiveSection(sec.id)}
              aria-current={activeSection === sec.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{sec.icon}</span>
              {sec.title}
            </button>
          ))}
        </nav>

        <main className="help-content" aria-label="Contenido de ayuda">
          {activeData ? (
            <>
              <h2 className="help-section-title">
                <span aria-hidden="true">{activeData.icon}</span> {activeData.title}
              </h2>
              <div className="help-faq" role="list">
                {activeData.items.map((item, idx) => {
                  const key = `${activeData.id}-${idx}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div key={key} className="help-faq-item" role="listitem">
                      <button
                        className="help-faq-question"
                        onClick={() => toggleItem(key)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${key}`}
                      >
                        {item.q}
                        <span className="help-faq-chevron" aria-hidden="true">
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </button>
                      {isOpen && (
                        <div
                          id={`faq-answer-${key}`}
                          className="help-faq-answer"
                          role="region"
                          aria-label={item.q}
                        >
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
                {activeData.items.length === 0 && (
                  <p className="help-empty">No hay resultados para "{search}" en esta sección.</p>
                )}
              </div>
            </>
          ) : (
            <p className="help-empty">No hay resultados para "{search}".</p>
          )}

          <div className="help-contact-card">
            <p className="help-contact-title">¿No encontraste lo que buscabas?</p>
            <p className="help-contact-text">
              Reporta un problema o solicita soporte en{' '}
              <a href="https://github.com/marubienesyraices/maru-crm/issues" target="_blank" rel="noopener noreferrer">
                GitHub Issues
              </a>{' '}
              o contacta al administrador de tu empresa.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
