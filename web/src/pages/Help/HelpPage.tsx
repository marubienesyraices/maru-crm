import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import './HelpPage.css';

type PlanTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

interface HelpItem {
  q: string;
  a: string;
  plan?: PlanTier; // minimum plan required; undefined = all plans (FREE)
}

interface Section {
  id: string;
  title: string;
  icon: string;
  minPlan?: PlanTier; // whole section requires this plan
  items: HelpItem[];
}

const PLAN_ORDER: PlanTier[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const PLAN_LABEL: Record<PlanTier, string> = { FREE: 'FREE', BASIC: 'BASIC+', PRO: 'PRO+', ENTERPRISE: 'ENTERPRISE' };

function planIncluded(currentPlan: string | null, required: PlanTier): boolean {
  if (!currentPlan) return true;
  return PLAN_ORDER.indexOf(currentPlan as PlanTier) >= PLAN_ORDER.indexOf(required);
}

function PlanBadge({ plan, currentPlan, className = '' }: { plan: PlanTier; currentPlan?: string | null; className?: string }) {
  const included = planIncluded(currentPlan ?? null, plan);
  return (
    <span
      className={`help-plan-badge help-plan-badge-${plan.toLowerCase()} ${!included ? 'help-plan-badge-locked' : ''} ${className}`}
      title={included ? `Incluido en tu plan ${currentPlan}` : `Requiere plan ${plan} o superior`}
    >
      {!included && <span className="help-plan-lock" aria-hidden="true">🔒 </span>}
      {PLAN_LABEL[plan]}
    </span>
  );
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
      { q: '¿Cómo busco rápidamente propiedades, clientes o trámites?', a: 'Usa Ctrl + K (o Cmd + K en Mac) para abrir la búsqueda global desde cualquier pantalla. Escribe el nombre o código y navega con las flechas del teclado.' },
    ],
  },
  {
    id: 'propiedades',
    title: 'Propiedades',
    icon: '🏠',
    items: [
      { q: '¿Cómo creo una propiedad?', a: 'Ve a Propiedades → botón "Nueva propiedad". Completa el formulario en 3 pasos: datos básicos, ubicación y multimedia. La propiedad se crea en estado BORRADOR hasta que la publiques.' },
      { q: '¿Cómo cambio el estado de una propiedad?', a: 'En el detalle de la propiedad, usa el selector de estado en la parte superior. Los estados siguen un flujo: BORRADOR → DISPONIBLE → RESERVADA / EN_NEGOCIACIÓN → VENDIDA / RENTADA.' },
      { q: '¿Cómo subo fotos?', a: 'En el formulario de propiedad (paso Multimedia), arrastra las imágenes o haz clic en el área de carga. Puedes subir hasta 10 imágenes. La primera se usa como portada. El sistema las comprime a máx. 2000px y agrega marca de agua automáticamente.' },
      { q: '¿Cómo genero el brochure PDF?', a: 'En el detalle de la propiedad, haz clic en "Generar brochure". Se procesará en segundo plano (puedes seguir trabajando) y se descargará automáticamente al terminar.' },
      { q: '¿Cómo obtengo el precio sugerido?', a: 'En el formulario de propiedad, haz clic en "Obtener precio sugerido". El motor analiza propiedades similares en un radio de 5 km usando PostGIS e IDW. Verás un precio con nivel de confianza ALTA/MEDIA/BAJA.' },
      { q: '¿Cómo veo la propiedad en el mapa?', a: 'En el detalle de la propiedad encontrarás una pestaña o sección de mapa interactivo. Al crear la propiedad, puedes marcar la ubicación exacta en el mapa. Los compradores también verán el mapa en el portal público.', plan: 'PRO' },
      { q: '¿Cómo sindico una propiedad al portal público?', a: 'En el detalle de la propiedad, ve al tab "Sindicación". Activa la publicación para que aparezca en el portal público de tu agencia. Puedes personalizar el título y descripción para el portal.', plan: 'PRO' },
      { q: '¿Cómo gestiono documentos de la propiedad?', a: 'En el detalle de la propiedad, usa el tab "Documentos" para subir escrituras, planos, permisos, etc. El sistema te alertará por email cuando un documento esté próximo a vencer o ya haya vencido.' },
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes y Pipeline',
    icon: '👥',
    items: [
      { q: '¿Cómo registro un nuevo cliente?', a: 'Ve a Contactos → "Nuevo cliente". Los clientes también se pueden registrar desde el portal público cuando llenan el formulario de interés en una propiedad.' },
      { q: '¿Cómo registro las preferencias de un cliente?', a: 'En el detalle del cliente, usa la sección "Preferencias" para indicar tipo de inmueble, rango de precio, zonas de interés, número de habitaciones, etc. Esto permite que el sistema detecte automáticamente propiedades que coincidan.' },
      { q: '¿Cómo funciona el sistema de matching?', a: 'Cuando se publica una nueva propiedad, el sistema la compara con las preferencias de todos los clientes activos. Si hay coincidencia, se genera una notificación MATCH_PROPIEDAD para el agente responsable.' },
      { q: '¿Cómo inicio un trámite de venta?', a: 'Desde el detalle del cliente, haz clic en "+ Nuevo Trámite", selecciona la propiedad de interés. El trámite aparecerá en el Pipeline en estado NUEVO.' },
      { q: '¿Cómo avanzo un trámite en el Kanban?', a: 'En la página Pipeline, arrastra la tarjeta del trámite a la columna siguiente. También puedes hacer clic en la tarjeta y usar el selector de estado. Al pasar a EN_NEGOCIACIÓN, la propiedad se reserva automáticamente.' },
      { q: '¿Por qué no puedo mover un trámite a GANADO?', a: 'Solo ADMIN y SENIOR pueden cerrar trámites como Ganados. Si eres JUNIOR, necesitas que tu supervisor lo apruebe.' },
      { q: '¿Qué pasa si un trámite se pierde?', a: 'Un trámite PERDIDO puede reabrirse al estado NUEVO si el cliente vuelve a mostrar interés. En el detalle del trámite usa la opción "Reabrir trámite".' },
    ],
  },
  {
    id: 'agenda',
    title: 'Agenda y visitas',
    icon: '📅',
    items: [
      { q: '¿Cómo agendo una visita?', a: 'Ve a Agenda y haz clic en el día/hora deseado, o desde el detalle de un trámite en el tab "Visitas". El sistema verifica conflictos de horario automáticamente respetando el buffer configurado entre citas.' },
      { q: '¿Cómo descargo el evento al calendario?', a: 'En cualquier visita, haz clic en el ícono de calendario (.ics). El archivo es compatible con Google Calendar, Outlook y Apple Calendar.' },
      { q: '¿Cómo registro el reporte post-visita?', a: 'En la Agenda, las visitas que ya pasaron muestran un botón de portapapeles 📋. Haz clic para registrar: nivel de interés, reacción del cliente y siguiente paso sugerido.' },
      { q: '¿El cliente puede reprogramar la visita?', a: 'Sí. Cuando agendes la visita, el cliente recibe un email con un enlace seguro para confirmar, proponer nueva fecha o cancelar desde el portal público.', plan: 'BASIC' },
      { q: '¿Cómo configuro mis horarios de disponibilidad?', a: 'Ve a "Mi Horario" en el menú principal. Define los días y rangos de hora en que puedes recibir citas. El sistema usará esta disponibilidad para sugerir horarios al agendar visitas.' },
      { q: '¿Cómo gestiono mis tareas pendientes?', a: 'En "Mis Tareas" encontrarás todas las tareas asignadas a ti. Puedes marcarlas como completadas, cambiar prioridad o agregar notas. Las tareas se integran con el pipeline para hacer seguimiento a trámites.' },
    ],
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    icon: '🔔',
    items: [
      { q: '¿Qué tipos de notificaciones existen?', a: 'El sistema genera: MATCH_PROPIEDAD (una propiedad coincide con preferencias de un cliente), VISITA_AGENDADA, LEAD_INACTIVO (trámite sin actividad por más de N días), DOCUMENTO_POR_VENCER, DOCUMENTO_VENCIDO, y PROPIEDAD_ESTANCADA.' },
      { q: '¿Con qué frecuencia se actualizan las notificaciones?', a: 'El contador de notificaciones se actualiza cada 60 segundos. Al abrir el panel, se cargan todas las notificaciones en tiempo real.' },
      { q: '¿Las notificaciones se envían también por email?', a: 'Sí, el sistema envía emails transaccionales a los agentes: recordatorio de visitas próximas, alertas de leads inactivos (diariamente a las 9am) y recordatorios de documentos por vencer (diariamente a las 8am). Los emails incluyen pixel de seguimiento para registrar apertura.', plan: 'BASIC' },
      { q: '¿Cómo funciona el recordatorio de visitas para el cliente?', a: 'El cliente recibe un email automático 24 horas antes de su visita con la dirección y opción de confirmar, reprogramar o cancelar.', plan: 'BASIC' },
    ],
  },
  {
    id: 'bi',
    title: 'Reportes y BI',
    icon: '📊',
    items: [
      { q: '¿Qué muestran los reportes de BI?', a: 'El módulo de Reportes tiene 4 tabs: Resumen (KPIs del período), Agentes (desempeño individual), Top Propiedades (por actividad), y Productividad (llamadas, emails, visitas por agente). Solo visible para ADMIN y SUPER_ADMIN.' },
      { q: '¿Cómo filtro por período?', a: 'Usa el selector de fechas en la parte superior de cada tab. Los datos se cachean 15 minutos. Puedes forzar actualización con el botón de refresh.' },
      { q: '¿Cómo exporto el reporte a Excel?', a: 'En el tab "Agentes", haz clic en "Exportar XLSX". Se descargará un archivo con los datos del período seleccionado.' },
      { q: '¿Qué muestra el Ranking de agentes?', a: 'El Ranking muestra a los agentes ordenados por su desempeño: número de propiedades gestionadas, trámites cerrados, visitas realizadas y tasa de conversión en el período seleccionado.', plan: 'PRO' },
    ],
  },
  {
    id: 'campanas',
    title: 'Campañas de email',
    icon: '✉️',
    minPlan: 'BASIC',
    items: [
      { q: '¿Cómo creo una plantilla de email?', a: 'Ve a Campañas → tab "Plantillas" → "Nueva plantilla". Usa variables dinámicas con la sintaxis {{variable}} (ej: {{nombre}}, {{rol}}). El sistema las detecta automáticamente.', plan: 'BASIC' },
      { q: '¿Cómo envío una campaña?', a: 'Crea la campaña en el tab "Campañas", selecciona la plantilla y el filtro de audiencia por rol. Al hacer clic en "Enviar campaña", se enviará a todos los usuarios que coincidan.', plan: 'BASIC' },
      { q: '¿Puedo ver quién abrió el email?', a: 'Sí. Cada campaña muestra: total enviados, total abiertos, tasa de apertura y fecha del primer clic. Los emails incluyen un pixel de seguimiento de 1×1 píxel que registra la apertura.', plan: 'BASIC' },
      { q: '¿Se pueden enviar campañas a clientes del portal?', a: 'Las campañas internas van dirigidas a usuarios del CRM (agentes, admins). Para comunicarse con clientes del portal, usa los emails automatizados de visitas y seguimiento de trámites.', plan: 'BASIC' },
    ],
  },
  {
    id: 'portal',
    title: 'Portal público',
    icon: '🌐',
    minPlan: 'PRO',
    items: [
      { q: '¿Qué es el portal público?', a: 'El portal es un sitio web público donde tus compradores y arrendatarios pueden buscar propiedades, ver detalles, solicitar visitas y registrarse. Se sincroniza automáticamente con las propiedades que sindiques desde el CRM.', plan: 'PRO' },
      { q: '¿Cómo personalizo el portal?', a: 'Ve a Administración → "Mi Portal". Puedes configurar el nombre de la empresa, logo, colores, información de contacto, y texto de bienvenida. Los cambios se reflejan en tiempo real.', plan: 'PRO' },
      { q: '¿Cómo los clientes solicitan una visita desde el portal?', a: 'El visitante llena el formulario de interés en la propiedad. El sistema crea automáticamente el cliente y el lead en el CRM, y notifica al agente responsable.', plan: 'PRO' },
      { q: '¿Qué es el chatbot del portal?', a: 'El chatbot captura leads de visitantes que interactúan mediante preguntas sobre propiedades. Las respuestas se guardan como leads en el CRM con el tag "chatbot".', plan: 'PRO' },
      { q: '¿Puedo tener el portal en mi propio dominio?', a: 'Sí. El plan PRO incluye opción de sitio con subdominio propio (empresa.gestprop.net). Contacta a soporte para configurar tu dominio personalizado.', plan: 'PRO' },
    ],
  },
  {
    id: 'equipos',
    title: 'Equipos y ranking',
    icon: '🏆',
    minPlan: 'PRO',
    items: [
      { q: '¿Qué muestra la página Ranking?', a: 'El Ranking muestra a todos los agentes de tu empresa ordenados por desempeño: propiedades gestionadas, trámites cerrados, visitas realizadas y tasa de conversión. Visible para todos los roles.', plan: 'PRO' },
      { q: '¿Qué es el Organigrama?', a: 'El Organigrama (en Administración) muestra el árbol jerárquico de agentes de tu empresa: quién reporta a quién, supervisores directos y el equipo completo de cada SENIOR.', plan: 'PRO' },
      { q: '¿Cómo asigno un supervisor a un agente?', a: 'Al crear o editar un usuario (Administración → Usuarios), selecciona el campo "Supervisor" y elige al SENIOR responsable. Un JUNIOR puede tener un único supervisor directo.', plan: 'PRO' },
      { q: '¿Cómo ve el SENIOR a su equipo?', a: 'Un SENIOR ve recursivamente todos sus subordinados y los subordinados de ellos. Puede ver sus clientes, trámites, propiedades y visitas desde sus respectivas secciones.' },
    ],
  },
  {
    id: 'meta',
    title: 'Meta e Integraciones',
    icon: '🔗',
    minPlan: 'ENTERPRISE',
    items: [
      { q: '¿Cómo publico una propiedad en Facebook/Meta?', a: 'Ve a "Publicar en Meta" en el menú de Administración. Conecta tu cuenta de Meta Business y selecciona las propiedades que deseas publicar como anuncios en Facebook e Instagram.', plan: 'ENTERPRISE' },
      { q: '¿Qué integraciones externas están disponibles?', a: 'En el plan ENTERPRISE puedes conectar: Meta Ads (Facebook/Instagram), sistemas CRM externos vía webhook, y servicios de firma digital. Ve a Administración → "Integraciones" para configurarlas.', plan: 'ENTERPRISE' },
      { q: '¿Cómo configuro una integración por webhook?', a: 'En Administración → Integraciones, agrega el endpoint de tu sistema externo. El CRM enviará eventos (nuevo lead, cambio de estado de trámite, etc.) en tiempo real a esa URL.', plan: 'ENTERPRISE' },
      { q: '¿Puedo conectar un CRM externo?', a: 'Sí. A través de las integraciones vía API y webhooks puedes sincronizar leads y propiedades con otros CRM como HubSpot o Salesforce. Consulta la documentación técnica o contacta a soporte.', plan: 'ENTERPRISE' },
    ],
  },
  {
    id: 'auditoria',
    title: 'Auditoría e importación',
    icon: '📋',
    items: [
      { q: '¿Qué registra el log de auditoría?', a: 'El log de Auditoría registra automáticamente todas las acciones de escritura (crear, modificar, eliminar) realizadas por cada usuario: qué acción fue, quién la hizo, cuándo y sobre qué registro. Es inmutable — nadie puede borrar o editar el log.' },
      { q: '¿Cómo filtro el log de auditoría?', a: 'En Administración → Auditoría puedes filtrar por usuario, tipo de acción, módulo afectado y rango de fechas.' },
      { q: '¿Cómo importo datos masivos al sistema?', a: 'Ve a Administración → "Importar datos". Descarga la plantilla Excel, llénala con tus propiedades o contactos y súbela. El sistema validará cada fila y mostrará un reporte de errores antes de confirmar la importación.' },
      { q: '¿Qué formatos soporta la importación?', a: 'Actualmente se soporta Excel (.xlsx) para importación de propiedades y contactos. Asegúrate de usar la plantilla descargada desde el sistema para garantizar el formato correcto.' },
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
      { q: '¿Qué puede hacer cada rol?', a: 'JUNIOR: gestionar sus propios clientes y trámites (no puede cerrar como GANADO). SENIOR: ve y gestiona su equipo completo. ADMIN: acceso completo + BI + Campañas + Reportes + Administración. SUPER_ADMIN: gestión de todas las empresas.' },
      { q: '¿Cómo funciona la jerarquía?', a: 'Los agentes se organizan en árbol con supervisores. Un SENIOR ve recursivamente a todos sus subordinados y los de ellos. El organigrama se puede consultar en Administración → Organigrama.', plan: 'PRO' },
      { q: '¿Qué es la autenticación de dos factores (2FA)?', a: 'El 2FA agrega una segunda capa de seguridad. Al activarlo en Mi Perfil, cada inicio de sesión requerirá un código de 6 dígitos de tu app autenticadora (Google Authenticator, Authy, etc.) además de tu contraseña.' },
      { q: '¿Cómo funciona el bloqueo por inactividad?', a: 'Después de 30 minutos sin actividad, el sistema cierra automáticamente tu sesión por seguridad. El tiempo de inactividad se reinicia con cualquier movimiento de mouse, teclado o scroll.' },
    ],
  },
  {
    id: 'planes',
    title: 'Planes y límites',
    icon: '💎',
    items: [
      { q: '¿Cuántos usuarios puedo tener?', a: 'Depende de tu plan: FREE (1 usuario), BASIC (3 usuarios), PRO (5 usuarios), ENTERPRISE (25 usuarios). El SUPER_ADMIN puede ajustar el límite desde la administración de empresas.' },
      { q: '¿Cuántas propiedades puedo gestionar?', a: 'Depende de tu plan: FREE (5 propiedades), BASIC (25 propiedades), PRO (100 propiedades), ENTERPRISE (500 propiedades).' },
      { q: '¿Cómo sé qué plan tengo activo?', a: 'Tu plan aparece en la barra lateral del menú, debajo del logo. También lo puedes ver en el badge de la esquina superior izquierda del dashboard.' },
      { q: '¿Puedo cambiar de plan?', a: 'Sí. Contacta al soporte de GestProp para cambiar tu plan. Los cambios de plan aplican inmediatamente y afectan las funcionalidades disponibles.' },
    ],
  },
];

