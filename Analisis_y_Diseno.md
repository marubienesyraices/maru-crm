# Proyecto: Análisis y Diseño — GestProp CRM

> **Documento de Análisis y Diseño del Sistema**
> Versión: 1.2
> Fecha de creación: 18 de abril de 2026
> Última actualización: 14 de mayo de 2026

---

## ÍNDICE

1. [Alcance](#1-alcance)
   - 1.1 Registro de Cambios
   - 1.2 Hoja de Revisión
   - 1.3 Introducción
   - 1.4 Propósito
   - 1.5 Alcance
   - 1.6 Definiciones, Acrónimos y Abreviaturas
2. [Diagramas UML — Arquitectura](#2-diagramas-uml--arquitectura)
   - 2.1 Diagrama de Arquitectura del Sistema
   - 2.2 Meta de la Arquitectura
   - 2.3 Restricciones de la Arquitectura
3. [Estudios de Factibilidad](#3-estudios-de-factibilidad)
   - 3.1 Factibilidad Técnica
   - 3.2 Factibilidad Económica (Análisis Costo-Beneficio)
   - 3.3 Factibilidad Operativa
   - 3.4 Plan de Seguimiento y Mantenimiento
4. [UML — Casos de Uso y Diagramas de Interacción](#4-uml--casos-de-uso-y-diagramas-de-interacción)
   - 4.1 Casos de Uso — Análisis y Diagnóstico
   - 4.2 Casos de Uso — Propuesta (Detallados)
   - 4.3 Diagramas de Interacción
   - 4.4 Definición de Preferencias del Cliente
   - 4.5 Acceso al Sistema — Matriz de Permisos por Rol
   - 4.6 Consulta de Información — Portal Público
5. [Diagramas de Secuencia](#5-diagramas-de-secuencia)
   - 5.1 Secuencia de Creación de Cuenta
   - 5.2 Secuencia de Ingreso de Usuario Exitoso
   - 5.3 Secuencia de Ingreso de Usuario Fallido
   - 5.4 Secuencia de Consulta de Información
   - 5.5 Secuencia de Generación de Brochure PDF
   - 5.6 Secuencia de Agendamiento de Visita
   - 5.7 Secuencia de Publicación en Meta API
   - 5.8 Justificación de Decisiones de Análisis

---

# 1. ALCANCE

## 1.1 Registro de Cambios

| Versión | Fecha | Autor | Descripción del Cambio |
|:--------|:------|:------|:-----------------------|
| 1.0 | 18/04/2026 | Equipo de Análisis | Creación inicial del documento de análisis y diseño |
| 1.1 | 21/04/2026 | Equipo de Análisis | Agregados CU-06 a CU-11 (Brochure, Propietarios, Redes Sociales, Importación Masiva, Notificaciones, Búsqueda Global). Agregados diagramas de secuencia: Generación de Brochure, Agendamiento de Visita, Publicación en Meta API. |
| 1.2 | 14/05/2026 | Equipo de Análisis | Alineación con plantilla de proyecto: índice expandido, sección 3.4 Plan de Seguimiento y Mantenimiento añadida, actualización general de contenido. |

## 1.2 Hoja de Revisión

| Versión | Fecha de Revisión | Revisor | Rol | Estado | Observaciones |
|:--------|:-------------------|:--------|:----|:-------|:--------------|
| 1.0 | Pendiente | — | Product Owner | Pendiente | Revisión inicial del documento |
| 1.0 | Pendiente | — | Líder Técnico | Pendiente | Validación de diagramas y arquitectura |
| 1.0 | Pendiente | — | QA Lead | Pendiente | Verificación de criterios de aceptación |

## 1.3 Introducción

El presente documento constituye el análisis y diseño completo del sistema **GestProp CRM** para la gestión inmobiliaria. Este CRM tiene como finalidad automatizar y centralizar todos los procesos de gestión inmobiliaria, incluyendo:

- **Gestión de inventario de propiedades** (registro, multimedia, geolocalización, documentos legales).
- **Gestión de clientes y prospectos** (captación, perfilamiento, embudo de ventas).
- **Seguimiento de interacciones** (correo, WhatsApp, llamadas, notas).
- **Agenda y visitas** (citas, invitaciones, reportes de visita).
- **Automatización de marketing** (campañas, chatbot, redes sociales).
- **Inteligencia de negocios** (reportes, dashboards, métricas, ranking).
- **Integraciones externas** (portales inmobiliarios, firma digital, videollamadas).
- **Portal público web** para clientes finales.
- **Aplicación móvil** con notificaciones push.

El sistema es **multiempresa**, lo que significa que cada organización que utilice la plataforma tendrá datos completamente aislados (usuarios, propiedades, clientes, configuraciones, etc.), permitiendo que múltiples empresas inmobiliarias operen de forma independiente dentro de la misma infraestructura.

## 1.4 Propósito

El propósito de este documento es:

1. **Definir el alcance funcional y técnico** del CRM Inmobiliario.
2. **Documentar los diagramas de arquitectura y UML** que guían el diseño del sistema.
3. **Evaluar la factibilidad** técnica, económica y operativa del proyecto.
4. **Servir como referencia** para los equipos de desarrollo, QA y operaciones durante todas las fases de implementación.
5. **Establecer las bases** para la trazabilidad entre requerimientos, diseño e implementación.

## 1.5 Alcance

### 1.5.1 Alcance Funcional (Dentro del Proyecto)

El sistema CRM cubrirá los siguientes módulos funcionales organizados en 5 fases de desarrollo:

| Fase | Módulos | Semanas |
|:-----|:--------|:--------|
| **Fase 1** | Infraestructura base, autenticación, 2FA, roles/permisos (RBAC), auditoría, estructura multiempresa | S1–S4 |
| **Fase 2** | Gestión de propiedades (CRUD, multimedia, mapas, documentos), gestión de clientes (segmentación, embudo Kanban), portal público web | S5–S10 |
| **Fase 3** | Interacciones (email, WhatsApp, llamadas), tareas recurrentes, citas y visitas, reportes de visita, calendario | S11–S16 |
| **Fase 4** | Automatización de marketing (email, plantillas, campañas en Meta), reportes y BI (dashboards, ranking, sugerencias), motor de precios | S17–S22 |
| **Fase 5** | Integraciones externas (Zillow, MercadoLibre, DocuSign, Zoom), chatbot, aplicación móvil con push, pruebas E2E, despliegue a producción | S23–S30 |

### 1.5.2 Alcance Técnico

- **Arquitectura:** Aplicación web SPA (Single Page Application) con API REST/GraphQL, arquitectura modular por capas.
- **Multitenancy:** Aislamiento de datos por empresa mediante estrategia de `tenant_id` a nivel de base de datos (Row-Level Security en PostgreSQL).
- **Seguridad:** 2FA, RBAC jerárquico, geocerca, rate limiting, auditoría inmutable, encriptación en reposo y tránsito.
- **Escalabilidad:** Infraestructura containerizada (Docker), colas de trabajo asíncronas (BullMQ), caché (Redis), CDN.

### 1.5.3 Fuera de Alcance

- Desarrollo de un ERP financiero/contable completo.
- Módulo de cobranza o facturación fiscal.
- Integración con sistemas bancarios o pasarelas de pago directo.
- Desarrollo de app nativa iOS/Android (se usará React Native / Expo como solución híbrida).

## 1.6 Definiciones, Acrónimos y Abreviaturas

| Término | Definición |
|:--------|:-----------|
| **CRM** | Customer Relationship Management — Sistema de gestión de relaciones con clientes. |
| **2FA** | Two-Factor Authentication — Autenticación de dos factores. |
| **RBAC** | Role-Based Access Control — Control de acceso basado en roles. |
| **SPA** | Single Page Application — Aplicación de una sola página. |
| **API** | Application Programming Interface — Interfaz de programación de aplicaciones. |
| **REST** | Representational State Transfer — Arquitectura de servicios web. |
| **JWT** | JSON Web Token — Token de autenticación. |
| **ORM** | Object-Relational Mapping — Mapeo objeto-relacional. |
| **CI/CD** | Continuous Integration / Continuous Deployment — Integración y despliegue continuo. |
| **CDN** | Content Delivery Network — Red de distribución de contenido. |
| **BI** | Business Intelligence — Inteligencia de negocios. |
| **UML** | Unified Modeling Language — Lenguaje unificado de modelado. |
| **FK** | Foreign Key — Clave foránea. |
| **UUID** | Universally Unique Identifier — Identificador único universal. |
| **Upline** | Línea jerárquica ascendente (supervisores hacia arriba). |
| **Downline** | Línea jerárquica descendente (subordinados hacia abajo). |
| **Lead** | Prospecto o cliente potencial que muestra interés en una propiedad. |
| **Trámite** | Proceso de venta/renta que une un Cliente + Agente + Propiedad (Deal). |
| **Brochure** | Material de venta en formato PDF con la información comercial de una propiedad. |
| **Multitenancy** | Arquitectura que permite a múltiples organizaciones usar la misma instancia del sistema con datos aislados. |
| **Tenant** | Empresa u organización dentro del sistema multiempresa. |
| **Kanban** | Metodología visual de gestión de flujos de trabajo. |
| **Meta API** | API de Meta/Facebook para publicación de contenido en redes sociales. |
| **Geocerca** | Restricción geográfica de acceso basada en ubicación IP. |
| **Round Robin** | Algoritmo de distribución equitativa de carga entre agentes. |

---

# 2. DIAGRAMAS UML — ARQUITECTURA

## 2.1 Diagrama de Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   CAPA DE PRESENTACIÓN                              │
│                                                                                     │
│  ┌────────────────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │    FRONTEND WEB (React+Vite)   │    │         APP MÓVIL (React Native)         │  │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ │    │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │  │
│  │  │ Auth │ │Props │ │Clients │ │    │  │Dashboard │ │Notific.  │ │ Agenda  │  │  │
│  │  ├──────┤ ├──────┤ ├────────┤ │    │  └──────────┘ └──────────┘ └─────────┘  │  │
│  │  │Agenda│ │Repor.│ │Automat.│ │    │                                          │  │
│  │  └──────┘ └──────┘ └────────┘ │    └──────────────────────────────────────────┘  │
│  │  TanStack Query | Zustand     │                                                  │
│  └───────────────┬────────────────┘                                                  │
│                  │ HTTPS / WebSocket (WSS)                                           │
└──────────────────┼──────────────────────────────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────────────────────────────────────────┐
│                  │             CAPA DE SERVICIOS (API Gateway)                       │
│                  ▼                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────┐   │
│  │                      BACKEND (NestJS / Node.js + Express)                     │   │
│  │                                                                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │  Auth Module │  │ Properties  │  │   Clients    │  │  Interactions     │   │   │
│  │  │  (JWT+2FA)   │  │   Module    │  │   Module     │  │    Module         │   │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │ Appointments│  │  Campaigns  │  │   Reports    │  │  Integrations     │   │   │
│  │  │   Module    │  │   Module    │  │   Module     │  │    Module         │   │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │   Audit     │  │  Tenants    │  │  WebSockets  │  │    Workers        │   │   │
│  │  │   Module    │  │ (Multi-Emp.)│  │  (Socket.io) │  │   (BullMQ)        │   │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────────────────────────────────────────┐
│                  │                  CAPA DE DATOS Y SERVICIOS                        │
│                  ▼                                                                   │
│  ┌──────────────────┐  ┌───────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   PostgreSQL      │  │   Redis   │  │  S3 / R2     │  │   SendGrid / SMTP     │  │
│  │  (+ PostGIS)      │  │  (Caché)  │  │ (Archivos)   │  │   (Email)             │  │
│  │  Prisma ORM       │  │  Sessions │  │ Multimedia   │  │   Campañas            │  │
│  │  Row-Level Sec.   │  │  Queues   │  │ Documentos   │  │   Transaccional       │  │
│  └──────────────────┘  └───────────┘  └──────────────┘  └────────────────────────┘  │
│                                                                                     │
│  ┌──────────────────┐  ┌───────────────────────────┐  ┌──────────────────────────┐  │
│  │ Firebase / APNs   │  │   Meta Graph API          │  │  DocuSign / Adobe Sign  │  │
│  │ (Push Notif.)     │  │   (Redes Sociales)        │  │  (Firma Digital)        │  │
│  └──────────────────┘  └───────────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                   │
┌──────────────────┼──────────────────────────────────────────────────────────────────┐
│                  │                  CAPA DE INFRAESTRUCTURA                          │
│                  ▼                                                                   │
│  ┌──────────────────┐  ┌───────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Docker          │  │  GitHub   │  │  Cloudflare  │  │  Sentry / Datadog     │  │
│  │   Containers      │  │  Actions  │  │  CDN + DNS   │  │  Monitoreo            │  │
│  │   AWS ECS/EC2     │  │  CI/CD    │  │  WAF         │  │  Logs (Winston)       │  │
│  └──────────────────┘  └───────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Meta de la Arquitectura

La arquitectura del CRM Inmobiliario se diseña con las siguientes metas fundamentales:

### 2.2.1 Escalabilidad Horizontal y Vertical
- **Microservicios modulares:** Cada módulo funcional (Auth, Properties, Clients, etc.) es independiente y puede escalar por separado.
- **Colas de trabajo asíncronas (BullMQ + Redis):** Las tareas pesadas (envío de emails, generación de PDFs, sincronización con APIs externas) se procesan en workers dedicados, sin bloquear la API principal.
- **Base de datos optimizada:** PostgreSQL con índices estratégicos, vistas materializadas para reportes y PostGIS para consultas geoespaciales.

### 2.2.2 Seguridad en Profundidad (Defense in Depth)
- **Capa perimetral:** Cloudflare WAF, rate limiting, geocerca.
- **Capa de aplicación:** JWT con refresh tokens, 2FA obligatorio, RBAC jerárquico con validación en cada request.
- **Capa de datos:** Row-Level Security (RLS) en PostgreSQL para multitenancy, encriptación AES-256 en reposo, auditoría inmutable.

### 2.2.3 Multitenancy Nativa
- Cada empresa (tenant) opera con datos completamente aislados.
- Se utiliza un campo `tenant_id` en todas las tablas principales con políticas RLS que garantizan que un usuario solo pueda acceder a datos de su empresa.

### 2.2.4 Experiencia de Usuario Premium
- Interfaz moderna con React 18+, animaciones fluidas, diseño responsive.
- Actualizaciones en tiempo real mediante WebSockets (Socket.io).
- App móvil con notificaciones push para productividad en campo.

## 2.3 Restricciones de la Arquitectura

| Restricción | Descripción | Impacto |
|:------------|:------------|:--------|
| **Compatibilidad de navegadores** | Se soportarán Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ | Limita el uso de APIs de navegador experimentales |
| **Límites de APIs externas** | Meta Graph API, DocuSign, Zoom tienen rate limits y cuotas | Requiere implementar colas con reintentos y caché |
| **Tamaño de archivos multimedia** | Se limita a 50 MB por archivo (imágenes) y 500 MB por video | Requiere compresión automática del lado del servidor |
| **Latencia geográfica** | Servidores en una región (US East / Centroamérica) | Uso obligatorio de CDN para assets estáticos |
| **Presupuesto de infraestructura** | Se busca optimizar costos con servicios administrados | Se priorizan servicios como Vercel/Railway sobre infraestructura propia |
| **Regulaciones de datos (GDPR/local)** | Datos sensibles de clientes y propietarios | Encriptación obligatoria, políticas de retención, consentimiento explícito |
| **Dependencia de terceros** | Integraciones con Meta, DocuSign, Zoom, SendGrid | Se requieren fallbacks y manejo de indisponibilidad |

---

# 3. ESTUDIOS DE FACTIBILIDAD

## 3.1 Factibilidad Técnica

### 3.1.1 Evaluación de Tecnologías

| Componente | Tecnología Propuesta | Madurez | Comunidad | Soporte LTS | Evaluación |
|:-----------|:---------------------|:--------|:----------|:------------|:-----------|
| Frontend | React 18+ con Vite | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| Backend | NestJS / Node.js | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |
| Base de datos | PostgreSQL + PostGIS | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| ORM | Prisma | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |
| Caché | Redis | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| Almacenamiento | AWS S3 / Cloudflare R2 | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| Tiempo real | Socket.io | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |
| App Móvil | React Native + Expo | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |

### 3.1.2 Capacidades del Equipo

| Requisito Técnico | Disponibilidad | Observación |
|:-------------------|:--------------|:------------|
| Desarrollo frontend (React/TypeScript) | ✅ Disponible | Stack moderno y ampliamente conocido |
| Desarrollo backend (Node.js/NestJS) | ✅ Disponible | Ecosistema JavaScript unificado |
| Administración de PostgreSQL | ✅ Disponible | Experiencia en bases de datos relacionales |
| DevOps (Docker, CI/CD) | ✅ Disponible | Configuración estándar con GitHub Actions |
| Integraciones API (Meta, DocuSign, etc.) | ⚠️ Parcial | Requiere investigación de APIs específicas |

### 3.1.3 Conclusión de Factibilidad Técnica

> **El proyecto es TÉCNICAMENTE VIABLE.** El stack tecnológico propuesto es maduro, bien documentado y ampliamente utilizado en la industria. Las tecnologías seleccionadas tienen comunidades activas, soporte a largo plazo y permiten la construcción del sistema con los requerimientos definidos.

---

## 3.2 Factibilidad Económica

### 3.2.1 Análisis Costo-Beneficio

#### Costos Generales (Actual vs. Propuesto)

**Situación Actual (Proceso Manual)**

| Concepto | Costo Mensual Estimado | Costo Anual |
|:---------|:----------------------|:------------|
| Tiempo de agentes en tareas manuales (Excel, email, redes sociales por separado) | $2,500 USD | $30,000 USD |
| Pérdida de leads por falta de seguimiento | $1,500 USD | $18,000 USD |
| Publicación manual en portales inmobiliarios | $500 USD | $6,000 USD |
| Generación manual de brochures y documentos | $300 USD | $3,600 USD |
| Coordinación de citas por teléfono/WhatsApp | $200 USD | $2,400 USD |
| **Total situación actual** | **$5,000 USD** | **$60,000 USD** |

**Situación Propuesta (CRM Implementado)**

| Concepto | Costo Mensual Estimado | Costo Anual |
|:---------|:----------------------|:------------|
| Infraestructura cloud (hosting, BD, S3, CDN) | $150–$400 USD | $1,800–$4,800 USD |
| Servicios de terceros (SendGrid, etc.) | $50–$150 USD | $600–$1,800 USD |
| Mantenimiento y soporte | $500–$1,000 USD | $6,000–$12,000 USD |
| **Total situación propuesta** | **$700–$1,550 USD** | **$8,400–$18,600 USD** |

**Inversión Inicial de Desarrollo**

| Fase | Duración | Costo Estimado (2-3 devs) |
|:-----|:---------|:---------------------------|
| Fase 1 — Fundamentos y Seguridad | 4 semanas | $8,000–$12,000 USD |
| Fase 2 — Propiedades y Clientes | 6 semanas | $12,000–$18,000 USD |
| Fase 3 — Interacciones, Tareas y Citas | 6 semanas | $12,000–$18,000 USD |
| Fase 4 — Automatización y Reportes | 6 semanas | $12,000–$18,000 USD |
| Fase 5 — Integraciones y App Móvil | 8 semanas | $16,000–$24,000 USD |
| **Total inversión inicial** | **30 semanas** | **$60,000–$90,000 USD** |

#### Resumen Costo-Beneficio

| Indicador | Valor |
|:----------|:------|
| Ahorro operativo anual | $41,400–$51,600 USD |
| Inversión inicial | $60,000–$90,000 USD |
| Periodo de retorno (ROI) | **14–26 meses** |
| Incremento proyectado de conversión de leads | +30–50% |
| Reducción de tiempo administrativo por agente | -60% |

---

### 3.2.2 Beneficios Tangibles

| # | Beneficio | Métrica | Impacto Estimado |
|:--|:----------|:--------|:-----------------|
| 1 | **Reducción de tiempos administrativos** | Horas/agente/semana dedicadas a tareas manuales | -60% (de ~15 hrs a ~6 hrs) |
| 2 | **Incremento de captación de leads** | Número de leads capturados vs. proceso manual | +30–50% |
| 3 | **Mayor tasa de cierre** | Conversión del embudo de ventas | +15–25% |
| 4 | **Reducción de errores** | Propiedades sin actualizar, documentos perdidos | -80% |
| 5 | **Ahorro en herramientas dispersas** | Licencias de software fragmentadas (Excel, CRM básicos) | -$200/mes |
| 6 | **Velocidad de respuesta al cliente** | Tiempo desde el primer contacto hasta la primera respuesta | De 24hrs a < 1hr |
| 7 | **Generación automática de materiales** | Brochures, cartas de comisión | Ahorro de ~3 hrs/semana |

### 3.2.3 Beneficios Intangibles

| # | Beneficio | Descripción |
|:--|:----------|:------------|
| 1 | **Imagen profesional** | Un CRM moderno proyecta confianza y seriedad ante propietarios y clientes. |
| 2 | **Toma de decisiones informada** | Dashboards y reportes BI permiten decisiones basadas en datos reales, no en intuición. |
| 3 | **Satisfacción del agente** | Menos tareas manuales repetitivas y herramientas intuitivas aumentan la motivación del equipo. |
| 4 | **Escalabilidad del negocio** | La plataforma multiempresa permite crecer sin reconstruir el sistema. |
| 5 | **Ventaja competitiva** | Automatización de marketing, chatbot y portal público diferencian a la empresa del mercado. |
| 6 | **Trazabilidad legal** | Auditoría inmutable y expediente digital de propiedades reducen riesgos legales. |
| 7 | **Fidelización de clientes** | El portal web y las notificaciones mantienen al cliente informado y comprometido. |

---

## 3.3 Factibilidad Operativa

### 3.3.1 Evaluación de Impacto Organizacional

| Factor | Evaluación | Estrategia de Mitigación |
|:-------|:-----------|:-------------------------|
| **Adopción por usuarios** | ⚠️ Riesgo medio — Resistencia al cambio por parte de agentes acostumbrados a procesos manuales | Capacitación progresiva por fases. Implementar primero módulos de mayor beneficio (propiedades, clientes). |
| **Curva de aprendizaje** | ⚠️ Riesgo medio — Interfaz completa puede ser abrumadora | UX intuitiva, tooltips, guías in-app, manual de usuario por módulo. |
| **Disponibilidad del sistema** | ✅ Riesgo bajo — Infraestructura cloud con 99.5% uptime | Monitoreo con Sentry/Datadog, alertas automáticas, plan de contingencia. |
| **Migración de datos** | ⚠️ Riesgo medio — Datos actuales en Excel/hojas sueltas | Scripts de migración, validación de datos, periodo de transición con ambos sistemas. |
| **Soporte post-lanzamiento** | ✅ Riesgo bajo | Equipo de soporte técnico, canal de tickets, documentación completa. |

### 3.3.2 Validación en Puesta en Producción

| Actividad | Descripción | Responsable | Duración Estimada |
|:----------|:------------|:------------|:------------------|
| **QA — Pruebas de aceptación (UAT)** | Agentes y administrador validan los flujos críticos: login 2FA, registro de propiedad, embudo de ventas, generación de brochure. | QA Lead + Product Owner | 2 semanas |
| **Pruebas de carga** | Simulación de 100 usuarios concurrentes (k6 o Artillery) en endpoints críticos. Objetivo: p95 < 500ms. | Equipo técnico | 3 días |
| **Pruebas de seguridad** | Revisión de OWASP Top 10: inyección SQL, XSS, CSRF, autenticación rota. Auditoría de permisos RBAC. | Técnico senior | 3 días |
| **Migración de datos piloto** | Importar datos reales del cliente desde Excel/Google Sheets usando el módulo de importación masiva. Validación de integridad. | Administrador + Dev | 1 semana |
| **Capacitación de usuarios** | Sesiones de entrenamiento por rol: Administrador, Agentes Senior, Agentes Junior. Manual de usuario en PDF. | Product Owner | 1 semana |
| **Despliegue a producción (Go-Live)** | Configuración final en AWS/Railway, DNS, SSL, variables de entorno. Monitoreo 24/48h post-lanzamiento. | DevOps | 2 días |

### 3.3.3 Conclusión de Factibilidad Operativa

> **El proyecto es OPERATIVAMENTE VIABLE.** Si bien se identifican riesgos de adopción, estos pueden mitigarse con una estrategia de implementación por fases, capacitación adecuada y una interfaz de usuario diseñada con enfoque en simplicidad y eficiencia.

---

## 3.4 Plan de Seguimiento y Mantenimiento

### 3.4.1 Programación de Mantenimiento

| Tipo de Mantenimiento | Frecuencia | Ventana Sugerida | Responsable |
|:----------------------|:-----------|:-----------------|:------------|
| **Mantenimiento Correctivo** | Según incidencias (SLA: crítico < 4h, alto < 24h, medio < 72h) | Cualquier momento — bajo coordinación con el cliente | Equipo de Soporte |
| **Mantenimiento Preventivo** | Mensual | 1er domingo de cada mes, 22:00 – 02:00 GMT-6 | DevOps |
| **Actualización de dependencias** | Trimestral | Mes 1 de cada trimestre (Enero, Abril, Julio, Octubre) | Equipo Técnico |
| **Revisión de seguridad (parches)** | Mensual o ante CVE crítico | Aplicación inmediata ante vulnerabilidad crítica | Técnico Senior |
| **Backup y verificación de restauración** | Semanal (backup automático diario, verificación manual semanal) | Cada domingo a las 03:00 GMT-6 | DevOps |
| **Revisión de rendimiento y costos cloud** | Trimestral | Junto con la actualización de dependencias | DevOps + PM |
| **Revisión de logs de auditoría y archivado** | Mensual (archivado a cold storage al cumplir 12 meses) | Último día de cada mes | DevOps |

### 3.4.2 Tipos de Mantenimiento

#### Mantenimiento Correctivo
Atención y resolución de errores o fallas detectadas post-lanzamiento. Se clasifica por severidad:

| Severidad | Descripción | Tiempo de Respuesta | Tiempo de Resolución |
|:----------|:------------|:--------------------|:---------------------|
| 🔴 **Crítica** | Sistema caído, pérdida de datos, falla de autenticación, fuga de datos. | < 15 minutos | < 4 horas |
| 🟠 **Alta** | Módulo principal inaccesible (propiedades, trámites), error en generación de brochure o integración Meta. | < 1 hora | < 24 horas |
| 🟡 **Media** | Funcionalidad secundaria con errores, reportes incorrectos, errores de UI no bloqueantes. | < 4 horas | < 72 horas |
| 🟢 **Baja** | Ajustes visuales, mejoras menores, errores ortográficos en la interfaz. | < 24 horas | < 1 semana |

#### Mantenimiento Preventivo
Actividades planificadas para evitar fallas futuras:
- Actualización del sistema operativo de los contenedores Docker.
- Rotación de secretos y tokens de API (Meta, SendGrid, DocuSign).
- Revisión y limpieza de jobs fallidos en BullMQ.
- Análisis de índices de PostgreSQL y VACUUM/ANALYZE.
- Revisión de alertas de Sentry/Datadog del mes anterior.

#### Mantenimiento Evolutivo
Mejoras y nuevas funcionalidades planificadas según retroalimentación del cliente:
- Incorporación de nuevas historias de usuario priorizadas en el backlog.
- Optimizaciones de rendimiento basadas en métricas reales de uso.
- Integraciones adicionales con portales o servicios externos.

#### Mantenimiento Adaptativo
Ajustes requeridos por cambios en el entorno externo:
- Cambios en la API de Meta/Facebook que requieran actualización.
- Actualizaciones mayores de Node.js, React, Prisma u otras dependencias core.
- Cambios en regulaciones de privacidad de datos aplicables.

### 3.4.3 Costo Asociado al Mantenimiento

| Concepto | Frecuencia | Costo Estimado Mensual |
|:---------|:-----------|:-----------------------|
| **Infraestructura cloud** (hosting, BD, S3, CDN, Redis) | Continuo | $150–$400 USD |
| **Servicios de terceros** (SendGrid, Mapbox/Google Maps API, Meta API) | Continuo | $50–$200 USD |
| **Soporte técnico y mantenimiento correctivo** (SLA básico) | Mensual | $500–$800 USD |
| **Mantenimiento preventivo y evolutivo** (horas de desarrollo) | Mensual | $300–$600 USD |
| **Monitoreo y seguridad** (Sentry, alertas, backups verificados) | Continuo | $30–$100 USD |
| **Total estimado mensual** | | **$1,030–$2,100 USD** |

> **Nota:** Los costos de mantenimiento evolutivo (nuevas funcionalidades) se cotizan por separado según el alcance de cada requerimiento. Se recomienda establecer un contrato de mantenimiento con un banco de horas mensual (8–16 horas) para cubrir mejoras menores y soporte proactivo.

### 3.4.4 Indicadores de Calidad del Servicio (SLA)

| Indicador | Objetivo | Medición |
|:----------|:---------|:---------|
| **Disponibilidad (Uptime)** | ≥ 99.5% mensual | Monitoreo con Datadog/UptimeRobot |
| **Tiempo de respuesta API (p95)** | < 500ms | Sentry Performance |
| **Tiempo de carga del portal público** | < 2 segundos (LCP) | Google Lighthouse / Core Web Vitals |
| **Tasa de errores 5xx** | < 0.1% de requests | Datadog Logs |
| **Tiempo de resolución crítica** | < 4 horas | Registro de incidencias |
| **Frecuencia de backups verificados** | 100% semanal | Script automatizado con alerta de fallo |

---

# 4. UML — CASOS DE USO Y DIAGRAMAS DE INTERACCIÓN

## 4.1 Casos de Uso — Análisis y Diagnóstico

### 4.1.1 Actores del Sistema

| Actor | Tipo | Descripción |
|:------|:-----|:------------|
| **Administrador** | Primario | Gestiona la configuración del sistema, usuarios, roles, seguridad y tiene acceso completo a todos los módulos y datos. |
| **Agente Senior** | Primario | Gestiona propiedades, clientes y trámites. Supervisa agentes Junior y otros agentes Senior en su rama jerárquica. Acceso a su downline completo. |
| **Agente Junior** | Primario | Gestiona solo las propiedades y trámites que le son asignados. Puede ver las propiedades de su upline. No tiene subordinados. |
| **Cliente** | Primario | Navega el portal público, consulta propiedades, crea cuenta, guarda preferencias, inicia trámites de compra/renta. |
| **Sistema (Cronógrafos)** | Secundario | Procesos automáticos que ejecutan tareas programadas: recordatorios, alertas de inactividad, sincronizaciones. |
| **Servicios Externos** | Secundario | APIs externas: Meta (Facebook/Instagram), DocuSign, Zoom, SendGrid, portales inmobiliarios. |

### 4.1.2 Diagrama General de Casos de Uso

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CRM INMOBILIARIO                                       │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────┐                        │
│  │         MÓDULO DE SEGURIDAD Y AUTENTICACIÓN             │                        │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │                        │
│  │  │  Iniciar Sesión   │  │ Configurar 2FA       │        │     ┌──────────┐       │
│  │  │  (Login + 2FA)    │  │                      │        │     │          │       │
│  │  └───────────────────┘  └──────────────────────┘        │◄────│  Admin   │       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │     │          │       │
│  │  │ Gestionar Roles   │  │ Configurar Geocerca  │        │     └──────────┘       │
│  │  │ y Permisos        │  │ e IPs                │        │                        │
│  │  └───────────────────┘  └──────────────────────┘        │                        │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │                        │
│  │  │ Consultar Registro│  │ Gestionar Usuarios   │        │                        │
│  │  │  de Auditoría     │  │ y Jerarquías         │        │                        │
│  │  └───────────────────┘  └──────────────────────┘        │                        │
│  └─────────────────────────────────────────────────────────┘                        │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────┐                        │
│  │            MÓDULO DE GESTIÓN DE PROPIEDADES              │     ┌──────────┐       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │     │  Agente  │       │
│  │  │ Registrar / Editar│  │ Cargar Multimedia    │        │◄────│  Senior  │       │
│  │  │ Propiedad         │  │ (Fotos, Videos)      │        │     │          │       │
│  │  └───────────────────┘  └──────────────────────┘        │     └──────────┘       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │                        │
│  │  │ Gestionar Docs    │  │ Generar Brochure/    │        │     ┌──────────┐       │
│  │  │ Legales           │  │ Carta Comisión       │        │◄────│  Agente  │       │
│  │  └───────────────────┘  └──────────────────────┘        │     │  Junior  │       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │     └──────────┘       │
│  │  │ Ubicar en Mapa    │  │ Publicar en Redes    │        │                        │
│  │  │ (Geolocalización) │  │ Sociales / Portales  │        │                        │
│  │  └───────────────────┘  └──────────────────────┘        │                        │
│  └─────────────────────────────────────────────────────────┘                        │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────┐                        │
│  │          MÓDULO DE CLIENTES Y EMBUDO DE VENTAS           │     ┌──────────┐       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │     │          │       │
│  │  │ Crear Cuenta /    │  │ Buscar / Filtrar     │        │◄────│ Cliente  │       │
│  │  │ Registrarse       │  │ Propiedades          │        │     │          │       │
│  │  └───────────────────┘  └──────────────────────┘        │     └──────────┘       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │                        │
│  │  │ Iniciar Trámite   │  │ Gestionar Embudo     │        │                        │
│  │  │ (Compra/Renta)    │  │ de Ventas (Kanban)   │        │                        │
│  │  └───────────────────┘  └──────────────────────┘        │                        │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │                        │
│  │  │ Segmentar Clientes│  │ Guardar Preferencias │        │                        │
│  │  │ por Perfil        │  │ de Búsqueda          │        │                        │
│  │  └───────────────────┘  └──────────────────────┘        │                        │
│  └─────────────────────────────────────────────────────────┘                        │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────┐                        │
│  │            MÓDULO DE INTERACCIONES Y AGENDA              │     ┌──────────┐       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │     │ Sistema  │       │
│  │  │ Registrar         │  │ Programar Tareas     │        │◄────│ (Cron)   │       │
│  │  │ Interacciones     │  │ Recurrentes          │        │     │          │       │
│  │  └───────────────────┘  └──────────────────────┘        │     └──────────┘       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │                        │
│  │  │ Agendar Visita    │  │ Reprogramar Cita     │        │     ┌──────────┐       │
│  │  │ (Calendario)      │  │ (Portal Cliente)     │        │◄────│ Servicios│       │
│  │  └───────────────────┘  └──────────────────────┘        │     │ Externos │       │
│  │  ┌───────────────────┐  ┌──────────────────────┐        │     └──────────┘       │
│  │  │ Completar Reporte │  │ Generar Reportes     │        │                        │
│  │  │ de Visita         │  │ BI / Dashboard       │        │                        │
│  │  └───────────────────┘  └──────────────────────┘        │                        │
│  └─────────────────────────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.2 Casos de Uso — Propuesta (Detallados)

### CU-01: Iniciar Sesión con 2FA

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-01 |
| **Nombre** | Iniciar Sesión con Autenticación de Dos Factores |
| **Actor primario** | Administrador, Agente Senior, Agente Junior |
| **Precondiciones** | El usuario tiene una cuenta activa con 2FA configurado |
| **Postcondiciones** | El usuario accede al dashboard del CRM correspondiente a su rol y empresa |
| **Flujo principal** | 1. El usuario accede a la página de login. <br> 2. Ingresa correo electrónico y contraseña. <br> 3. El sistema valida las credenciales. <br> 4. El sistema solicita el token 2FA de 6 dígitos. <br> 5. El usuario ingresa el token desde su app autenticadora. <br> 6. El sistema valida el token. <br> 7. El sistema verifica la IP y geolocalización del usuario. <br> 8. El sistema genera JWT (access + refresh token). <br> 9. El usuario es redirigido al dashboard. |
| **Flujos alternativos** | **FA1:** Credenciales inválidas → Se incrementa el contador de intentos fallidos. Se muestra mensaje de error. <br> **FA2:** Token 2FA inválido → Se solicita nuevamente (máximo 3 intentos). <br> **FA3:** IP/Ubicación bloqueada → Se deniega acceso y se registra alerta. |
| **Flujos de excepción** | **FE1:** 3 intentos fallidos consecutivos → La cuenta se bloquea temporalmente. Se envía email de alerta al usuario. <br> **FE2:** Acceso desde dispositivo/ubicación nueva → Se envía email de notificación. |

### CU-02: Registrar Propiedad

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-02 |
| **Nombre** | Registrar Nueva Propiedad en el Inventario |
| **Actor primario** | Agente Senior, Agente Junior |
| **Precondiciones** | El usuario ha iniciado sesión y tiene permisos de creación de propiedades |
| **Postcondiciones** | La propiedad queda registrada en el sistema con estado "Nuevo", asignada al agente captador |
| **Flujo principal** | 1. El agente accede al módulo de Propiedades. <br> 2. Selecciona "Nueva Propiedad". <br> 3. Completa el formulario: tipo de propiedad, tipo de gestión (Venta/Renta/Ambas), precios, ubicación, descripción, datos del propietario. <br> 4. Carga multimedia (fotos y videos). <br> 5. Ubica la propiedad en el mapa interactivo. <br> 6. Carga documentos legales (escrituras, planos). <br> 7. Define el porcentaje de comisión. <br> 8. El sistema valida los campos obligatorios según el tipo de gestión. <br> 9. El sistema asigna automáticamente el estado "Nuevo" (válido por 7 días). <br> 10. El sistema registra la acción en la auditoría. |
| **Flujos alternativos** | **FA1:** El sistema detecta propiedad similar en la misma zona → Muestra precio sugerido comparativo. <br> **FA2:** Si el tipo de gestión es "Ambas" → Se habilitan ambos campos de precio obligatorios. |
| **Flujos de excepción** | **FE1:** Archivos multimedia exceden el límite de tamaño → Se muestra error y se solicita comprimir. <br> **FE2:** Coordenadas GPS inválidas → Se solicita reubicar en el mapa. |

### CU-03: Gestionar Trámite de Venta/Renta (Embudo)

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-03 |
| **Nombre** | Gestionar Trámite de Venta/Renta (Máquina de Estados) |
| **Actor primario** | Agente Senior, Agente Junior, Cliente |
| **Precondiciones** | La propiedad existe con estado "Disponible" o "Nuevo". El cliente tiene una cuenta. |
| **Postcondiciones** | Se crea/actualiza un trámite con el estado correspondiente y se aplican las reglas de concurrencia. |
| **Flujo principal** | 1. El cliente (o agente) inicia un trámite sobre una propiedad → Estado: **Interesado**. <br> 2. El agente registra interacciones (emails, llamadas, notas). <br> 3. El cliente presenta oferta → Estado: **Negociación**. La propiedad pasa a **Reservada** automáticamente. <br> 4. Otros trámites sobre la misma propiedad se **pausan**. <br> 5. Se acepta la oferta → Estado: **Cierre**. <br> 6. Se finaliza la transacción → Estado: **Finalizado**. La propiedad pasa a **Vendida/Rentada**. <br> 7. Trámites pausados de otros clientes pasan a **Cancelado (Perdido)**. |
| **Flujos alternativos** | **FA1:** La negociación fracasa → El trámite pasa a **Cancelado** (se exige motivo escrito). La propiedad vuelve a **Disponible**. Los trámites pausados se reactivan. <br> **FA2:** Un Agente Senior registra una oferta competitiva sobre una propiedad en "Negociación" → Se crea un trámite paralelo de negociación (privilegio exclusivo del Senior). |
| **Reglas de concurrencia** | • Múltiples clientes pueden estar en estado **Interesado** simultáneamente. <br> • Al pasar a **Negociación**, los demás trámites se pausan. <br> • Solo un **Agente Senior** puede ofertar sobre propiedad en **Negociación**. <br> • Un **Agente Junior** tiene bloqueado el botón "Ofertar" en propiedades reservadas. |

### CU-04: Agendar Visita a Propiedad

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-04 |
| **Nombre** | Agendar Visita a Propiedad |
| **Actor primario** | Agente, Cliente |
| **Precondiciones** | Existe un trámite activo entre el cliente y la propiedad. El agente tiene agenda configurada. |
| **Postcondiciones** | Se crea una cita con estado "Programada", se envía invitación (.ics), se bloquea el horario del agente. |
| **Flujo principal** | 1. El agente selecciona el trámite activo. <br> 2. Selecciona "Agendar Visita". <br> 3. El sistema muestra los horarios disponibles del agente (excluye citas existentes y calendario sincronizado). <br> 4. El agente selecciona fecha y hora. <br> 5. El sistema envía invitación por correo con archivo .ics al cliente. <br> 6. El correo incluye enlace seguro de reprogramación. <br> 7. La cita queda en estado "Programada". <br> 8. 2 horas después de la cita, el sistema genera tarea "Pendiente: Completar Reporte de Visita". |
| **Flujos alternativos** | **FA1:** El cliente reprograma desde el enlace → El sistema muestra horarios libres → Se actualiza la cita a "Reprogramada". <br> **FA2:** El agente cancela la cita → Se notifica al cliente. |

### CU-05: Crear Cuenta de Cliente (Portal Público)

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-05 |
| **Nombre** | Registro de Cuenta de Cliente en el Portal Público |
| **Actor primario** | Cliente |
| **Precondiciones** | El cliente accede al portal público web |
| **Postcondiciones** | Se crea una cuenta de cliente, se registra la fecha de última actividad, se habilita la funcionalidad de guardar preferencias e iniciar trámites |
| **Flujo principal** | 1. El cliente accede al portal público. <br> 2. Navega por el catálogo de propiedades (estado "Disponible" y "Nuevo"). <br> 3. Selecciona "Crear Cuenta". <br> 4. Completa formulario: nombre, email, teléfono, tipo de propiedad de interés. <br> 5. El sistema envía correo de verificación. <br> 6. El cliente confirma su email. <br> 7. La cuenta queda activa. Se registra la fecha de última actividad. |

### CU-06: Generar Brochure PDF y Distribución Digital

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-06 |
| **Nombre** | Generar Brochure PDF y Distribución Multicanal |
| **Actor primario** | Agente Senior, Agente Junior |
| **Precondiciones** | La propiedad existe con al menos una imagen cargada y datos comerciales completos |
| **Postcondiciones** | Se genera un PDF con la plantilla de la empresa, se asigna un identificador único de tracking y se registra la acción en auditoría |
| **Flujo principal** | 1. El agente accede a la ficha de la propiedad. <br> 2. Selecciona "Generar Brochure". <br> 3. El sistema ensambla el PDF server-side: foto principal, galería (máx. 6), descripción, precio, amenidades, mapa estático, datos de contacto del agente. <br> 4. Se aplica la plantilla de la empresa (logo, colores, estilo). <br> 5. Se asigna un identificador único (UUID) para tracking. <br> 6. El PDF se almacena en S3/R2 con URL corta. <br> 7. Se presenta al agente las opciones de distribución: WhatsApp (click-to-chat), Email (desde CRM), Copiar link (con tracking). <br> 8. Se registra la generación en auditoría. |
| **Flujos alternativos** | **FA1:** El agente elige "WhatsApp" → Se abre la API de WA Business con mensaje pre-configurado y enlace al brochure. <br> **FA2:** El agente elige "Email" → Se abre el compositor de correo con el brochure adjunto o enlace. <br> **FA3:** El agente elige "Copiar link" → Se copia al portapapeles un enlace público con tracking. |
| **Flujos de excepción** | **FE1:** La propiedad no tiene fotos → Se muestra aviso y se bloquea la generación hasta cargar al menos una imagen. <br> **FE2:** El servicio de generación de PDF falla → Se notifica al agente y se encola un reintento automático. |

### CU-07: Gestionar Expediente de Propietarios

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-07 |
| **Nombre** | Gestionar Propietarios y Expediente Legal |
| **Actor primario** | Administrador, Agente Senior |
| **Precondiciones** | El usuario ha iniciado sesión y tiene permisos de acceso a datos de propietarios (Admin o Senior de su equipo) |
| **Postcondiciones** | Se crea/actualiza el propietario con sus documentos legales vinculados y alertas de vencimiento configuradas |
| **Flujo principal** | 1. El usuario accede al módulo de Propietarios. <br> 2. Busca propietario por nombre, DPI o teléfono. <br> 3. Si no existe, selecciona "Nuevo Propietario" y completa: nombre, DPI, NIT, teléfonos, email, dirección, notas. <br> 4. Vincula el propietario a una o más propiedades. <br> 5. Carga documentos legales tipificados (Escritura, Plano, IUSI, Contrato de Exclusividad). <br> 6. Registra fechas de vencimiento en los documentos que apliquen. <br> 7. El sistema programa alertas automáticas 7 días antes del vencimiento. <br> 8. Opcionalmente, genera Carta de Comisión PDF con plantilla configurable. |
| **Flujos alternativos** | **FA1:** El propietario ya existe → Se vincula directamente a la nueva propiedad sin duplicar datos. <br> **FA2:** Se regenera la Carta de Comisión → La versión anterior se conserva en el historial del expediente. |
| **Flujos de excepción** | **FE1:** Un Agente Junior intenta acceder a datos de propietarios → Se deniega el acceso con mensaje "Permisos insuficientes". <br> **FE2:** DPI duplicado en el mismo tenant → Se alerta al usuario y se sugiere vincular al propietario existente. |

### CU-08: Publicar Propiedad en Redes Sociales

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-08 |
| **Nombre** | Publicar Propiedad en Facebook/Instagram vía Meta API |
| **Actor primario** | Agente Senior, Agente Junior |
| **Precondiciones** | La cuenta de Meta de la empresa está conectada al CRM. La propiedad tiene al menos una imagen y está en estado Disponible/Nuevo. |
| **Postcondiciones** | La publicación se crea (o programa) en Facebook/Instagram. Se registra en el historial de publicaciones con ID externo y estado. |
| **Flujo principal** | 1. El agente accede a la ficha de la propiedad. <br> 2. Selecciona "Publicar en Redes". <br> 3. El sistema muestra preview de la publicación: galería principal, precio, link a la página de la agencia. <br> 4. El agente puede publicar inmediatamente o programar para fecha/hora futura. <br> 5. El sistema envía la publicación vía Graph API de Meta. <br> 6. Se registra la publicación: fecha, red social, ID externo, estado (Publicado/Error). <br> 7. Se registra la acción en auditoría. |
| **Flujos alternativos** | **FA1:** El agente programa la publicación → Se encola en BullMQ para envío en la fecha indicada. <br> **FA2:** El agente elimina una publicación → Se invoca la API de Meta para eliminar y se actualiza el estado a "Eliminado". |
| **Flujos de excepción** | **FE1:** La cuenta de Meta no está conectada → Se muestra mensaje con enlace a configuración. <br> **FE2:** Rate limit de Meta API → Se encola la publicación para reintento en 15 minutos. |

### CU-09: Importar Datos Masivos (Excel/CSV)

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-09 |
| **Nombre** | Importación Masiva de Propiedades y Contactos |
| **Actor primario** | Administrador |
| **Precondiciones** | El usuario tiene rol de Administrador. El archivo no excede 500 registros. |
| **Postcondiciones** | Los registros válidos se insertan en la base de datos. Se marca cada registro con origen "Importación masiva" en auditoría. |
| **Flujo principal** | 1. El administrador accede al módulo de Importación. <br> 2. Descarga la plantilla Excel con los campos esperados y validaciones. <br> 3. Llena la plantilla con los datos y la carga al sistema. <br> 4. El sistema parsea el archivo y ejecuta validación previa. <br> 5. Se muestra resumen: registros válidos, registros con errores (detalle del error), registros duplicados. <br> 6. El administrador revisa y elige: importar todos los válidos, o cancelar. <br> 7. Se insertan los registros válidos en la base de datos. <br> 8. Se genera log de auditoría con origen "Importación masiva". |
| **Flujos alternativos** | **FA1:** Algunos registros tienen errores → El administrador puede importar solo los válidos (importación parcial). <br> **FA2:** Se detectan duplicados → Se muestran para que el admin decida omitir o actualizar. |
| **Flujos de excepción** | **FE1:** El archivo excede 500 registros → Se rechaza con mensaje de límite. <br> **FE2:** Formato de archivo no soportado → Se indica los formatos válidos (.xlsx, .csv). |

### CU-10: Configurar y Gestionar Notificaciones

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-10 |
| **Nombre** | Centro de Notificaciones Unificado |
| **Actor primario** | Administrador, Agente Senior, Agente Junior |
| **Precondiciones** | El usuario ha iniciado sesión en el CRM |
| **Postcondiciones** | El usuario visualiza, gestiona y configura sus notificaciones y preferencias de canal |
| **Flujo principal** | 1. El usuario ve el icono de campana en el header con badge de no leídas. <br> 2. Al hacer clic, se despliega el panel con las últimas 20 notificaciones. <br> 3. Cada notificación muestra: tipo, mensaje, fecha/hora, link al recurso. <br> 4. El usuario puede marcar como leída (individual o todas). <br> 5. Al hacer clic en una notificación, navega al recurso relacionado. <br> 6. En configuración, el usuario define por cada tipo de alerta el canal: Push, Email, In-app, o Desactivada. |
| **Flujos alternativos** | **FA1:** No hay notificaciones → Se muestra mensaje "No tienes notificaciones". <br> **FA2:** El usuario accede desde la app móvil → Las notificaciones push se entregan vía FCM/APNs. |
| **Flujos de excepción** | **FE1:** El servicio de notificaciones push falla → Se entrega la notificación por canal in-app como fallback. |

### CU-11: Búsqueda Global Federada

| Campo | Descripción |
|:------|:------------|
| **ID** | CU-11 |
| **Nombre** | Búsqueda Global Federada Cross-Module |
| **Actor primario** | Administrador, Agente Senior, Agente Junior |
| **Precondiciones** | El usuario ha iniciado sesión en el CRM |
| **Postcondiciones** | Se muestran resultados agrupados por entidad, respetando los permisos RBAC y la jerarquía del usuario |
| **Flujo principal** | 1. El usuario presiona `Ctrl+K` o `/` para activar la barra de búsqueda global. <br> 2. Comienza a escribir (mínimo 3 caracteres, debounce 300ms). <br> 3. El sistema busca simultáneamente en: Propiedades, Clientes, Trámites, Agentes. <br> 4. Los resultados se agrupan por entidad con máximo 5 resultados por grupo. <br> 5. El usuario selecciona un resultado para navegar directamente al recurso. <br> 6. El sistema aplica filtros RBAC: solo muestra resultados que el usuario puede ver según su rol y posición jerárquica. |
| **Flujos alternativos** | **FA1:** Menos de 3 caracteres → No se dispara búsqueda. <br> **FA2:** Sin resultados → Se muestra "No se encontraron resultados para '[término]'". |
| **Flujos de excepción** | **FE1:** Timeout de búsqueda (>2s) → Se muestra resultados parciales disponibles con indicador de carga. |

---

## 4.3 Diagramas de Interacción

### 4.3.1 Diagrama de Interacción — Flujo de Embudo de Ventas

```
                    Cliente              Agente              Sistema             Propiedad
                       │                   │                    │                    │
                       │   Interés en      │                    │                    │
                       │   propiedad       │                    │                    │
                       │──────────────────►│                    │                    │
                       │                   │  Crear Trámite     │                    │
                       │                   │───────────────────►│                    │
                       │                   │                    │  Estado:           │
                       │                   │                    │  INTERESADO        │
                       │                   │                    │◄───────────────────│
                       │                   │                    │                    │
                       │  Presentar Oferta │                    │                    │
                       │──────────────────►│                    │                    │
                       │                   │  Registrar Oferta  │                    │
                       │                   │───────────────────►│                    │
                       │                   │                    │  Estado Trámite:   │
                       │                   │                    │  NEGOCIACIÓN       │
                       │                   │                    │──────────────────► │
                       │                   │                    │  Estado Propiedad: │
                       │                   │                    │  RESERVADA         │
                       │                   │                    │──────────────────► │
                       │                   │                    │  Pausar otros      │
                       │                   │                    │  trámites          │
                       │                   │                    │───────┐            │
                       │                   │                    │       │            │
                       │                   │                    │◄──────┘            │
                       │                   │                    │                    │
                       │                   │  Aceptar Oferta   │                    │
                       │                   │───────────────────►│                    │
                       │                   │                    │  Estado: CIERRE    │
                       │                   │                    │───────┐            │
                       │                   │                    │◄──────┘            │
                       │                   │                    │                    │
                       │                   │  Finalizar Venta  │                    │
                       │                   │───────────────────►│                    │
                       │                   │                    │  FINALIZADO        │
                       │                   │                    │──────────────────► │
                       │                   │                    │  VENDIDA/RENTADA   │
                       │                   │                    │──────────────────► │
                       │                   │                    │  Cancelar otros    │
                       │                   │                    │  trámites pausados │
                       │                   │                    │───────┐            │
                       │                   │                    │◄──────┘            │
```

### 4.3.2 Diagrama de Interacción — Jerarquía de Visibilidad

```
                   Agente Junior          Agente Senior         Administrador
                       │                      │                      │
                       │                      │        Ver TODAS     │
                       │                      │      las propiedades │
                       │                      │ ◄────────────────────│
                       │                      │                      │
                       │      Ver y editar     │                     │
                       │      propiedades de   │                     │
                       │      su downline      │                     │
                       │ ◄────────────────────│                     │
                       │                      │                      │
      Ver propiedades  │                      │                      │
      propias + upline │                      │                      │
      (solo lectura)   │                      │                      │
      ────────────────►│                      │                      │
                       │                      │                      │
      Editar SOLO      │                      │                      │
      propiedades      │                      │                      │
      asignadas        │                      │                      │
      ────────┐        │                      │                      │
              │        │                      │                      │
      ◄───────┘        │                      │                      │
```

## 4.4 Definición de Preferencias de Búsqueda del Cliente

| Preferencia | Tipo de Dato | Descripción |
|:------------|:-------------|:------------|
| `tipo_propiedad_preferido` | Enum[] | Lista de tipos: Casa, Depto, Local, Terreno, Oficina, Bodega |
| `tipo_gestion_preferido` | Enum | Venta, Renta o Ambas |
| `rango_precio_min` | Decimal | Precio mínimo deseado |
| `rango_precio_max` | Decimal | Precio máximo deseado |
| `ubicacion_preferida` | String/JSON | Zona, colonia, municipio o coordenadas de interés |
| `num_habitaciones_min` | Integer | Número mínimo de habitaciones |
| `superficie_min_m2` | Decimal | Metros cuadrados mínimos |
| `alertas_nuevas_propiedades` | Boolean | Recibir notificación cuando se publiquen propiedades que coincidan |
| `fecha_ultima_actividad` | Datetime | Actualizada automáticamente en cada interacción |

## 4.5 Acceso al Sistema — Matriz de Permisos por Rol

### 4.5.1 Permisos de Módulos

| Módulo | Administrador | Agente Senior | Agente Junior | Cliente |
|:-------|:-------------|:--------------|:--------------|:--------|
| Dashboard | ✅ Completo | ✅ Su equipo | ✅ Personal | ❌ N/A |
| Gestión de Usuarios | ✅ CRUD | ❌ Solo lectura (su equipo) | ❌ N/A | ❌ N/A |
| Propiedades — Propias | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ Solo lectura (portal) |
| Propiedades — Downline | ✅ CRUD (todas) | ✅ CRUD | ❌ N/A | ❌ N/A |
| Propiedades — Upline | ✅ N/A | ❌ No (Opcional) | ✅ Solo lectura | ❌ N/A |
| Datos del Propietario | ✅ Ver/Editar | ✅ Solo su equipo | ❌ No | ❌ No |
| Documentos Legales | ✅ Ver/Editar | ✅ Solo su equipo | ❌ No | ❌ No |
| Carta de Comisión | ✅ Ver/Generar | ✅ Solo propias | ❌ No | ❌ No |
| Trámites (Embudo) | ✅ Ver todos | ✅ Su equipo | ✅ Solo asignados | ✅ Solo propios |
| Citas / Visitas | ✅ Ver todas | ✅ Su equipo | ✅ Solo propias | ✅ Solo propias |
| Reportes BI | ✅ Completo | ✅ Su equipo | ✅ Personal | ❌ N/A |
| Ranking de Agentes | ✅ Con nombres visibles | ⚠️ Anónimo | ⚠️ Anónimo | ❌ N/A |
| Configuración de Seguridad | ✅ Completo | ❌ N/A | ❌ N/A | ❌ N/A |
| Auditoría | ✅ Solo lectura | ❌ N/A | ❌ N/A | ❌ N/A |
| Campañas Marketing | ✅ CRUD | ✅ CRUD | ❌ Solo lectura | ❌ N/A |
| Portal Público | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Acceso total |

### 4.5.2 Permisos sobre Propiedades (Detallado con Jerarquía)

| Acción | Administrador | Agente Senior | Agente Junior |
|:-------|:-------------|:--------------|:--------------|
| Crear Propiedad | ✅ Sí | ✅ Sí | ✅ Sí |
| Editar Propiedades Propias | ✅ Sí | ✅ Sí | ✅ Sí |
| Ver Propiedades Propias | ✅ Sí | ✅ Sí | ✅ Sí |
| Ver Línea Ascendente (Upline) | N/A | ❌ No (Opcional) | ✅ Sí (Solo lectura) |
| Ver Línea Descendente (Downline) | ✅ Sí (Todo) | ✅ Sí | ❌ N/A |
| Editar Línea Descendente (Downline) | ✅ Sí (Todo) | ✅ Sí | ❌ N/A |
| Editar Línea Ascendente (Upline) | N/A | ❌ No | ❌ No |
| Ofertar en Propiedad Reservada | ✅ Sí | ✅ Sí | ❌ Bloqueado |

## 4.6 Consulta de Información — Portal Público del Cliente

| Funcionalidad | Descripción | Autenticación |
|:-------------|:------------|:--------------|
| Ver catálogo de propiedades | Carrusel y listado filtrable (solo estado "Disponible" y "Nuevo") | ❌ No requerida |
| Filtrar propiedades | Por ubicación, tipo de propiedad, rango de precios, habitaciones | ❌ No requerida |
| Ver detalle de propiedad | Galería multimedia, mapa, descripción, precio (sin datos de propietario) | ❌ No requerida |
| Guardar búsquedas/preferencias | Registrar filtros favoritos para recibir alertas | ✅ Requiere cuenta |
| Solicitar información al agente | Enviar mensaje sobre una propiedad específica | ✅ Requiere cuenta |
| Iniciar trámite de compra/renta | Expresar interés formal en una propiedad | ✅ Requiere cuenta |
| Dar seguimiento a trámites | Ver estado actual de su proceso de compra/renta | ✅ Requiere cuenta |
| Reprogramar cita | Cambiar horario de visita desde enlace seguro | ✅ Requiere enlace válido |

---

# 5. DIAGRAMAS DE SECUENCIA

## 5.1 Secuencia de Creación de Cuenta

```
   Cliente                Portal Web              API Backend           Base de Datos          SendGrid
      │                       │                        │                      │                    │
      │  1. Accede al portal  │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │                        │                      │                    │
      │  2. Clic "Registrarse"│                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │                        │                      │                    │
      │  3. Muestra formulario│                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  4. Completa datos:   │                        │                      │                    │
      │  nombre, email, tel,  │                        │                      │                    │
      │  tipo propiedad       │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  5. POST /api/register │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  6. Validar email    │                    │
      │                       │                        │  único por tenant    │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  7. Email disponible │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  8. Hash password    │                    │
      │                       │                        │  + generar token     │                    │
      │                       │                        │  verificación        │                    │
      │                       │                        │────────┐             │                    │
      │                       │                        │        │             │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │                        │  9. INSERT cliente   │                    │
      │                       │                        │  (status: pendiente) │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  10. Registrar en    │                    │
      │                       │                        │  auditoría           │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  11. Enviar email    │                    │
      │                       │                        │  de verificación     │                    │
      │                       │                        │────────────────────────────────────────── │
      │                       │                        │                      │                ───►│
      │                       │                        │                      │                    │
      │                       │  12. Return 201 Created│                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  13. "Revisa tu correo│                        │                      │                    │
      │  para verificar"      │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  14. Clic enlace de   │                        │                      │                    │
      │  verificación en email│                        │                      │                    │
      │──────────────────────────────────────────────►│                      │                    │
      │                       │                        │  15. Validar token   │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  16. UPDATE status   │                    │
      │                       │                        │  = 'activo'          │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │  17. "Cuenta activada │                        │                      │                    │
      │  exitosamente"        │                        │                      │                    │
      │◄──────────────────────────────────────────────│                      │                    │
```

## 5.2 Secuencia de Ingreso de Usuario Exitoso

```
   Usuario              Frontend (React)         API Backend            PostgreSQL            Auth (2FA)
      │                       │                        │                      │                    │
      │  1. Ingresa email     │                        │                      │                    │
      │  y contraseña         │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  2. POST /api/auth     │                      │                    │
      │                       │  /login                │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  3. Buscar usuario   │                    │
      │                       │                        │  por email + tenant  │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  4. Retorna usuario  │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  5. Verificar que    │                    │
      │                       │                        │  cuenta NO bloqueada │                    │
      │                       │                        │────────┐             │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │                        │  6. bcrypt.compare   │                    │
      │                       │                        │  (password, hash)    │                    │
      │                       │                        │────────┐ ✅ Válido   │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │                        │  7. Verificar IP /   │                    │
      │                       │                        │  Geolocalización     │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  8. IP permitida ✅  │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │  9. Return             │                      │                    │
      │                       │  {requires_2fa: true}  │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  10. Muestra campo    │                        │                      │                    │
      │  para token 2FA       │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  11. Ingresa token    │                        │                      │                    │
      │  de 6 dígitos         │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  12. POST /api/auth    │                      │                    │
      │                       │  /verify-2fa           │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  13. Validar TOTP    │                    │
      │                       │                        │──────────────────────────────────────────►│
      │                       │                        │  14. Token válido ✅ │                    │
      │                       │                        │◄─────────────────────────────────────────│
      │                       │                        │                      │                    │
      │                       │                        │  15. Generar JWT     │                    │
      │                       │                        │  (access + refresh)  │                    │
      │                       │                        │────────┐             │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │                        │  16. Resetear        │                    │
      │                       │                        │  intentos_login = 0  │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  17. Registrar login │                    │
      │                       │                        │  en auditoría        │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │  18. Return 200        │                      │                    │
      │                       │  {token, refresh,      │                      │                    │
      │                       │   user, role}          │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  19. Redirige al      │                        │                      │                    │
      │  Dashboard            │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
```

## 5.3 Secuencia de Ingreso de Usuario Fallido

```
   Usuario              Frontend (React)         API Backend            PostgreSQL            SendGrid
      │                       │                        │                      │                    │
      │  1. Ingresa email     │                        │                      │                    │
      │  y contraseña         │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  2. POST /api/auth     │                      │                    │
      │                       │  /login                │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  3. Buscar usuario   │                    │
      │                       │                        │  por email + tenant  │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  4. Retorna usuario  │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  5. bcrypt.compare   │                    │
      │                       │                        │  (password, hash)    │                    │
      │                       │                        │────────┐ ❌ Inválido │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │                        │  6. INCREMENT        │                    │
      │                       │                        │  intentos_login      │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  7. intentos = 2     │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │  8. Return 401         │                      │                    │
      │                       │  "Credenciales         │                      │                    │
      │                       │   inválidas"           │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  9. Muestra error     │                        │                      │                    │
      │  "Credenciales        │                        │                      │                    │
      │  incorrectas"         │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  ─── Tercer intento fallido ───                │                      │                    │
      │                       │                        │                      │                    │
      │  10. Ingresa email    │                        │                      │                    │
      │  y contraseña (3er)   │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  11. POST /api/auth    │                      │                    │
      │                       │  /login                │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  12. Validar y       │                    │
      │                       │                        │  detectar 3 intentos │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  13. intentos = 3    │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  14. BLOQUEAR cuenta │                    │
      │                       │                        │  temporalmente       │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  15. Registrar       │                    │
      │                       │                        │  bloqueo en          │                    │
      │                       │                        │  auditoría           │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  16. Enviar email    │                    │
      │                       │                        │  alerta de bloqueo   │                    │
      │                       │                        │─────────────────────────────────────────►│
      │                       │                        │                      │                    │
      │                       │  17. Return 403        │                      │                    │
      │                       │  "Cuenta bloqueada     │                      │                    │
      │                       │   temporalmente"       │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  18. Muestra mensaje  │                        │                      │                    │
      │  "Tu cuenta ha sido   │                        │                      │                    │
      │  bloqueada. Revisa    │                        │                      │                    │
      │  tu correo."          │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
```

## 5.4 Secuencia de Consulta de Información (Portal Público)

```
   Cliente              Portal Web (React)       API Backend            PostgreSQL            Redis (Caché)
      │                       │                        │                      │                    │
      │  1. Accede al portal  │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  2. GET /api/public    │                      │                    │
      │                       │  /properties           │                      │                    │
      │                       │  ?status=disponible    │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  3. Verificar caché  │                    │
      │                       │                        │──────────────────────────────────────────►│
      │                       │                        │  4. Cache MISS       │                    │
      │                       │                        │◄─────────────────────────────────────────│
      │                       │                        │                      │                    │
      │                       │                        │  5. SELECT props     │                    │
      │                       │                        │  WHERE status IN     │                    │
      │                       │                        │  ('Disponible',      │                    │
      │                       │                        │  'Nuevo')            │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  6. Retorna listado  │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  7. Guardar en caché │                    │
      │                       │                        │  (TTL: 5 min)        │                    │
      │                       │                        │──────────────────────────────────────────►│
      │                       │                        │                      │                    │
      │                       │  8. Return 200         │                      │                    │
      │                       │  [lista propiedades]   │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  9. Renderiza carrusel│                        │                      │                    │
      │  y listado filtrable  │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  10. Aplica filtros:  │                        │                      │                    │
      │  tipo=Casa,           │                        │                      │                    │
      │  precio=100K-300K,    │                        │                      │                    │
      │  zona=Zona 10         │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  11. GET /api/public   │                      │                    │
      │                       │  /properties?tipo=casa │                      │                    │
      │                       │  &precio_min=100000    │                      │                    │
      │                       │  &precio_max=300000    │                      │                    │
      │                       │  &zona=zona10          │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  12. Consulta con    │                    │
      │                       │                        │  filtros + PostGIS   │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  13. Resultados      │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │  14. Return 200        │                      │                    │
      │                       │  [resultados filtrados]│                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  15. Actualiza listado│                        │                      │                    │
      │  con resultados       │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  16. Clic en          │                        │                      │                    │
      │  propiedad específica │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  17. GET /api/public   │                      │                    │
      │                       │  /properties/:id       │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  18. SELECT detalle  │                    │
      │                       │                        │  + multimedia + mapa │                    │
      │                       │                        │  (SIN datos privados)│                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  19. Datos completos │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  20. INCREMENT       │                    │
      │                       │                        │  visitas_web         │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │  21. Return 200        │                      │                    │
      │                       │  {detalle propiedad}   │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  22. Renderiza página │                        │                      │                    │
      │  de detalle: galería, │                        │                      │                    │
      │  mapa, descripción,   │                        │                      │                    │
      │  precio, botón        │                        │                      │                    │
      │  "Solicitar Info"     │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
```

## 5.5 Secuencia de Generación de Brochure PDF

```
   Agente              Frontend (React)         API Backend            Worker (BullMQ)         S3 / R2
      │                       │                        │                      │                    │
      │  1. Clic "Generar     │                        │                      │                    │
      │  Brochure"            │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  2. POST /api/props    │                      │                    │
      │                       │  /:id/brochure         │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  3. Validar propiedad│                    │
      │                       │                        │  tiene fotos y datos │                    │
      │                       │                        │────────┐             │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │                        │  4. Encolar job      │                    │
      │                       │                        │  "generate-brochure" │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │  5. Return 202         │                      │                    │
      │                       │  {job_id, status:      │                      │                    │
      │                       │   "processing"}        │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  6. Muestra spinner   │                        │                      │                    │
      │  "Generando..."       │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │  7. Worker toma    │
      │                       │                        │                      │  el job. Genera    │
      │                       │                        │                      │  PDF con plantilla │
      │                       │                        │                      │  de la empresa     │
      │                       │                        │                      │────────┐           │
      │                       │                        │                      │◄───────┘           │
      │                       │                        │                      │                    │
      │                       │                        │                      │  8. Upload PDF     │
      │                       │                        │                      │  a S3/R2           │
      │                       │                        │                      │───────────────────►│
      │                       │                        │                      │  9. URL del PDF    │
      │                       │                        │                      │◄───────────────────│
      │                       │                        │                      │                    │
      │                       │                        │  10. WebSocket:      │                    │
      │                       │                        │  brochure_ready      │                    │
      │                       │  11. Evento WS         │◄─────────────────────│                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  12. Muestra opciones │                        │                      │                    │
      │  de distribución:     │                        │                      │                    │
      │  WhatsApp / Email /   │                        │                      │                    │
      │  Copiar Link          │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
```

## 5.6 Secuencia de Agendamiento de Visita

```
   Agente              Frontend (React)         API Backend            PostgreSQL             SendGrid
      │                       │                        │                      │                    │
      │  1. Selecciona         │                        │                      │                    │
      │  "Agendar Visita"     │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  2. GET /api/agents    │                      │                    │
      │                       │  /:id/availability     │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  3. Consultar citas  │                    │
      │                       │                        │  existentes del      │                    │
      │                       │                        │  agente              │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  4. Citas actuales   │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  5. Calcular slots   │                    │
      │                       │                        │  disponibles (excluir│                    │
      │                       │                        │  ocupados + buffer   │                    │
      │                       │                        │  30min + horario     │                    │
      │                       │                        │  laboral)            │                    │
      │                       │                        │────────┐             │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │  6. Return slots       │                      │                    │
      │                       │  disponibles           │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  7. Muestra calendario │                        │                      │                    │
      │  con slots libres     │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  8. Selecciona fecha  │                        │                      │                    │
      │  y hora               │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  9. POST /api/appts    │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  10. Verificar slot  │                    │
      │                       │                        │  sigue disponible    │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │  11. Disponible ✅   │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │                        │  12. INSERT cita     │                    │
      │                       │                        │  (status: Programada)│                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │  13. Enviar .ics +   │                    │
      │                       │                        │  enlace reprogramar  │                    │
      │                       │                        │─────────────────────────────────────────►│
      │                       │                        │                      │                    │
      │                       │                        │  14. Registrar en    │                    │
      │                       │                        │  auditoría           │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │  15. Return 201        │                      │                    │
      │                       │  {cita creada}         │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  16. Confirmación:    │                        │                      │                    │
      │  "Visita agendada     │                        │                      │                    │
      │  exitosamente"        │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
```

## 5.7 Secuencia de Publicación en Meta API

```
   Agente              Frontend (React)         API Backend            Worker (BullMQ)         Meta Graph API
      │                       │                        │                      │                    │
      │  1. Clic "Publicar    │                        │                      │                    │
      │  en Redes"            │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  2. GET /api/meta      │                      │                    │
      │                       │  /preview/:prop_id     │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  3. Verificar cuenta │                    │
      │                       │                        │  Meta conectada      │                    │
      │                       │                        │────────┐             │                    │
      │                       │                        │◄───────┘             │                    │
      │                       │                        │                      │                    │
      │                       │  4. Return preview     │                      │                    │
      │                       │  {fotos, texto, link}  │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  5. Muestra preview.  │                        │                      │                    │
      │  Opciones: "Publicar  │                        │                      │                    │
      │  ahora" / "Programar" │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
      │                       │                        │                      │                    │
      │  6. Selecciona        │                        │                      │                    │
      │  "Publicar ahora"     │                        │                      │                    │
      │──────────────────────►│                        │                      │                    │
      │                       │  7. POST /api/meta     │                      │                    │
      │                       │  /publish               │                      │                    │
      │                       │───────────────────────►│                      │                    │
      │                       │                        │  8. Encolar job      │                    │
      │                       │                        │  "publish-meta"      │                    │
      │                       │                        │─────────────────────►│                    │
      │                       │                        │                      │                    │
      │                       │                        │                      │  9. POST Graph API │
      │                       │                        │                      │  /{page_id}/photos │
      │                       │                        │                      │───────────────────►│
      │                       │                        │                      │  10. Return        │
      │                       │                        │                      │  {post_id} ✅      │
      │                       │                        │                      │◄───────────────────│
      │                       │                        │                      │                    │
      │                       │                        │  11. Guardar en      │                    │
      │                       │                        │  historial:          │                    │
      │                       │                        │  {post_id, status:   │                    │
      │                       │                        │   Publicado}         │                    │
      │                       │                        │◄─────────────────────│                    │
      │                       │                        │                      │                    │
      │                       │  12. WebSocket:        │                      │                    │
      │                       │  publicación exitosa   │                      │                    │
      │                       │◄───────────────────────│                      │                    │
      │                       │                        │                      │                    │
      │  13. "Publicado       │                        │                      │                    │
      │  exitosamente en      │                        │                      │                    │
      │  Facebook"            │                        │                      │                    │
      │◄──────────────────────│                        │                      │                    │
```

## 5.8 Justificación de Decisiones de Análisis

### 5.8.1 Decisión: Estrategia de Multitenancy (Row-Level Security)

| Aspecto | Detalle |
|:--------|:--------|
| **Decisión** | Se utiliza Row-Level Security (RLS) con campo `tenant_id` en cada tabla, en lugar de bases de datos separadas por empresa. |
| **Alternativas evaluadas** | 1) Base de datos separada por tenant. 2) Schema separado por tenant. 3) Campo `tenant_id` con RLS. |
| **Justificación** | La opción de RLS ofrece el mejor balance entre aislamiento de datos, costo de infraestructura y complejidad de mantenimiento. Una sola base de datos es más económica, y las políticas RLS de PostgreSQL garantizan aislamiento a nivel de consulta sin requerir lógica adicional en la aplicación. |
| **Riesgos** | Si algún desarrollador omite el filtro de `tenant_id`, podría haber fuga de datos. Las políticas RLS mitigan este riesgo al aplicarse automáticamente. |

### 5.8.2 Decisión: Auditoría Inmutable

| Aspecto | Detalle |
|:--------|:--------|
| **Decisión** | Los registros de auditoría se almacenan en una tabla que no permite UPDATE ni DELETE desde la aplicación. |
| **Justificación** | Es un requerimiento de negocio que ni siquiera el Administrador pueda modificar los logs. Se implementa mediante restricciones a nivel de base de datos (revocación de permisos de UPDATE/DELETE sobre la tabla de auditoría). |
| **Impacto** | La tabla crecerá continuamente. Se recomienda implementar archivado automático a almacenamiento frío (S3 Glacier) después de 12 meses y particionamiento por fecha. |

### 5.8.3 Decisión: Árbol Jerárquico con Auto-Referencia

| Aspecto | Detalle |
|:--------|:--------|
| **Decisión** | La jerarquía de supervisión (Senior → Junior) se modela con un campo `id_supervisor` auto-referencial en la tabla de usuarios. |
| **Justificación** | El modelo de auto-referencia es flexible, soporta profundidad ilimitada y permite consultas recursivas eficientes con CTEs (Common Table Expressions) en PostgreSQL. |
| **Validación** | Se implementa un validador a nivel de aplicación para prevenir referencias circulares (A supervisa a B, B supervisa a A). |

### 5.8.4 Decisión: Máquina de Estados para Trámites

| Aspecto | Detalle |
|:--------|:--------|
| **Decisión** | El flujo del trámite sigue una máquina de estados estricta: `Interesado → Negociación → Cierre → Finalizado`, con estados laterales `Pausado` y `Cancelado`. |
| **Justificación** | Las reglas de concurrencia (bloqueo al pasar a Negociación, restricción de ofertas para Juniors) son críticas para el negocio. Una máquina de estados formal asegura transiciones válidas y permite auditoría de cada cambio. |
| **Implementación** | Se utilizará un patrón State Machine con validación de transiciones en el backend. Las transacciones de base de datos garantizarán atomicidad (ej. cambiar estado del trámite + cambiar estado de la propiedad + pausar otros trámites = una sola transacción). |

### 5.8.5 Decisión: Uso de Vistas Materializadas para Reportes

| Aspecto | Detalle |
|:--------|:--------|
| **Decisión** | Los reportes de BI y dashboards no consultarán directamente las tablas transaccionales, sino vistas materializadas que se refrescan periódicamente. |
| **Justificación** | Calcular métricas complejas (score de interacción, ranking de agentes, conversión de embudo) sobre tablas transaccionales impacta el rendimiento del sistema en horas pico. Las vistas materializadas pre-calculan estos datos. |
| **Frecuencia de refresco** | Cada 15 minutos para dashboards operativos, cada 24 horas para reportes históricos. |

---

> **Fin del Documento de Análisis y Diseño**
>
> **Próximos pasos:**
> 1. Revisión y aprobación por parte del Product Owner y el equipo técnico.
> 2. Actualización del documento con observaciones de la revisión.
> 3. Inicio de la Fase 1 de implementación según el plan aprobado en `implementacion.md`.
> 4. Establecimiento del contrato de mantenimiento y SLAs operativos según sección 3.4.

---

*Documento generado y mantenido por el equipo de desarrollo de GestProp. Versión 1.2 — Mayo 2026.*
