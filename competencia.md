# Análisis Diferenciador — Maru Bienes y Raíces CRM vs. Competencia Local

> **Fecha:** 21 de abril de 2026
> **Mercado analizado:** Guatemala y Centroamérica
> **Plataformas comparadas:** Wasi, EasyBroker, BEX PropTech, Obrien CRM, 2clics, CODE 49, Servir

---

## Resumen Ejecutivo

Tras analizar las 7 plataformas CRM inmobiliarias con presencia en el mercado guatemalteco y centroamericano, se identificaron **12 diferenciadores significativos** de tu sistema. El CRM de Maru Bienes y Raíces destaca especialmente en 3 ejes donde la competencia local es débil o inexistente: **seguridad empresarial avanzada**, **control jerárquico granular** y **gestión legal/documental nativa**.

---

## Matriz Comparativa General

| Funcionalidad | Maru B&R | Wasi | EasyBroker | BEX | Obrien | 2clics | CODE 49 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Multitenancy real (RLS) | ✅ | ⚠️ SaaS | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| 2FA con Google Authenticator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Geocerca + Whitelist IPs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bloqueo progresivo de cuenta | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Auditoría inmutable (log CRUD) | ✅ | ⚠️ Básica | ❌ | ❌ | ❌ | ❌ | ❌ |
| Árbol jerárquico recursivo | ✅ | ❌ | ⚠️ Básica | ❌ | ⚠️ | ❌ | ❌ |
| Visibilidad Upline/Downline | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Máquina de estados de trámites | ✅ | ⚠️ Embudo | ⚠️ Tareas | ✅ | ⚠️ | ❌ | ❌ |
| Concurrencia y bloqueo de ofertas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestión de propietarios (CRUD) | ✅ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ |
| Carta de comisión PDF automática | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| Expediente legal con vencimientos | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| Sugerencia inteligente de precios (PostGIS) | ✅ | ❌ | ⚠️ Manual | ❌ | ❌ | ⚠️ | ❌ |
| Brochure con tracking de apertura | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Portal público con SSR (SEO) | ✅ | ✅ | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| Reporte de visita obligatorio | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ranking anónimo (gamificación) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Publicación en portales externos | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| App móvil / Push | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Búsqueda global federada (Ctrl+K) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Importación masiva con validación | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ |

> **Leyenda:** ✅ = Implementado completo | ⚠️ = Parcial o limitado | ❌ = No disponible

---

## 12 Diferenciadores Clave

### 🔴 DIFERENCIADORES CRÍTICOS (Ningún competidor local lo ofrece)

---

#### 1. Seguridad Perimetral Multicapa (HU-02.01)

**Lo que ofreces tú:** 2FA obligatorio, geocerca por país, whitelist de IPs, bloqueo progresivo (3/6/9 intentos), alertas de acceso sospechoso, política de contraseñas con historial de 5, y límite de 2 sesiones concurrentes.

**Lo que ofrece la competencia:** Ninguna plataforma local (Wasi, EasyBroker, BEX, Obrien, 2clics, CODE 49) ofrece 2FA con app autenticadora. Wasi solo menciona Face ID/Touch ID en la app móvil. Ninguna ofrece geocerca ni bloqueo progresivo.

> **Impacto:** Este es el diferenciador más fuerte. En un mercado donde los datos inmobiliarios son altamente sensibles (información de propietarios, DPIs, montos de comisiones), la seguridad de las plataformas locales es básica. Tu sistema ofrece un nivel de protección comparable a plataformas financieras o bancarias.

---

#### 2. Auditoría Inmutable con JSON Diff (HU-03.01)

**Lo que ofreces tú:** Log inmutable de toda acción CRUD con valor anterior vs. nuevo (JSON diff), filtros por módulo/usuario/fecha, exportación CSV, retención de 12 meses + archivado a almacenamiento frío. Ningún usuario puede eliminar los logs.

**Lo que ofrece la competencia:** Wasi registra interacciones comerciales como "auditoría ligera" pero no es un audit trail técnico. BEX no documenta esta funcionalidad. EasyBroker, Obrien, 2clics y CODE 49 no ofrecen auditoría.

> **Impacto:** Esto es especialmente valioso para inmobiliarias que manejan contratos de exclusividad, comisiones en disputa, o necesitan demostrar trazabilidad ante reguladores o conflictos legales.

---

#### 3. Árbol Jerárquico con Visibilidad Recursiva Upline/Downline (HU-04.01)