// Plan comparison data for the "planes" section table
const PLAN_FEATURES_TABLE = [
  { label: 'Propiedades',            free: '5',  basic: '25',  pro: '100', enterprise: '500' },
  { label: 'Usuarios',               free: '1',  basic: '3',   pro: '5',   enterprise: '25' },
  { label: 'Gestión básica (props, clientes, pipeline, agenda)', free: '✓', basic: '✓', pro: '✓', enterprise: '✓' },
  { label: 'Dashboard y reportes',   free: '✓',  basic: '✓',   pro: '✓',   enterprise: '✓' },
  { label: 'Notificaciones por email', free: '—', basic: '✓',  pro: '✓',   enterprise: '✓' },
  { label: 'Campañas de email',      free: '—',  basic: '✓',   pro: '✓',   enterprise: '✓' },
  { label: 'Mapas en propiedades',   free: '—',  basic: '—',   pro: '✓',   enterprise: '✓' },
  { label: 'Portal público',         free: '—',  basic: '—',   pro: '✓',   enterprise: '✓' },
  { label: 'Sitio web propio',       free: '—',  basic: '—',   pro: '✓',   enterprise: '✓' },
  { label: 'Ranking de agentes',     free: '—',  basic: '—',   pro: '✓',   enterprise: '✓' },
  { label: 'Organigrama',            free: '—',  basic: '—',   pro: '✓',   enterprise: '✓' },
  { label: 'Publicar en Meta/Ads',   free: '—',  basic: '—',   pro: '—',   enterprise: '✓' },
  { label: 'Integraciones externas', free: '—',  basic: '—',   pro: '—',   enterprise: '✓' },
];

