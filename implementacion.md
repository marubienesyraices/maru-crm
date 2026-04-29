# Plan de Implementación — CRM Inmobiliario "Maru Bienes y Raíces"

> **Versión:** 1.0
> **Fecha:** 21 de abril de 2026
> **Duración total estimada:** 30 semanas (7.5 meses)
> **Equipo sugerido:** 2–3 desarrolladores full-stack + 1 QA
> **Metodología:** Scrum (sprints de 2 semanas)

---

## Resumen Ejecutivo

El desarrollo del CRM se organiza en **5 fases secuenciales** que respetan las dependencias del backlog. Cada fase produce un incremento funcional desplegable y verificable.

| Fase | Nombre | Semanas | Story Points | Historias |
|:-----|:-------|:--------|:-------------|:----------|
| 1 | Infraestructura Base y Seguridad | S1–S4 | 57 SP | HU-01.01, HU-02.01, HU-02.02, HU-02.03, HU-03.01, HU-04.01 |
| 2 | Propiedades, Clientes y Portal | S5–S10 | 52 SP | HU-05.01, HU-05.02, HU-05.03, HU-05.04, HU-06.01, HU-06.02, HU-13.01 |
| 3 | Embudo de Ventas, Interacciones y Agenda | S11–S16 | 57 SP | HU-07.01, HU-07.02, HU-08.01, HU-08.02, HU-09.01, HU-09.02, HU-13.02, HU-13.03 |
| 4 | Marketing, BI y Automatización | S17–S22 | 40 SP | HU-10.01, HU-10.02, HU-10.03, HU-11.01, HU-11.02, HU-11.03 |
| 5 | Integraciones, App Móvil y Go-Live | S23–S30 | 21 SP + QA | HU-12.01, HU-12.02, HU-12.03 |
| | **TOTAL** | **30 sem** | **227 SP** | **30 historias** |

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|:-----|:-----------|:-------------|
| **Frontend Web** | React 18 + Vite + TypeScript | SPA moderna, ecosistema maduro |
| **Estado global** | Zustand + TanStack Query | Ligero, caché de servidor automática |
| **Estilos** | CSS Modules / Styled Components | Aislamiento, tematización por tenant |
| **Backend** | NestJS (Node.js) + TypeScript | Modular, decoradores, DI nativa |
| **ORM** | Prisma | Type-safe, migraciones, RLS compatible |
| **Base de datos** | PostgreSQL 16 + PostGIS | RLS, CTE recursivos, geoespacial |
| **Caché / Colas** | Redis + BullMQ | Sesiones, colas asíncronas, pub/sub |
| **Almacenamiento** | Cloudflare R2 | S3-compatible, sin egress fees |
| **Email** | SendGrid | Transaccional + marketing |
| **Mapas** | Mapbox (portal) + Google Maps Geocoding (backend) | Híbrido costo-optimizado |
| **Push** | Firebase Cloud Messaging | Cross-platform |
| **App Móvil** | React Native + Expo | Código compartido con web |
| **CI/CD** | GitHub Actions | Automatización de pipelines |
| **Hosting** | Docker + Railway/Vercel | Costo-eficiente, escalable |
| **CDN/WAF** | Cloudflare | Seguridad perimetral, DNS |
| **Monitoreo** | Sentry + Winston | Errores + logs estructurados |

---

## Fase 1: Infraestructura Base y Seguridad (S1–S4)

**Objetivo:** Construir los cimientos del sistema: multitenancy, autenticación segura, auditoría inmutable y estructura organizacional.

**Story Points:** 57 SP | **Prioridad:** 🔴 Must (100%)

### Sprint 1 (S1–S2): Fundamentos

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Scaffolding del proyecto | Monorepo: `/api` (NestJS), `/web` (React+Vite), `/shared` (tipos) | — |
| Configuración de BD | PostgreSQL + Prisma, migraciones iniciales, seed de datos | — |
| Modelo de Empresas | CRUD de tenants con logo, colores, plan, moneda, zona horaria | HU-01.01 |
| Row-Level Security | Políticas RLS en todas las tablas con `tenant_id`, middleware Prisma | HU-01.01 |
| Módulo de Autenticación | Login con email/password, bcrypt, JWT (access 15min + refresh 7d) | HU-02.01 |
| 2FA con TOTP | Integración Google Authenticator, QR de setup, validación de tokens | HU-02.01 |
| Geocerca y Whitelist | Validación de IP/país en login, config por empresa | HU-02.01 |
| Bloqueo progresivo | 3→15min, 6→1h, 9→24h+admin. Alertas por email | HU-02.01 |