**Lo que ofreces tú:** Estructura Admin → Senior → Junior con visibilidad recursiva (un Junior ve su upline completo, un Senior ve y edita todo su downline). Prevención de ciclos, reasignación masiva, organigrama interactivo.

**Lo que ofrece la competencia:** EasyBroker permite roles básicos (Admin/Agente) pero sin jerarquía recursiva ni reglas de visibilidad. Wasi ofrece gestión de equipos plana. BEX no documenta jerarquía de agentes. Ningún competidor ofrece el concepto de Upline/Downline.

> **Impacto:** Las inmobiliarias medianas y grandes de Guatemala operan con equipos en cascada (Gerente → Coordinador → Agente Junior). Ninguna plataforma local modela esta realidad operativa. Tu sistema es el único que refleja fielmente la jerarquía comercial real.

---

#### 4. Control de Concurrencia en Trámites con Bloqueo de Ofertas (HU-07.02)

**Lo que ofreces tú:** Al pasar un trámite a "Negociación", la propiedad se bloquea automáticamente (estado Reservada), los demás trámites se pausan, y solo un Senior puede presentar oferta competitiva. Timeout de 30 días, motivo obligatorio de cancelación.

**Lo que ofrece la competencia:** Wasi y BEX ofrecen embudos de ventas pero sin reglas de concurrencia ni bloqueo automático. EasyBroker ni siquiera tiene embudo visual tipo Kanban. Ningún competidor previene que dos agentes oferten simultáneamente.

> **Impacto:** Este es un dolor real del mercado local: dos agentes de la misma inmobiliaria ofreciendo la misma propiedad a clientes diferentes sin coordinación. Tu sistema elimina este conflicto de raíz.

---

### 🟡 DIFERENCIADORES FUERTES (Uno o dos competidores lo abordan parcialmente)

---

#### 5. Gestión de Propietarios como Entidad Independiente (HU-05.03)

**Lo que ofreces tú:** CRUD completo de propietarios, vinculación 1-a-muchos con propiedades, búsqueda por nombre/DPI/teléfono, permisos restrictivos (solo Admin y Senior ven datos de propietarios).

**Lo que ofrece la competencia:** 2clics maneja "información privada" en la ficha de propiedad pero no tiene un módulo dedicado de propietarios. BEX gestiona expedientes pero enfocado a compradores, no a propietarios-vendedores. Ningún competidor ofrece un módulo de propietarios con RBAC específico.

> **Impacto:** En el modelo de intermediación inmobiliaria guatemalteco, el propietario-vendedor es un actor clave. Tener su información centralizada (con múltiples propiedades vinculadas) es un valor que ninguna plataforma local ofrece.

---

#### 6. Expediente Legal con Alertas de Vencimiento (HU-05.03)

**Lo que ofreces tú:** Carga de documentos tipificados (Escrituras, IUSI, Contrato de Exclusividad), fechas de vencimiento, alertas automáticas 7 días antes, generación de Carta de Comisión PDF con plantilla configurable y variables dinámicas.

**Lo que ofrece la competencia:** BEX tiene gestión documental para compliance (IVE) pero enfocada en desarrolladores, no en corredores. 2clics permite adjuntar archivos pero sin tipificación ni vencimientos. Ningún competidor genera Cartas de Comisión.

> **Impacto:** Los contratos de exclusividad vencidos sin renovar son un problema frecuente en el mercado local. Las alertas automáticas protegen tanto al agente como a la inmobiliaria.

---

#### 7. Sugerencia Inteligente de Precios con PostGIS (HU-05.01)

**Lo que ofreces tú:** Cálculo automático de rango de precio sugerido (percentiles 25-75) basado en propiedades comparables del mismo tipo dentro de un radio de 5km, usando datos propios del CRM.

**Lo que ofrece la competencia:** EasyBroker ofrece "Análisis Comparativo de Mercado" pero es un proceso manual. 2clics tiene un módulo de tasaciones pero basado en input del agente. Ningún competidor usa geolocalización automática para sugerir precios.

> **Impacto:** Esto posiciona a Maru B&R como una herramienta de inteligencia de mercado, no solo un CRM operativo.

---

#### 8. Brochure con Tracking de Apertura (HU-05.04)

**Lo que ofreces tú:** Generación de PDF server-side con plantilla de la empresa, tracking por identificador único, rastreo de aperturas, distribución multicanal (WhatsApp click-to-chat, email, link con tracking).