function PlansTable({ currentPlan }: { currentPlan: string | null }) {
  const cols: { key: 'free' | 'basic' | 'pro' | 'enterprise'; tier: PlanTier; label: string }[] = [
    { key: 'free',       tier: 'FREE',       label: 'FREE' },
    { key: 'basic',      tier: 'BASIC',      label: 'BASIC' },
    { key: 'pro',        tier: 'PRO',        label: 'PRO' },
    { key: 'enterprise', tier: 'ENTERPRISE', label: 'ENTERPRISE' },
  ];

  return (
    <div className="help-plans-wrapper">
      <p className="help-plans-note">
        {currentPlan
          ? <>Tu plan actual es <strong className={`help-plan-inline help-plan-badge-${currentPlan.toLowerCase()}`}>{currentPlan}</strong>. Las columnas resaltadas indican tu plan y los superiores.</>
          : 'Compara las funcionalidades incluidas en cada plan.'}
      </p>
      <div className="help-plans-table-scroll">
        <table className="help-plans-table">
          <thead>
            <tr>
              <th className="help-plans-th-feature">Funcionalidad</th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={`help-plans-th-plan help-plans-th-${c.key}${currentPlan === c.tier ? ' help-plans-th-current' : ''}`}
                >
                  {c.label}
                  {currentPlan === c.tier && <span className="help-plans-current-label">Tu plan</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES_TABLE.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'help-plans-row-even' : ''}>
                <td className="help-plans-td-feature">{row.label}</td>
                {cols.map((c) => {
                  const val = row[c.key];
                  const isActive = currentPlan ? PLAN_ORDER.indexOf(currentPlan as PlanTier) >= PLAN_ORDER.indexOf(c.tier) : false;
                  return (
                    <td
                      key={c.key}
                      className={`help-plans-td-val${isActive ? ' help-plans-td-active' : ''}${currentPlan === c.tier ? ' help-plans-td-current' : ''}`}
                    >
                      <span className={val === '✓' ? 'help-plans-check' : val === '—' ? 'help-plans-cross' : ''}>
                        {val}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { plan: currentPlan } = useAuthStore();
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

  const isPlanesSection = activeData?.id === 'planes';

  return (
    <div className="help-page">
      <div className="help-header">
        <h1 className="help-title">Centro de ayuda</h1>
        <p className="help-subtitle">
          Guías y preguntas frecuentes sobre GestProp CRM
          {currentPlan && (
            <> — Plan activo: <span className={`help-plan-inline help-plan-badge-${currentPlan.toLowerCase()}`}>{currentPlan}</span></>
          )}
        </p>
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
              <span className="help-nav-label">{sec.title}</span>
              {sec.minPlan && (
                <span className={`help-plan-badge help-plan-badge-${sec.minPlan.toLowerCase()} help-nav-plan-badge`}>
                  {PLAN_LABEL[sec.minPlan]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <main className="help-content" aria-label="Contenido de ayuda">
          {activeData ? (
            <>
              <h2 className="help-section-title">
                <span aria-hidden="true">{activeData.icon}</span>
                {activeData.title}
                {activeData.minPlan && (
                  <PlanBadge plan={activeData.minPlan} currentPlan={currentPlan} className="help-section-plan-badge" />
                )}
              </h2>

              {isPlanesSection ? (
                <>
                  <PlansTable currentPlan={currentPlan} />
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
                            <span className="help-faq-question-text">{item.q}</span>
                            <span className="help-faq-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
                          </button>
                          {isOpen && (
                            <div id={`faq-answer-${key}`} className="help-faq-answer" role="region" aria-label={item.q}>
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="help-faq" role="list">
                  {activeData.items.map((item, idx) => {
                    const key = `${activeData.id}-${idx}`;
                    const isOpen = openItems.has(key);
                    const isLocked = item.plan ? !planIncluded(currentPlan, item.plan) : false;
                    return (
                      <div key={key} className={`help-faq-item${isLocked ? ' help-faq-item-locked' : ''}`} role="listitem">
                        <button
                          className="help-faq-question"
                          onClick={() => toggleItem(key)}
                          aria-expanded={isOpen}
                          aria-controls={`faq-answer-${key}`}
                        >
                          <span className="help-faq-question-text">{item.q}</span>
                          <span className="help-faq-question-meta">
                            {item.plan && (
                              <PlanBadge plan={item.plan} currentPlan={currentPlan} />
                            )}
                            <span className="help-faq-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
                          </span>
                        </button>
                        {isOpen && (
                          <div id={`faq-answer-${key}`} className="help-faq-answer" role="region" aria-label={item.q}>
                            {isLocked && (
                              <p className="help-faq-upgrade-notice">
                                Esta funcionalidad requiere el plan <strong>{item.plan}</strong> o superior.{' '}
                                Contacta al administrador de tu empresa para actualizar el plan.
                              </p>
                            )}
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
              )}
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