### Sprint 2 (S3–S4): Seguridad y Estructura

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Recuperación de cuenta | Reset de contraseña (enlace 30min, un solo uso), desbloqueo | HU-02.02 |
| Onboarding | Flujo de primer login: contraseña + setup 2FA | HU-02.03 |
| Módulo de Auditoría | Tabla inmutable (sin UPDATE/DELETE), JSON diff, interceptor NestJS | HU-03.01 |
| Jerarquía organizacional | Árbol auto-referencial `id_supervisor`, CTEs recursivos | HU-04.01 |
| RBAC | Roles: SuperAdmin, Admin, Senior, Junior, Cliente. Guards por ruta | HU-04.01 |
| Visibilidad recursiva | Middleware que filtra datos según posición en el árbol | HU-04.01 |
| Tests unitarios | Auth, RLS, auditoría, jerarquía (cobertura ≥ 70%) | — |
| CI/CD pipeline | GitHub Actions: lint, test, build, deploy a staging | — |

**Entregable Fase 1:** Sistema de login funcional con 2FA, multitenancy activo con RLS, auditoría inmutable, roles y jerarquía configurados. Pipeline CI/CD operativo.

---

## Fase 2: Propiedades, Clientes y Portal Público (S5–S10)

**Objetivo:** Implementar los módulos core de negocio: inventario de propiedades, portal web público y gestión de clientes.

**Story Points:** 52 SP | **Prioridad:** 🔴 Must (72%) + 🟡 Should (28%)

### Sprint 3 (S5–S6): Propiedades Core

| Tarea | Descripción | HU |
|:------|:------------|:---|
| CRUD de Propiedades | Tipos, gestión (Venta/Renta/Ambas), precios condicionales, estados | HU-05.01 |
| Ciclo de vida | Máquina de estados: Nuevo→Disponible→Reservada→Vendida/Rentada | HU-05.01 |
| Motor de precios | Precio sugerido con PostGIS (radio 5km, propiedades similares) | HU-05.01 |
| Carga multimedia | Upload a R2, compresión de imágenes, marca de agua configurable | HU-05.02 |
| Geolocalización | Mapbox para visualización, Google Geocoding para captura | HU-05.02 |
| Galería interactiva | Carrusel de fotos/videos con lightbox, drag & drop para reordenar | HU-05.02 |

### Sprint 4 (S7–S8): Expediente y Brochure

| Tarea | Descripción | HU |
|:------|:------------|:---|
| CRUD de Propietarios | Datos, DPI, vinculación a propiedades, detección de duplicados | HU-05.03 |
| Expediente legal | Upload tipificado (escritura, plano, IUSI), alertas de vencimiento | HU-05.03 |
| Carta de comisión | Generación PDF server-side con plantilla configurable por empresa | HU-05.03 |
| Generación de brochure | Worker BullMQ → PDF con template → Upload a R2 → URL con tracking | HU-05.04 |
| Distribución multicanal | Compartir por WhatsApp (click-to-chat), Email y link con tracking | HU-05.04 |

### Sprint 5 (S9–S10): Portal Público y Notificaciones

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Portal público SSR | Next.js o Astro para SEO. Catálogo filtrable de propiedades | HU-06.01 |
| Búsqueda avanzada | Filtros: tipo, precio, zona, habitaciones. Mapa interactivo Mapbox | HU-06.01 |
| Detalle de propiedad | Galería, mapa, descripción, precio (sin datos privados) | HU-06.01 |
| Registro de cliente | Cuenta con verificación por email, perfil de preferencias | HU-06.02 |
| Alertas de matching | Notificación cuando nueva propiedad coincide con preferencias | HU-06.02 |
| Centro de notificaciones | In-app (campana + badge), configuración de canales por tipo | HU-13.01 |
| Tests e2e | Cypress: flujo de registro, búsqueda, filtrado | — |

**Entregable Fase 2:** Inventario de propiedades completo con multimedia y mapas. Portal público SSR con catálogo filtrable. Gestión de propietarios y expediente legal. Brochure PDF con tracking.

---

## Fase 3: Embudo de Ventas, Interacciones y Agenda (S11–S16)