**Lo que ofrece la competencia:** Obrien y CODE 49 generan fichas de propiedades pero sin tracking. Wasi genera sitio web con propiedades pero no brochures descargables con tracking. Ningún competidor ofrece saber quién abrió el brochure.

---

#### 9. Reporte de Visita Obligatorio Post-Cita (HU-09.02)

**Lo que ofreces tú:** 2 horas después de la visita, el sistema genera una tarea obligatoria con formulario estructurado (interés 1-5, asistencia, comentarios, fotos) y opción de enviar resumen al propietario.

**Lo que ofrece la competencia:** Ninguna plataforma local obliga ni estructura el reporte de visita. Wasi y EasyBroker permiten agendar citas pero el seguimiento posterior es manual y ad-hoc.

> **Impacto:** Los propietarios en Guatemala frecuentemente se quejan de no saber qué pasó en las visitas a su propiedad. Este feature genera confianza y transparencia con el dueño.

---

### 🟢 DIFERENCIADORES DE VALOR AGREGADO

---

#### 10. Ranking Anónimo de Agentes / Gamificación (HU-11.03)

**Lo que ofreces tú:** Ranking donde los agentes ven su posición pero los demás aparecen como "Agente Oculto 1, 2...". Solo el Admin ve los nombres reales.

**Lo que ofrece la competencia:** Ninguna plataforma local ofrece gamificación de rendimiento con privacidad por RBAC.

---

#### 11. Búsqueda Global Federada tipo Comando (HU-13.02)

**Lo que ofreces tú:** Barra de búsqueda con `Ctrl+K` que busca simultáneamente en Propiedades, Clientes, Trámites y Agentes, con resultados agrupados por entidad y debounce de 300ms.

**Lo que ofrece la competencia:** Ninguna plataforma local ofrece búsqueda federada cross-module. Todas requieren navegar módulo por módulo.

---

#### 12. Multitenancy Real con Personalización Visual por Empresa (HU-01.01)

**Lo que ofreces tú:** Cada empresa tiene su logo, paleta de colores (primario, secundario, acento), dominio personalizado opcional, aislamiento de datos con Row-Level Security de PostgreSQL, y planes con límites configurables.

**Lo que ofrece la competencia:** Wasi opera como SaaS multitenant pero sin personalización visual profunda ni RLS explícito. BEX usa RLS pero está enfocado en desarrolladores, no en múltiples inmobiliarias independientes. Ningún otro competidor ofrece verdadero multitenancy.

> **Impacto:** Esto permite a Maru B&R escalar como plataforma SaaS para múltiples inmobiliarias, un modelo de negocio que ningún competidor local ofrece con este nivel de aislamiento y personalización.

---

## Lo que la Competencia SÍ Ofrece y Debes Monitorear

| Funcionalidad del competidor | Quién lo tiene | ¿Lo tienes tú? | Riesgo |
|:---|:---|:---:|:---:|
| IA generativa para descripciones de propiedades | 2clics, Obrien | ❌ | 🟡 Medio |
| Bolsa inmobiliaria / Red de colaboración entre agencias | EasyBroker, Wasi | ❌ | 🟡 Medio |
| Módulo contable (cobros, amortización, mora) | BEX | ❌ | 🟢 Bajo |
| Compliance regulatorio IVE/SIB (Guatemala) | BEX | ❌ | 🟡 Medio |
| Tasaciones profesionales con comparativo | 2clics, EasyBroker | ⚠️ Parcial | 🟢 Bajo |

> [!TIP]
> **Oportunidad a futuro:** La **IA generativa para descripciones** y la **Bolsa inmobiliaria** son funcionalidades que podrían agregarse como módulos opcionales sin impactar la arquitectura actual. El compliance IVE/SIB es relevante si se apunta a captar desarrolladores inmobiliarios grandes en Guatemala.

---

## Conclusión

Tu CRM tiene **12 diferenciadores significativos** frente a la competencia local. Los 4 más impactantes son:

1. **Seguridad bancaria** (2FA + geocerca + bloqueo) → Ningún competidor lo tiene
2. **Jerarquía recursiva Upline/Downline** → Refleja la realidad operativa de equipos comerciales
3. **Control de concurrencia en trámites** → Resuelve el problema #1 de las inmobiliarias con múltiples agentes
4. **Expediente legal con vencimientos** → Protección proactiva del negocio

El principal gap frente a la competencia es la ausencia de **IA generativa** y una **red colaborativa entre agencias**, pero estos son features complementarios que no afectan el core del sistema.