**Objetivo:** Implementar el flujo completo de ventas/rentas, comunicaciones omnicanal y agendamiento de visitas.

**Story Points:** 57 SP | **Prioridad:** 🔴 Must (36 SP) + 🟡 Should (21 SP)

### Sprint 6 (S11–S12): Embudo de Ventas

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Inicio de trámite | Cliente o agente inicia trámite sobre propiedad | HU-07.01 |
| Vista Kanban | Board drag & drop: Interesado→Negociación→Cierre→Finalizado | HU-07.01 |
| Máquina de estados | Validación de transiciones, transacciones atómicas en BD | HU-07.02 |
| Concurrencia | Al pasar a Negociación: reservar propiedad, pausar otros trámites | HU-07.02 |
| Bloqueo por rol | Junior no puede ofertar en propiedad reservada. Senior sí | HU-07.02 |
| Cálculo de comisión | Automático al finalizar trámite según porcentaje definido | HU-07.02 |

### Sprint 7 (S13–S14): Interacciones y Productividad

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Timeline de interacciones | Línea de tiempo: emails, llamadas, notas, WhatsApp | HU-08.01 |
| Registro de interacciones | Formulario rápido con tipo, resumen, archivos adjuntos | HU-08.01 |
| Tareas automáticas | Creación por regla: post-visita, inactividad de lead, vencimientos | HU-08.02 |
| Tracking de email | Pixel de apertura, registro de clics en enlaces | HU-08.02 |
| Productividad | Contador de llamadas/emails por agente, alertas de inactividad | HU-08.02 |
| Búsqueda global | Ctrl+K cross-module, federada con RBAC, debounce 300ms | HU-13.02 |

### Sprint 8 (S15–S16): Agenda y Herramientas

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Agendamiento de visitas | Slots disponibles, prevención de conflictos, buffer configurable | HU-09.01 |
| Invitación .ics | Email con archivo calendar + enlace de reprogramación | HU-09.01 |
| Reprogramación | Portal del cliente: cambiar fecha/hora desde enlace seguro | HU-09.02 |
| Reporte de visita | Formulario obligatorio post-cita (2h después), tarea automática | HU-09.02 |
| Importación masiva | Upload Excel/CSV, validación previa, importación parcial | HU-13.03 |
| Tests e2e | Flujo completo: crear trámite → negociar → cerrar → comisión | — |

**Entregable Fase 3:** Embudo de ventas Kanban con máquina de estados y concurrencia. Timeline de interacciones. Agenda con invitaciones .ics. Búsqueda global. Importación masiva.

---

## Fase 4: Marketing, BI y Automatización (S17–S22)

**Objetivo:** Implementar herramientas de automatización de marketing, inteligencia de negocios y gamificación.

**Story Points:** 40 SP | **Prioridad:** 🟡 Should (32 SP) + 🟢 Could (8 SP)

### Sprint 9 (S17–S18): Marketing

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Publicación en Meta | Graph API: publicar/programar en Facebook/Instagram | HU-10.01 |
| Preview y programación | Vista previa, programación futura, historial de publicaciones | HU-10.01 |
| Plantillas de email | Editor de plantillas, variables dinámicas (nombre, propiedad) | HU-10.02 |
| Correos automatizados | Triggers: nuevo trámite, cambio de estado, bienvenida, recordatorio | HU-10.02 |
| Chatbot portal | Widget de chat en portal público, captura de leads 24/7 | HU-10.03 |

### Sprint 10 (S19–S20): Inteligencia de Negocios

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Dashboard de propiedades | Visitas web, leads generados, brochures descargados por propiedad | HU-11.01 |
| Vistas materializadas | Pre-cálculo de métricas, refresco cada 15min (operativo) / 24h (histórico) | HU-11.01 |
| Reportes de desempeño | Cierres por agente, comisiones acumuladas, conversión de embudo | HU-11.02 |
| Reportes exportables | PDF y Excel con filtros por fecha, agente, zona | HU-11.02 |
| Ranking anónimo | Gamificación: posición relativa sin nombres (RBAC), badges | HU-11.03 |

### Sprint 11 (S21–S22): Refinamiento y Optimización

| Tarea | Descripción |
|:------|:------------|
| Optimización de consultas | Índices, query plan analysis, caché Redis para dashboards |
| UX refinement | Animaciones, loading states, empty states, error handling |
| Accesibilidad | Auditoría WCAG 2.1 AA, correcciones |
| Documentación API | Swagger/OpenAPI auto-generada desde decoradores NestJS |

**Entregable Fase 4:** Publicación automática en redes sociales. Campañas de email con plantillas. Dashboards BI con métricas en tiempo real. Ranking gamificado.

---

## Fase 5: Integraciones, App Móvil y Go-Live (S23–S30)

**Objetivo:** Integrar servicios externos, desarrollar la app móvil, ejecutar QA completo y desplegar a producción.

**Story Points:** 21 SP + QA integral | **Prioridad:** 🟢 Could (13 SP) + 🟡 Should (8 SP)

### Sprint 12 (S23–S24): Integraciones Externas

| Tarea | Descripción | HU |
|:------|:------------|:---|
| Sindicación a portales | API Zillow, MercadoLibre, Encuentra24. Sync bidireccional | HU-12.01 |
| Firma digital | Integración DocuSign/Adobe Sign para contratos | HU-12.02 |
| Videollamadas | Integración Zoom/Google Meet para visitas virtuales | HU-12.02 |

### Sprint 13 (S25–S26): App Móvil

| Tarea | Descripción | HU |
|:------|:------------|:---|
| App React Native | Expo: dashboard, notificaciones, agenda, propiedades | HU-12.03 |
| Push notifications | FCM/APNs, enlace a centro de notificaciones | HU-12.03 |
| Modo offline | Caché local para consultas básicas sin conexión | HU-12.03 |

### Sprint 14 (S27–S28): QA Integral

| Tarea | Descripción |
|:------|:------------|
| Tests E2E completos | Cypress: todos los flujos críticos (auth, propiedades, embudo, citas) |
| Tests de seguridad | Penetration testing: OWASP Top 10, RLS bypass attempts |
| Tests de carga | k6/Artillery: 50 usuarios concurrentes, 10K propiedades |
| Tests de regresión | Suite automatizada para todos los módulos |
| UAT (User Acceptance) | Testing con usuarios reales del equipo inmobiliario |

### Sprint 15 (S29–S30): Go-Live

| Tarea | Descripción |
|:------|:------------|
| Migración de datos | Scripts para importar datos existentes (Excel) al CRM |
| Infraestructura prod | Docker, Railway/Vercel, Cloudflare DNS/WAF/R2 |
| Monitoreo | Sentry (errores), Winston (logs), uptime monitoring |
| Respaldos | Backup automático PostgreSQL cada 24h, retención 30 días |
| Capacitación | Manual de usuario por módulo, videos de onboarding |
| Go-Live | Despliegue a producción + periodo de estabilización (2 sem) |

**Entregable Fase 5:** Integraciones con portales externos, firma digital y videollamadas. App móvil con push. Sistema probado (E2E, seguridad, carga). Desplegado en producción.

---

## Cronograma Visual

```
         S1   S2   S3   S4   S5   S6   S7   S8   S9   S10  S11  S12  S13  S14  S15  S16
FASE 1   ████ ████ ████ ████
FASE 2                       ████ ████ ████ ████ ████ ████
FASE 3                                                      ████ ████ ████ ████ ████ ████

         S17  S18  S19  S20  S21  S22  S23  S24  S25  S26  S27  S28  S29  S30
FASE 4   ████ ████ ████ ████ ████ ████
FASE 5                                 ████ ████ ████ ████ ████ ████ ████ ████
```

---

## Estimación de Costos

### Inversión de Desarrollo

| Fase | Semanas | Costo (2-3 devs) |
|:-----|:--------|:-----------------|
| Fase 1 — Infraestructura y Seguridad | 4 | $8,000–$12,000 USD |
| Fase 2 — Propiedades y Portal | 6 | $12,000–$18,000 USD |
| Fase 3 — Embudo, Interacciones, Agenda | 6 | $12,000–$18,000 USD |
| Fase 4 — Marketing y BI | 6 | $12,000–$18,000 USD |
| Fase 5 — Integraciones, App y Go-Live | 8 | $16,000–$24,000 USD |
| **TOTAL** | **30 sem** | **$60,000–$90,000 USD** |

### Costos Operativos Mensuales (Post-Launch)

| Servicio | Costo Mensual |
|:---------|:-------------|
| Hosting (Railway/Vercel) | $50–$150 USD |
| PostgreSQL (managed) | $30–$100 USD |
| Cloudflare R2 | $10–$50 USD |
| Redis (managed) | $15–$30 USD |
| SendGrid | $20–$50 USD |
| Sentry | $0–$26 USD |
| Dominio + SSL | $2–$5 USD |
| **Total mensual** | **$127–$411 USD** |

---

## Gestión de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|:-------|:-------------|:--------|:-----------|
| Retraso en integraciones con APIs externas (Meta, DocuSign) | Media | Alto | Diseño con interfaces desacopladas. Implementar mocks tempranos. |
| Resistencia al cambio de usuarios | Media | Medio | Capacitación progresiva. Lanzamiento por fases. |
| Complejidad del RLS/Multitenancy | Baja | Alto | Tests automatizados de aislamiento. Code reviews estrictos. |
| Rate limits de APIs externas | Media | Medio | Colas con reintentos exponenciales. Caché agresivo. |
| Cambio de alcance mid-project | Alta | Alto | Backlog priorizado con MoSCoW. Change requests formales. |
| Problemas de performance con +10K propiedades | Baja | Medio | Vistas materializadas, paginación cursor-based, índices estratégicos. |

---

## Criterios de Aceptación por Fase

### Fase 1 — Infraestructura ✅
- [ ] Login con 2FA funcional
- [ ] RLS activo y verificado (test de aislamiento cross-tenant)
- [ ] Auditoría inmutable registrando todas las acciones
- [ ] Roles RBAC operativos con jerarquía recursiva
- [ ] Pipeline CI/CD ejecutándose en cada push

### Fase 2 — Propiedades ✅
- [ ] CRUD completo de propiedades con estados y precios condicionales
- [ ] Carga de multimedia con marca de agua y geolocalización
- [ ] Brochure PDF generado server-side con tracking
- [ ] Portal público con SSR indexado por Google
- [ ] Centro de notificaciones in-app

### Fase 3 — Embudo ✅
- [ ] Kanban board con drag & drop funcional
- [ ] Máquina de estados con concurrencia y bloqueo
- [ ] Timeline de interacciones con tracking de email
- [ ] Agendamiento de visitas con .ics y reporte obligatorio
- [ ] Búsqueda global federada (Ctrl+K)

### Fase 4 — Marketing & BI ✅
- [ ] Publicación en Facebook/Instagram desde el CRM
- [ ] Campañas de email con plantillas configurables
- [ ] Dashboard de métricas con vistas materializadas
- [ ] Reportes exportables (PDF/Excel)
- [ ] Ranking anónimo con gamificación

### Fase 5 — Go-Live ✅
- [ ] App móvil con push notifications
- [ ] Todas las integraciones externas operativas
- [ ] Suite de tests E2E con ≥ 70% cobertura
- [ ] Test de carga aprobado (50 usuarios concurrentes)
- [ ] Sistema desplegado en producción con monitoreo activo

---

## Definición de "Done" (DoD)

Un ítem del backlog se considera **terminado** cuando:

1. ✅ El código pasa todos los tests unitarios y de integración
2. ✅ El código ha sido revisado por al menos 1 peer (code review)
3. ✅ La funcionalidad cumple todos los criterios de aceptación de la HU
4. ✅ La documentación de API está actualizada (Swagger)
5. ✅ El registro de auditoría captura las acciones del módulo
6. ✅ El RLS está verificado (no hay fuga de datos cross-tenant)
7. ✅ La funcionalidad es responsive (≥ 320px)
8. ✅ Desplegado en ambiente de staging sin errores

---

> **Fin del Plan de Implementación**
>
> **Documentos relacionados:**
> - [Requerimientos.md](file:///c:/proyectos/MaruBienesyRaices/CRM/web2/Requerimientos.md) — Requisitos funcionales y no funcionales
> - [backlog.md](file:///c:/proyectos/MaruBienesyRaices/CRM/web2/backlog.md) — Backlog priorizado con 30 historias
> - [Analisis_y_Diseno.md](file:///c:/proyectos/MaruBienesyRaices/CRM/web2/Analisis_y_Diseno.md) — Arquitectura, UML y diagramas de secuencia
> - [competencia.md](file:///c:/proyectos/MaruBienesyRaices/CRM/web2/competencia.md) — Análisis competitivo y diferenciadores
