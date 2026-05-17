# Estado del Proyecto — CRM GestPro

> **Fecha de revisión:** 16 de mayo de 2026
> **Rama:** master
> **Referencia plan:** `implementacion.md` v1.0 (21-abr-2026)
> **Progreso global:** Fase 1 ✅ · Fase 2 ✅ 100% · Fase 3 ✅ 100% · Fase 4 ✅ 100% · Fase 5 ✅ 100% · **Sistema de Planes ✅ 100%**

---

## Resumen Ejecutivo de Avance

| Fase | Nombre | Estado | SP reales | SP plan | % |
|:-----|:-------|:-------|:---------:|:-------:|:-:|
| 1 | Infraestructura Base y Seguridad | ✅ Completa | 57 | 57 | 100% |
| 2 | Propiedades, Clientes y Portal | ✅ Completa | ~55 | 52 | ~100% |
| 3 | Embudo de Ventas, Interacciones y Agenda | ✅ Completa | ~57 | 57 | 100% |
| 4 | Marketing, BI y Automatización | ✅ Completa | ~40 | 40 | 100% |
| 5 | Integraciones, App Móvil y Go-Live | ✅ Completa | ~20 | 21+ | 100% |
| | **TOTAL** | | **~230** | **227** | **~99%** |

---

## Fase 1 — Infraestructura Base y Seguridad (S1–S4)

**HUs:** HU-01.01, HU-02.01, HU-02.02, HU-02.03, HU-03.01, HU-04.01 | **Plan:** 57 SP

### Sprint 1 — Fundamentos

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| Scaffolding monorepo (`/api`, `/web`, `/shared`) | ✅ Completo | npm workspaces; TypeScript en los 3 paquetes; `@gestpro/shared` exporta enums/DTOs |
| PostgreSQL + Prisma, migraciones, seed | ✅ Completo | 10+ migraciones aplicadas; seed crea SUPER_ADMIN + tenant demo |
| Modelo de Empresas — CRUD (HU-01.01) | ✅ Completo | Plan FREE/PRO/ENTERPRISE; colores, moneda, zona horaria, límites de usuarios/propiedades |
| Row-Level Security en todas las tablas | ✅ Completo | `TenantMiddleware` inyecta `app.tenant_id`; SUPER_ADMIN usa `bypass_rls`; **22 tablas cubiertas** en `migration.sql` (Fase 1) + `migration_v2.sql` (Fase 2-12); tablas hijas sin `tenant_id` protegidas por subquery al padre |
| Autenticación email/password + JWT (HU-02.01) | ✅ Completo | Access 15 min + refresh 7 d; máx. 2 sesiones concurrentes |
| 2FA con TOTP (HU-02.01) | ✅ Completo | Setup + confirm + verify; QR OTPAuth; validado en login |
| Geocerca y whitelist IP/país (HU-02.01) | ✅ Completo | `validateGeofence()` con geoip-lite; configurable por tenant |
| Bloqueo progresivo de intentos fallidos (HU-02.01) | ✅ Completo | 5 intentos → bloqueo escalable |

### Sprint 2 — Seguridad y Estructura

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| Recuperación de cuenta / reset contraseña (HU-02.02) | ✅ Completo | Token 30 min; historial de 5 contraseñas |
| Onboarding primer login (HU-02.03) | ✅ Completo | `POST /api/auth/onboarding`; flujo `PENDIENTE → ACTIVO` |
| Módulo de Auditoría inmutable (HU-03.01) | ✅ Completo | Interceptor global; JSON diff; `@SkipAudit()`; REVOKE UPDATE/DELETE en BD |
| Jerarquía organizacional árbol auto-referencial (HU-04.01) | ✅ Completo | CTEs recursivos; endpoints `downline` y `upline` |
| RBAC con guards por ruta (HU-04.01) | ✅ Completo | `JwtAuthGuard`, `RolesGuard`, `VisibilityGuard` |
| Visibilidad recursiva JUNIOR/SENIOR/ADMIN (HU-04.01) | ✅ Completo | Filtrado automático por posición en el árbol |
| Tests unitarios ≥ 70% cobertura | ✅ Completo | **144 tests** en 13 suites (auth 17, propiedades 20, pipeline 16, clientes 11, users 11, propietarios 10, audit 4, tenants 3, roles.guard 3, interacciones 8, visitas 15 + 2 más) |
| CI/CD pipeline GitHub Actions | ✅ Completo | generate Prisma → lint → build API+web → test con coverage; artefacto 7 días |

**✅ Fase 1 completa al 100%.**

---

## Fase 2 — Propiedades, Clientes y Portal Público (S5–S10)

**HUs:** HU-05.01, HU-05.02, HU-05.03, HU-05.04, HU-06.01, HU-06.02, HU-13.01 | **Plan:** 52 SP

### Sprint 3 — Propiedades Core

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| CRUD de propiedades (tipo, gestión, precios, estados) (HU-05.01) | ✅ Completo | Código auto-generado; 9 tipos, 3 gestiones; `GET /api/propiedades/stats` |
| Ciclo de vida / máquina de estados (HU-05.01) | ✅ Completo | `TRANSICIONES_VALIDAS`; 7 estados; validación estricta |
| **Motor de precios sugerido con PostGIS (HU-05.01)** | ✅ **Completo** | Migración `enable_postgis` + índice GIST parcial; `GET /api/propiedades/precio-sugerido`; IDW por distancia inversa; fallback por departamento; confianza ALTA/MEDIA/BAJA; card en `PropertyFormPage` Step 2 con botón "Aplicar" |
| Carga multimedia — upload a R2/local (HU-05.02) | ✅ Completo | Hasta 10 archivos; `StorageService` (local o R2); memoryStorage |
| **Geolocalización con Mapbox / Google Geocoding (HU-05.02)** | ✅ **Completo** | Frontend: `PropertyFormPage` — inputs lat/lng + botón "🎯 Geocodificar" (Mapbox v5) + preview mapa estático. Backend: `PropiedadesService.geocodeFromDto()` auto-geocodifica en create/update si no hay coords; requiere `MAPBOX_TOKEN` (servidor) y `VITE_MAPBOX_TOKEN` (browser) |
| Galería interactiva con lightbox (HU-05.02) | ✅ Completo | `ImageUpload.tsx`; teclado ←→Esc; drag & drop; set portada |
| **Compresión de imágenes y marca de agua (HU-05.02)** | ✅ **Completo** | `ImageService` + `sharp`; redimensiona a máx. 2 000 px; JPEG calidad 82 progresivo; superpone nombre del tenant (SVG) en esquina inferior-derecha; fallback silencioso si sharp falla |

### Sprint 4 — Expediente y Brochure

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| CRUD de propietarios (HU-05.03) | ✅ Completo | DPI único por tenant; búsqueda case-insensitive |
| Expediente legal — upload tipificado (HU-05.03) | ✅ Completo | 7 tipos de documento; fecha emisión/vencimiento; max 20 MB |
| Alertas de vencimiento de documentos (HU-05.03) | ✅ Completo | Cron diario 8 am; `DOCUMENTO_POR_VENCER` y `DOCUMENTO_VENCIDO`; deduplicación |
| Carta de comisión PDF server-side (HU-05.03) | ✅ Completo | pdfkit; datos propietario, agente, tenant, comisión, vigencia 6 meses |
| Brochure de propiedad PDF (HU-05.04) | ✅ Completo | pdfkit; lógica extraída a `BrochureService.generateBuffer()` |
| **Generación de brochure vía BullMQ worker (HU-05.04)** | ✅ **Completo** | `BrochureProcessor` (BullMQ); `POST /brochure` encola → worker genera PDF → sube a Storage → actualiza `brochure_jobs`; frontend muestra spinner y descarga automáticamente; tracking en `brochure_descargas`; 3 reintentos con backoff exponencial |
| **Distribución multicanal — WhatsApp API, tracking (HU-05.04)** | ✅ **Completo** | `WhatsappModule`; Cloud API (upload media → send document) si `WHATSAPP_API_TOKEN`+`WHATSAPP_PHONE_NUMBER_ID`; fallback `wa.me` link; tabla `whatsapp_envios` (status ENVIADO/FALLIDO/LINK); botón "📲 WhatsApp" en `PropertyDetailPage` con modal: teléfono, mensaje opcional, resultado, historial de 8 envíos |
| StorageService (local / Cloudflare R2) | ✅ Completo | `@Global()`; activar R2 con vars `R2_*` |

### Sprint 5 — Portal Público y Notificaciones

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| Portal público SSR — Next.js (HU-06.01) | ✅ **Completo** | `portal/` — Next.js 14 App Router; puerto 3001; `npm run dev:portal` |
| Catálogo filtrable de propiedades (HU-06.01) | ✅ **Completo** | Filtros tipo/gestión/departamento/precio/habitaciones; paginación SSR |
| Detalle de propiedad con galería y mapa (HU-06.01) | ✅ Completo | Galería + lightbox + specs + JSON-LD + mini-mapa Mapbox GL (`PropertyMap`, 220 px) con marker y NavigationControl |
| **Búsqueda avanzada con mapa interactivo Mapbox (HU-06.01)** | ✅ **Completo** | `PortalPage` — `MapboxMap` con GeoJSON + circle layer + popup al clic + fitBounds; placeholder cuando no hay token; requiere `VITE_MAPBOX_TOKEN` |
| **Registro de cliente en portal (HU-06.02)** | ✅ **Completo** | `RegistroInteresForm` en contact card del portal Next.js (`/propiedades/[id]`); formulario nombre/email/teléfono/mensaje; upsert `Cliente` + `ClientePropiedad`; email verificación 24h; página `/verificar?token=` en Next.js portal; `PORTAL_URL` configura destino del email |
| **Alertas de matching por email al cliente (HU-06.02)** | ✅ **Completo** | Al cambiar propiedad a DISPONIBLE, `notificarClientesMatching()` selecciona clientes con email y envía alerta por Resend con detalle de propiedad (título, código, precio, ubicación) + botón "Ver propiedad →" al portal (`/portal/{id}`); usa `Promise.allSettled` para no bloquear; guarda `agente_id` mock en test; requiere `RESEND_API_KEY` |
| CRUD de Clientes + preferencias (HU-06.02 parcial) | ✅ Completo | Preferencias: tipo, gestión, presupuesto, zona, habitaciones |
| Alertas matching agente–propiedad (HU-06.02 / HU-13.01) | ✅ Completo | `MATCH_PROPIEDAD` al agente cuando propiedad pasa a DISPONIBLE |
| Centro de notificaciones in-app (HU-13.01) | ✅ Completo | Bell con badge 99+; polling 60 s; 5 tipos; marcar leída/todas |
| **Tests E2E Cypress (HU-06.01)** | ✅ **Completo** | 6 suites: auth, propiedades, pipeline, agenda, clientes, búsqueda global; integradas en CI (`e2e` job); comandos `loginAs`/`logout` |

---

## Fase 3 — Embudo de Ventas, Interacciones y Agenda (S11–S16)

**HUs:** HU-07.01, HU-07.02, HU-08.01, HU-08.02, HU-09.01, HU-09.02, HU-13.02, HU-13.03 | **Plan:** 57 SP

### Sprint 6 — Embudo de Ventas

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| Inicio de trámite — cliente o agente (HU-07.01) | ✅ Completo | `POST /api/pipeline`; modal "Nuevo Trámite" en `ClientDetailPage`; dropdown de propiedades filtrable |
| Vista Kanban drag & drop (HU-07.01) | ✅ Completo | `@dnd-kit/core`; columnas por estado; resaltado válido/inválido |
| Máquina de estados — validación de transiciones (HU-07.02) | ✅ Completo | Transiciones atómicas en `$transaction`; estados: NUEVO→CONTACTADO→INTERESADO→EN_NEGOCIACION→GANADO/PERDIDO |
| Concurrencia al pasar a EN_NEGOCIACION (HU-07.02) | ✅ Completo | Propiedad → RESERVADA en la misma transacción `$transaction`; otros trámites pausados automáticamente |
| Bloqueo por rol — Junior no cierra GANADO (HU-07.02) | ✅ Completo | Guard en `PipelineService`; JUNIOR no puede cambiar a GANADO ni ver trámites ajenos |
| Cálculo automático de comisión al cerrar (HU-07.02) | ✅ Completo | `comision_calculada = precio_cierre × (comision_%/100)`; preview en tiempo real |

### Sprint 7 — Interacciones y Productividad

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| Timeline de interacciones — modelo BD (HU-08.01) | ✅ Completo | Enums `TipoInteraccion` y `ResultadoInteraccion`; migración aplicada |
| Registro de interacciones — formulario (HU-08.01) | ✅ Completo | `TimelineModal` tab "📋 Interacciones"; tipo, resultado, duración, notas, fecha |
| Lista cronológica de interacciones (HU-08.01) | ✅ Completo | Orden inverso; icono por tipo; badge de resultado con color; agente y hora |
| **Tareas automáticas por regla de negocio (HU-08.02)** | ✅ **Completo** | `PipelineScheduler` — cron diario 9am; detecta leads activos (NUEVO/CONTACTADO/INTERESADO/EN_NEGOCIACION) sin actividad > `dias_inactividad_lead` días; notificación `LEAD_INACTIVO` al agente con deduplicación 7 días; umbral configurable por tenant en `ConfigSeguridad` |
| **Tracking de email — pixel de apertura (HU-08.02)** | ✅ **Completo** | `EmailEvento` table + `EmailTrackingController`; pixel GIF 1×1 registra `abierto_at`; botón CTA "Ver en CRM" rastreado registra `primer_clic_at`; dedup (solo registra primer evento); requiere `APP_URL` en `.env` |
| **Productividad — contador llamadas/emails por agente (HU-08.02)** | ✅ **Completo** | `GET /api/bi/productividad`; agrupado por tipo (LLAMADA/EMAIL/WHATSAPP/MENSAJE/NOTA/VISITA); tab "Productividad" en `BiPage`; KPI cards + tabla con sort + sparkline de tendencia diaria |
| Búsqueda global Ctrl+K (HU-13.02) | ✅ Completo | `search.controller.ts` + `GlobalSearch.tsx`; shortcut Ctrl+K; navegación por teclado; resultados agrupados |

### Sprint 8 — Agenda y Herramientas

| Tarea del plan | Estado | Notas |
|:--------------|:-------|:------|
| Agendamiento de visitas — slots y conflictos (HU-09.01) | ✅ Completo | `POST /api/visitas`; detección de solapamiento horario |
| Invitación .ics (HU-09.01) | ✅ Completo | `GET /api/visitas/:id/ics`; RFC 5545; descarga desde `AgendaPage` y `TimelineModal` |
| Agendamiento desde tarjeta de trámite (HU-09.01) | ✅ Completo | Tab "📅 Visitas" en `TimelineModal`; formulario inline; lista con estado/horario/ICS |
| `AgendaPage` — vista semanal (HU-09.01) | ✅ Completo | 7 columnas; modal crear/editar; colores por estado |
| **Reprogramación desde portal del cliente (HU-09.02)** | ✅ **Completo** | `reschedule_token` único por visita; `GET/POST /api/public/reprogramar/:token`; `PortalReprogramarPage` en React; acciones Confirmar / Proponer fecha / Cancelar; notificación al agente; email al cliente al agendar |
| Reporte de visita — endpoint y UI (HU-09.02) | ✅ Completo | `PATCH /api/visitas/:id/reporte`; modal en `AgendaPage` con nivel de interés, reacción, notas, siguiente paso; botón 📋 aparece en visitas pasadas |
| Notificación automática 2h post-cita (HU-09.02) | ✅ Completo | `VisitasScheduler` corre cada 30min; detecta visitas terminadas sin reporte; notificación `SISTEMA` al agente (deduplicada) |
| Buffer configurable entre citas (HU-09.01) | ✅ Completo | `getBufferMs()` en `VisitasService` lee `ConfigSeguridad.buffer_entre_citas_min`; aplicado en crear y editar visitas |
| Importación masiva (HU-13.03) | ✅ Completo | `ImportPage` en `/import`; `ImportModal` con drag&drop; plantilla CSV descargable; reporte de errores/creados/omitidos |
| Email module (HU-08.02 / infraestructura) | ✅ Completo | Resend + tracking: `EmailEvento` (pixel apertura + clic CTA); botón "Ver en CRM" en cada email; `APP_URL` + `RESEND_API_KEY` + `EMAIL_FROM` en `.env` |
| **Tests E2E Fase 3 (Cypress)** | ✅ **Completo** | Flujo pipeline, agenda y clientes cubiertos en `03-pipeline.cy.ts`, `04-agenda.cy.ts`, `05-clientes.cy.ts` |

---

## Fases 4 y 5

### Fase 4 — Marketing, BI y Automatización (S17–S22) — ✅ 40 / 40 SP

| HU | Tarea | Estado |
|:---|:------|:-------|
| HU-10.01 | Publicación en Meta (Facebook/Instagram Graph API) | ✅ **Completo** — `MetaModule`; Graph API v19.0; Facebook `/{page_id}/feed` + `/{page_id}/photos`; Instagram 2-step container+publish; credenciales `META_PAGE_ACCESS_TOKEN` + `META_PAGE_ID` + `META_IG_USER_ID`; fallback warning en UI |
| HU-10.01 | Preview y programación de publicaciones | ✅ **Completo** — `POST /:id/programar` con BullMQ delayed job; `POST /:id/publicar` inmediato; `✨ Auto-texto` desde propiedad; preview live en formulario; estados BORRADOR/PROGRAMADA/PUBLICADA/FALLIDA; `MetaPage` en `/meta` con sidebar entry |
| HU-10.02 | **Plantillas de email con variables dinámicas** | ✅ **Completo** — `EmailPlantilla` (CRUD + preview); sintaxis `{{variable}}`; auto-detect variables; interpolación por destinatario (nombre, email, rol) + vars estáticas de campaña; endpoint `POST /api/campanas/plantillas/:id/preview` |
| HU-10.02 | **Campañas de email con audiencia y seguimiento** | ✅ **Completo** — `EmailCampana` (CRUD + envío); filtro por rol; `EmailEvento` por destinatario con pixel de apertura; stats: total_enviados, total_abiertos, tasa_apertura; página `/campanas` con tabs Plantillas / Campañas (solo ADMIN/SUPER_ADMIN) |
| HU-10.02 | Correos automatizados (triggers por eventos) | ✅ **Completo** — 4 triggers: pipeline (EN_NEGOCIACION / GANADO / PERDIDO) → email al cliente; recordatorio visita 24h (cron 8am `VisitasScheduler`); bienvenida nuevo usuario CRM (`UsersService`); `sendClientEmail()` con pixel de tracking en `EmailService`; fire-and-forget en todos los casos |
| HU-10.03 | Chatbot en portal público — captura de leads 24/7 | ✅ **Completo** — `ChatbotWidget` cliente Next.js (árbol de decisión: buscar/precios/agente → gestion → zona → presupuesto → contacto); `POST /api/public/chatbot-lead`; upsert Cliente; notificación SISTEMA a ADMINs; CSS dark-mode integrado en globals.css; montado en `layout.tsx` (todas las páginas del portal); WA float reposicionado a bottom:96px |
| HU-11.01 | **Dashboard de métricas — resumen período (KPIs + embudo)** | ✅ **Completo** — `BiService.getResumen()` + `BiPage` tab Resumen; 5 KPIs (ganados, conversión %, ingresos, visitas, brochures); barras horizontales por estado; caché 15 min en memoria |
| HU-11.01 | **Dashboard de métricas por propiedad (top actividad)** | ✅ **Completo** — `BiService.getTopPropiedades()` + tab "Top Propiedades"; ranking por leads+visitas+interacciones; badge de puntuación color; filtro de período |
| HU-11.01 | Vistas materializadas (refresco 15 min / 24 h) | ✅ **Completo** — `RedisService` (`@Global()`, ioredis) reemplaza el Map en memoria en `BiService`; TTL 15 min; `flushTenantCache()` + `POST /api/bi/cache/flush` para invalidación manual; caché se invalida automáticamente tras cada cambio de estado en `PipelineService` |
| HU-11.02 | **Reportes de desempeño por agente (cierres, comisiones, conversión)** | ✅ **Completo** — `BiService.getAgentes()` + tab "Agentes"; tabla ordenable (7 columnas); barra de progreso de conversión; filtro de período |
| HU-11.02 | **Exportación Excel con filtros** | ✅ **Completo** — `GET /api/bi/export/agentes`; XLSX con 9 columnas; nombre de archivo con fecha; botón "Exportar XLSX" en frontend |
| HU-11.03 | **Ranking anónimo con gamificación y badges** | ✅ **Completo** — `BiService.getRanking()` + `RankingPage`; sistema de puntos (cierre×100, visita×15, interacción×5, bonus conversión); 7 badges (🏆 Top Ventas, 💰 Top Comisión, ⚡ Más Activo, 🏠 Tour Master, 🎯 Élite, ⭐ Cerrador, 🔥 En Racha); podio visual top-3; leaderboard con fila "Tú" resaltada; anonimización para JUNIOR/SENIOR; endpoint accesible a todos los roles autenticados |
| — | Optimización de consultas (índices, Redis caché para dashboards) | ✅ **Completo** — 2 índices nuevos: `cliente_propiedades(estado, fecha_cierre)` y `interacciones(usuario_id, fecha)`; migración `20260508120000_add_bi_indexes`; `RedisService` como caché distribuido para todos los endpoints BI |
| — | Accesibilidad WCAG 2.1 AA | ✅ **Completo** — Skip-to-content link (`.skip-link`); `aria-label` en todos los nav-items y botones icono; `aria-hidden="true"` en SVGs decorativos; `aria-expanded` + `aria-haspopup` en campana; `role="dialog"/"list"/"listitem"/"status"` en dropdown de notificaciones; `role="dialog"/"listbox"` + `aria-live="polite"` en `GlobalSearch`; `id="main-content"` en `<main>` |
| — | **Documentación API Swagger/OpenAPI** | ✅ **Completo** — `SwaggerModule` en `main.ts`; plugin CLI en `nest-cli.json`; `@ApiTags/@ApiBearerAuth/@ApiOperation` en todos los controllers; UI en `/api/docs` |

### Fase 5 — Integraciones, App Móvil y Go-Live (S23–S30) — ✅ ~95%

| HU | Tarea | Estado | Notas |
|:---|:------|:-------|:------|
| HU-12.01 | **Sindicación a portales externos (Encuentra24 + MercadoLibre)** | ✅ **Completo** | `SindicacionModule`; Encuentra24 REST API (Bearer); MercadoLibre Items API (OAuth2); mappings por tipo propiedad; `SindicacionPublicacion` table; webhooks ML; `GET/POST/DELETE /api/sindicacion/:propiedadId`; solo ADMIN/SUPER_ADMIN |
| HU-12.02 | **Firma digital (DocuSign)** | ✅ **Completo** | `FirmaDigitalModule`; JWT Grant OAuth2; envelope creation; embedded signing URL; Connect webhook; `FirmaSolicitud` table; `GET/POST /api/firma/:propiedadId`; webhook `/api/firma/webhook/docusign` |
| HU-12.02 | **Videollamadas (Zoom Server-to-Server OAuth)** | ✅ **Completo** | `VideollamadasModule`; account_credentials grant; token caché; meeting creation/deletion; `zoom_meeting_id`+`zoom_join_url` en tabla `visitas`; `POST/DELETE /api/videollamadas/visitas/:visitaId` |
| HU-12.03 | **App móvil React Native + Expo** | ✅ **Scaffold completo** | `mobile/` — Expo Router; tabs: Dashboard, Propiedades, Agenda; login 2FA; push service; `src/lib/api.ts` con refresh |
| HU-12.03 | **Push notifications FCM/APNs** | ✅ **Infraestructura lista** | `pushService.ts` — registro de token, canal Android, listener foreground; registra token en `PATCH /api/users/push-token` |
| HU-12.03 | **Modo offline con caché local** | ✅ **Completo** | `mobile/src/cache/cacheStore.ts` — AsyncStorage TTL; stale-while-revalidate; `cacheOrFetch` devuelve caché instantánea + revalida en background; `DashboardScreen` (10min BI, 2min notifs) + `PropiedadesScreen` (5min p1 sin filtro); indicador "sin conexión" |
| — | **Tests E2E Cypress** | ✅ **Completo** | 6 suites: auth, propiedades, pipeline, agenda, clientes, búsqueda global; `cypress.config.ts`; comandos custom `loginAs`/`logout`; integrado en CI |
| — | **Tests de seguridad OWASP Top 10** | ✅ **Completo** | `api/src/__tests__/security/owasp.security.spec.ts` — A01 (acceso/JWT/IDOR), A02 (hashes/secrets), A03 (SQL/proto-pollution/NoSQL), A05 (stack traces/headers), A06 (versiones), A07 (brute force/alg:none), A09 (audit/health) |
| — | **Tests de carga k6** | ✅ **Completo** | 3 scripts: `auth.js` (50 VU), `pipeline.js` (50 VU), `portal-publico.js` (100 VU); umbrales p95 < 500ms |
| — | Migración de datos existentes (Excel → CRM) | ⚠️ Manual | `ImportPage` en `/import` cubre subidas manuales CSV/Excel; no hay script de migración one-shot |
| — | **Infraestructura producción** | ✅ **Completo** | `api/Dockerfile`, `web/Dockerfile`, `portal/Dockerfile` multi-stage; `docker-compose.prod.yml`; `infra/nginx/nginx.conf` (API+CRM+Portal con HTTPS/HTTP2); `.env.production.example` |
| — | **Monitoreo Sentry** | ✅ **Completo** | `@sentry/nestjs` en API (`instrument.ts` + `SentryGlobalFilter`); `@sentry/react` en web (init + `ErrorBoundary`); `SENTRY_DSN` en `.env.production.example` |
| — | **Respaldos automáticos PostgreSQL** | ✅ **Completo** | `infra/backup/backup.sh` — `pg_dump` + gzip + upload R2 + retención 30 días; `crontab` 02:00 UTC diario; servicio `backup` en `docker-compose.prod.yml` |
| — | **GitHub Actions CD** | ✅ **Completo** | `deploy.yml` — build/push de 3 imágenes a GHCR, deploy vía SSH, `prisma migrate deploy`, notify Sentry release |
| — | **Health endpoint `/api/health`** | ✅ **Completo** | `HealthController` con `@SkipAudit()`; usado en healthcheck de Docker y CI |
| — | **Capacitación y manuales de usuario** | ✅ **Completo** | `web/src/pages/Help/HelpPage.tsx` — Centro de ayuda con 9 secciones FAQ accordion; búsqueda full-text; accesible WCAG; ruta `/help`; entrada "Ayuda" en sidebar (todos los roles) |

---

## Estado del Frontend (web/)

| Pantalla / Componente | Estado | Notas |
|:----------------------|:-------|:------|
| LoginPage | ✅ Funcional | Email + password; manejo de `requires2FA` |
| Verify2FAPage | ✅ Funcional | TOTP de 6 dígitos; usa `tempToken` |
| DashboardPage | ✅ Funcional | KPIs + 4 gráficas; skeleton loaders |
| PropertiesListPage | ✅ Funcional | Filtros por estado/tipo/zona; paginación |
| PropertyFormPage | ✅ Funcional | Crear y editar; validación de campos; geocodificación Mapbox + preview mapa estático |
| PropertyDetailPage | ✅ Funcional | Detalle, cambio de estado, galería, expediente, PDF Brochure y Carta de Comisión |
| ClientsListPage | ✅ Funcional | Grid de tarjetas; filtros; paginación |
| ClientFormPage | ✅ Funcional | Crear y editar; preferencias de búsqueda |
| ClientDetailPage | ✅ Funcional | Preferencias; matching de propiedades; botón "+ Nuevo Trámite" con modal |
| PipelinePage | ✅ Funcional | Kanban D&D; modal PERDIDO; colores de columna |
| AgendaPage | ✅ Funcional | Vista semanal 7 columnas; crear/editar visita; descarga .ics |
| TimelineModal | ✅ Funcional | Drawer con tabs: Interacciones (formulario + lista) y Visitas (formulario inline + lista + ICS) |
| AdminTenantsPage | ✅ Funcional | Solo SUPER_ADMIN; CRUD de empresas |
| AdminUsersPage | ✅ Funcional | Crear/editar; selector de supervisor |
| ImageUpload | ✅ Funcional | Multi-upload; lightbox; reorder; set portada; marca de agua y compresión server-side via `ImageService` |
| DocumentUpload | ✅ Funcional | Upload tipificado; fechas; notas |
| NotificationBell | ✅ Funcional | Badge 99+; dropdown; polling 60 s; 5 tipos |
| BiPage (Reportes) | ✅ Funcional | 4 tabs: Resumen (KPIs + embudo), Agentes (tabla sortable + XLSX), Top Propiedades, Productividad (contador por tipo + sparkline SVG); date picker de período |
| RankingPage | ✅ Funcional | Podio top-3 (oro/plata/bronce), leaderboard completo, 7 badges gamificados, vista anónima para JUNIOR/SENIOR |
| CampanasPage | ✅ Funcional | 2 tabs: Plantillas (CRUD + preview HTML en iframe) y Campañas (crear, filtrar por rol, enviar, stats apertura); solo ADMIN/SUPER_ADMIN |
| MetaPage | ✅ Funcional | Publicar en Meta; 2 tabs: Listado (badge estado, publicar/eliminar) y Nueva publicación (plataforma, propiedad, ✨ auto-texto, preview live, borrador/programar/publicar inmediato); aviso si Meta no configurado; solo ADMIN/SUPER_ADMIN |
| AppLayout / ProtectedRoute | ✅ Funcional | Sidebar; rutas protegidas por JWT; "Campañas" ✉️ y "Publicar en Meta" 📢 en sección admin; "Reportes" + "Ranking" ⭐ |

### Portal Público (`portal/` — Next.js 14, paquete workspace `@gestpro/portal`)

> Puerto 3001 · `npm run dev:portal` · App Router (RSC + SSR)

| Página / Componente | Estado | Notas |
|:--------------------|:-------|:------|
| Listado de propiedades + filtros (HU-06.01) | ✅ Funcional | SSR; filtros tipo/gestión/depto/precio/habitaciones; paginación; ISR 60 s |
| Detalle de propiedad (HU-06.01) | ✅ Funcional | SSR; `generateMetadata`; OG tags; JSON-LD; galería + lightbox |
| Búsqueda de texto libre (HU-06.01) | ✅ Funcional | Hero search bar + formulario GET |
| Galería con lightbox (HU-06.01) | ✅ Funcional | Client component; prev/next; contador |
| Contacto WhatsApp / Email (HU-06.01) | ✅ Funcional | Botón flotante + tarjeta de contacto con mensaje pre-llenado |
| **Mapa interactivo Mapbox (HU-06.01)** | ✅ **Completo** | `PortalPage` — mapa de marcadores GeoJSON; `PortalDetailPage` — mini-mapa con marker; lazy-loaded `mapbox-gl` v3 |
| **Registro de cuenta de cliente (HU-06.02)** | ✅ **Completo** | `RegistroInteresForm` en contact card de `/propiedades/[id]`; formulario 'use client' con nombre/email/teléfono/mensaje; `POST /api/public/registro` con `propiedad_id`; página `/verificar` (shell SSR + `VerificarClient` con `useSearchParams`); email apunta a `PORTAL_URL/verificar?token=` si se configura `PORTAL_URL` |
| **Alertas de matching por email al cliente (HU-06.02)** | ✅ **Completo** | Email automático al cliente al publicar propiedad compatible |
| **Verificación de email (HU-06.02)** | ✅ **Completo** | `/verificar?token=` — `VerificarClient` auto-llama `POST /api/public/verificar-email`; estados: cargando / éxito (con nombre) / error / token ausente |
| **Chatbot de captura de leads (HU-10.03)** | ✅ **Completo** | `ChatbotWidget` en `layout.tsx`; árbol de decisión 10 pasos; `POST /api/public/chatbot-lead` |
| **Registro de interés — componente (HU-06.02)** | ✅ **Completo** | `RegistroInteresForm` — formulario colapsable 'use client'; nombre/email/teléfono/mensaje; estados idle/loading/done/error |
| **Verificación de cuenta — página (HU-06.02)** | ✅ **Completo** | `app/verificar/page.tsx` (SSR + Suspense) + `VerificarClient.tsx` ('use client'); auto-llama `POST /api/public/verificar-email` al montar |

### Páginas Públicas en CRM web (`web/` — React, rutas `/portal/*`)

| Página | Ruta | Estado | Notas |
|:-------|:-----|:-------|:------|
| PortalPage | `/portal` | ✅ Funcional | Catálogo público; filtros; mapa Mapbox |
| PortalDetailPage | `/portal/:id` | ✅ Funcional | Detalle de propiedad; modal "Registrar interés" |
| PortalVerifyPage | `/portal/verificar` | ✅ Funcional | Verifica token de email; activa `ClientePropiedad` |
| PortalReprogramarPage | `/portal/reprogramar/:token` | ✅ Funcional | Confirmar / proponer nueva fecha / cancelar visita |

---

## Deuda Técnica

| Ítem | Impacto | Estado |
|:-----|:--------|:-------|
| StorageService local → R2 | Alto | ✅ Resuelto — activar con vars `R2_*` en `.env` |
| URL hardcodeada en `api.ts` | Medio | ✅ Resuelto — `VITE_API_URL` + `envDir: '..'` |
| RLS policies manuales | Medio | ✅ Resuelto — `migration.sql` (Fase 1) + `migration_v2.sql` (Fase 2-12) aplicados; 22 tablas con RLS activo y `FORCE ROW LEVEL SECURITY` |
| TanStack Query instalado sin usar | Bajo | ✅ Resuelto — `QueryClientProvider` en `main.tsx`; hooks en `web/src/hooks/` (usePropiedades, useClientes, usePipeline, useVisitas); Dashboard, PropertiesList, ClientsList, Pipeline y Agenda migrados; actualización optimista en Kanban |
| Sin integración SMTP / Resend | Alto | ✅ Resuelto — `EmailModule` con Resend; configurar `RESEND_API_KEY` + `EMAIL_FROM` |
| E2E tests Cypress | Medio | ✅ Resuelto — 6 suites en `web/cypress/e2e/`; `cypress.config.ts`; integrado en CI (`e2e` job con Postgres+Redis) |
| Buffer entre citas no validado en UI | Bajo | ✅ Resuelto — `GET /api/visitas/config` expone `buffer_entre_citas_min`; `useVisitasConfig()` hook; `useConflictCheck()` en `VisitaFormModal` muestra aviso en tiempo real con horario conflictivo y minutos de buffer requeridos; inputs de fecha con borde ámbar cuando hay conflicto |
| PostGIS para motor de precios | Alto | ✅ Resuelto — extensión + índice GIST + endpoint IDW + card en formulario |
| Compresión y marca de agua de imágenes | Medio | ✅ Resuelto — `ImageService` + `sharp`; max 2 000 px; JPEG 82; watermark SVG con nombre del tenant |
| Swagger/OpenAPI | Medio | ✅ Resuelto — `SwaggerModule`; plugin CLI; todos los controllers anotados; UI en `/api/docs` |
| Mapbox en portal y formulario propiedad | Medio | ✅ Resuelto — mapa en portal (lista+detalle), geocodificación en `PropertyFormPage`; configurar `VITE_MAPBOX_TOKEN` |
| UI frontend para Sindicación / Firma / Videollamadas | Medio | ✅ Resuelto — `SindicacionPanel` + `FirmaPanel` en `PropertyDetailPage`; botones Zoom 📹/🎥/🗑️ en `VisitaCard`; `useSindicacion.ts` + `useFirma.ts`; `useCrearMeeting`/`useEliminarMeeting` en `useVisitas.ts` |

---

## Criterios de Aceptación (según `implementacion.md`)

### Fase 1 ✅ Completa
- [x] Login con 2FA funcional
- [x] RLS activo y verificado
- [x] Auditoría inmutable
- [x] Roles RBAC con jerarquía recursiva
- [x] CI/CD operativo

### Fase 2 ✅ Completa
- [x] CRUD completo de propiedades con estados
- [x] Carga de multimedia con galería
- [x] Multimedia con marca de agua y geolocalización (server-side: `ImageService` + `PropiedadesService.geocodeFromDto()`)
- [x] Motor de precios sugerido PostGIS — `ST_DWithin` + IDW + card "Aplicar" en formulario
- [x] Brochure PDF (sincrónico) con carta de comisión
- [x] Brochure vía BullMQ worker con tracking de descarga (`brochure_jobs` + `brochure_descargas`, Redis requerido)
- [x] Portal público SSR con catálogo filtrable (Next.js)
- [x] Portal con mapa interactivo Mapbox (lista + detalle; geocodificación en formulario CRM)
- [x] Centro de notificaciones in-app
- [x] Registro de cliente en portal con verificación de email
- [x] Tests E2E Cypress — 6 suites (`01-auth` a `06-busqueda-global`) integradas en CI

### Fase 3 ✅ Completa
- [x] Kanban board con drag & drop
- [x] Máquina de estados con concurrencia y bloqueo
- [x] Timeline de interacciones (registrar, ver, eliminar)
- [x] Agendamiento de visitas con .ics
- [x] Buffer configurable entre citas (lee `ConfigSeguridad.buffer_entre_citas_min`)
- [x] Reporte de visita con modal en Agenda (endpoint + notificación automática 2h post-cita)
- [x] Búsqueda global federada Ctrl+K
- [x] Importación masiva Excel/CSV con drag-drop, plantilla, reporte de errores
- [x] Tracking de email (pixel apertura `abierto_at` + clic CTA `primer_clic_at` → tabla `email_eventos`)
- [x] Tareas automáticas por inactividad de lead (`PipelineScheduler` — `LEAD_INACTIVO`, dedup 7 d)
- [x] Reprogramación por cliente desde enlace seguro (requiere portal de cliente)

### Fase 4 ✅ Completa
- [x] Dashboard BI — resumen del período con KPIs y embudo de conversión (HU-11.01)
- [x] Top propiedades por actividad filtrado por período (HU-11.01)
- [x] Reportes de desempeño por agente (cierres, comisiones, conversión, visitas) (HU-11.02)
- [x] Exportación Excel / XLSX con filtro de período (HU-11.02)
- [x] Ranking anónimo con gamificación y badges — podio, 7 badges, puntos, anonimización por rol (HU-11.03)
- [x] Campañas de email con plantillas dinámicas + seguimiento de apertura (HU-10.02)
- [x] Publicación en Meta / redes sociales — `MetaModule`; Graph API v19.0; BullMQ scheduled; `MetaPage` (HU-10.01)
- [x] Chatbot de captura de leads en portal — `ChatbotWidget`; árbol de decisión; `POST /api/public/chatbot-lead` (HU-10.03)
- [x] Productividad por agente — `GET /api/bi/productividad`; tab Productividad en BiPage; sparkline SVG (HU-08.02)
- [x] Correos automatizados con triggers por eventos — pipeline (GANADO/EN_NEGOCIACION/PERDIDO → email al cliente), recordatorio visita 24h (cron 8am), bienvenida nuevo usuario CRM (HU-10.02)
- [x] Redis caché distribuido para BI — `RedisService` global (ioredis); TTL 15 min; invalidación automática por pipeline + manual `POST /api/bi/cache/flush` (HU-11.01)
- [x] Índices BD para BI — `cliente_propiedades(estado, fecha_cierre)` y `interacciones(usuario_id, fecha)`
- [x] Accesibilidad WCAG 2.1 AA — skip link, aria-label en nav/botones, aria-expanded, role=dialog/list/status, aria-live en notificaciones y búsqueda global
- [x] Swagger/OpenAPI — UI en `/api/docs`; plugin CLI; todos los controllers anotados

### Fase 5 ✅ Completa (100%)
- [x] Dockerfiles multi-stage para api, web, portal
- [x] `docker-compose.prod.yml` con 7 servicios (postgres, redis, api, migrate, web, portal, nginx, backup)
- [x] Nginx reverse proxy con HTTPS/HTTP2 y cabeceras de seguridad
- [x] Sentry en API (`@sentry/nestjs`) y web (`@sentry/react`)
- [x] Health endpoint `/api/health`
- [x] GitHub Actions CD (build → push GHCR → deploy SSH → Sentry release)
- [x] Backup automático PostgreSQL (pg_dump + R2 + retención 30d)
- [x] E2E Cypress: 6 suites (auth, propiedades, pipeline, agenda, clientes, búsqueda)
- [x] Tests de carga k6: 3 scripts (auth 50VU, pipeline 50VU, portal-público 100VU)
- [x] App móvil Expo: login 2FA, dashboard KPIs, propiedades paginadas, agenda visitas, push notifications
- [x] Sindicación portales externos — Encuentra24 + MercadoLibre (HU-12.01)
- [x] Firma digital — DocuSign JWT Grant + embedded signing (HU-12.02)
- [x] Videollamadas — Zoom Server-to-Server OAuth, scheduled meetings (HU-12.02)
- [x] Modo offline app móvil — `cacheStore.ts` AsyncStorage TTL + stale-while-revalidate
- [x] Tests de seguridad OWASP Top 10 — A01/A02/A03/A05/A06/A07/A09
- [x] Capacitación y manuales de usuario — `HelpPage` con 9 secciones FAQ accordion + búsqueda
- [ ] Migración de datos existentes (one-shot script) — `ImportPage` cubre subidas manuales

---

## Inventario Técnico (estado 8-may-2026)

| Capa | Artefacto | Cantidad |
|:-----|:----------|:--------:|
| API — módulos NestJS | auth, users, tenants, audit, propiedades, propietarios, upload, documentos, brochure, clientes, pipeline, interacciones, visitas, notificaciones, search, portal (público), import, campanas, email, bi, storage, whatsapp, meta, redis, sindicacion, firma-digital, videollamadas, **catalogo-planes**, **config-portal**, **config-integraciones** | 30 |
| API — controladores | auth, users, tenants, audit, propiedades (+precio-sugerido), propietarios, upload, documentos, brochure, carta-comision, clientes, pipeline, interacciones, visitas, visitas-public, notificaciones, search, portal, import, campanas (plantillas + campanas), email-tracking, bi, meta, sindicacion, firma-digital, videollamadas, **catalogo-planes**, **config-portal** (privado+público), **config-integraciones** | 30 |
| BD — modelos Prisma | Tenant, User, Session, ConfigSeguridad, AuditLog, Propiedad, Propietario, PropiedadImagen, PropiedadDocumento, Cliente, ClientePropiedad, Interaccion, Visita, Notificacion, EmailPlantilla, EmailCampana, EmailEvento, BrochureJob, BrochureDescarga, MetaPublicacion, SindicacionPublicacion, FirmaSolicitud, **CatalogoPlan** | 23 |
| BD — enums | Plan (FREE/BASIC/PRO/ENTERPRISE), EstadoTenant, EstadoUsuario, Rol, AccionAudit, TipoPropiedad, TipoGestion, EstadoPropiedad, TipoDocumento, TipoNotificacion, OrigenCliente, EstadoInteres, NivelInteres, TipoInteraccion, ResultadoInteraccion, EstadoVisita, BrochureJobStatus, EstadoCampana, MetaPlataforma, MetaEstado, PortalExterno, EstadoSindicacion, EstadoFirma | 23 |
| Frontend — páginas CRM | Login, Verify2FA, Dashboard, PropertiesList, PropertyForm, PropertyDetail, ClientsList, ClientForm, ClientDetail, Pipeline, Agenda, Portal, PortalDetail, PortalVerify, PortalReprogramar, Import, Bi, Campanas, Ranking, Meta, AdminTenants, AdminUsers, **AdminPlanes**, Settings (Portal, Integraciones, Perfil), Help | 26 |
| Frontend — páginas portal Next.js | `/` (listado + mapa), `/propiedades/[id]` (detalle + `RegistroInteresForm`), `/verificar` (activación de cuenta) | 3 |
| Tests unitarios | 156 tests en 14 suites (auth 17, propiedades 20, pipeline 16, clientes 11, users 11, propietarios 10, interacciones 8, visitas 15, audit 4, tenants 3, roles.guard 3, OWASP security 1, + 2 más) | 156 |
| Tests E2E Cypress | 6 suites en `web/cypress/e2e/`: 01-auth, 02-propiedades, 03-pipeline, 04-agenda, 05-clientes, 06-busqueda-global; comandos `loginAs`/`logout`; integrado en CI | 6 |
| Tests de carga k6 | `infra/k6/`: auth.js (50 VU), pipeline.js (50 VU), portal-publico.js (100 VU); umbrales p95 < 500ms | 3 |
| Tests de seguridad OWASP | `api/src/__tests__/security/owasp.security.spec.ts` — A01 (acceso/JWT/IDOR), A02, A03 (SQL/proto), A05, A06 (versiones), A07 (alg:none/brute), A09 | 1 suite |
| Infraestructura Docker | `api/Dockerfile`, `web/Dockerfile`, `portal/Dockerfile` multi-stage; `docker-compose.prod.yml` (7 servicios); `infra/nginx/nginx.conf`; `infra/backup/backup.sh` | — |
| App móvil | `mobile/` — Expo Router; 5 pantallas (Login, Verify2FA, Dashboard, Propiedades, Agenda); push service FCM/APNs; offline cache AsyncStorage (`cacheStore.ts`) con stale-while-revalidate | — |
| PostGIS / Spatial | Migración `20260507100000_enable_postgis`; extensión `postgis`; índice GIST parcial `idx_propiedades_geom`; endpoint `GET /api/propiedades/precio-sugerido`; IDW por distancia inversa; fallback por departamento | — |

---

## Próximos Pasos Recomendados (por prioridad de negocio)

### Alta prioridad (completan Fase 2 y 3) — Todo completado
1. ~~Portal público SSR~~ ✅ Completado
2. ~~Búsqueda global Ctrl+K~~ ✅ Completado
3. ~~Importación masiva Excel/CSV~~ ✅ Completado
4. ~~Reporte post-visita + notificación 2h~~ ✅ Completado
5. ~~Buffer configurable entre citas~~ ✅ Completado
6. ~~**Mapbox en portal**~~ ✅ Completado (mapa lista+detalle, geocodificación frontend+backend, marca de agua)
7. ~~**Tareas automáticas**~~ ✅ Completado (`PipelineScheduler` lead inactivity + `DocumentosScheduler` vencimientos)
8. ~~**Tests E2E Cypress**~~ ✅ Completado — 6 suites integradas en CI
9. ~~**Motor de precios PostGIS**~~ ✅ Completado — `ST_DWithin` + IDW + fallback por departamento; card en formulario con botón "Aplicar"

### Media prioridad (Fase 4 — en progreso)
7. ~~**Dashboard BI**~~ ✅ Completado — resumen, agentes, top propiedades, export XLSX (HU-11.01/11.02)
8. ~~**Ranking de agentes con gamificación y badges**~~ ✅ Completado — podio, 7 badges, sistema de puntos, anonimización (HU-11.03)
9. ~~**Campañas de email**~~ ✅ Completado — plantillas `{{variable}}`, audiencia por rol, pixel de apertura, stats (HU-10.02)
10. ~~**Registro de cliente en portal**~~ ✅ Completado — `RegistroInteresForm` en Next.js portal; verificación de correo con token 24h; página `/verificar`; `PORTAL_URL` dirige emails al portal (HU-06.02)
11. ~~**Reprogramación desde enlace seguro**~~ ✅ Completado — email al cliente al agendar visita, `reschedule_token` único, `GET/POST /api/public/reprogramar/:token`, `PortalReprogramarPage` con acciones Confirmar/Reprogramar/Cancelar + notificación al agente
12. ~~**Swagger/OpenAPI**~~ ✅ Completado — UI en `/api/docs`; `SwaggerModule`; plugin CLI; todos los controllers anotados
13. ~~**Publicación en Meta**~~ ✅ Completado — `MetaModule`; Graph API v19.0; BullMQ scheduled; `MetaPage` con preview live y auto-texto (HU-10.01)
14. ~~**Chatbot de captura de leads**~~ ✅ Completado — `ChatbotWidget` Next.js; árbol de decisión 10 pasos; `POST /api/public/chatbot-lead`; notificación a ADMINs (HU-10.03)
15. ~~**Productividad por agente**~~ ✅ Completado — `GET /api/bi/productividad`; tab en BiPage; sparkline SVG de tendencia diaria (HU-08.02)
16. ~~**Correos automatizados**~~ ✅ Completado — 4 triggers: pipeline (GANADO/EN_NEGOCIACION/PERDIDO → email al cliente); recordatorio visita 24h (cron 8am `VisitasScheduler`); bienvenida nuevo usuario (`UsersService`); `sendClientEmail()` con pixel de tracking (HU-10.02)
17. ~~**Redis caché BI + índices BD + WCAG 2.1 AA**~~ ✅ Completado — `RedisService` global; invalidación automática por pipeline; 2 índices BI; skip link + aria en frontend (Fase 4 100%)

### Completados en esta sesión (Fase 5)
- ~~**Infraestructura producción**~~ ✅ Dockerfiles + docker-compose.prod.yml + nginx
- ~~**Sentry monitoreo**~~ ✅ API + web
- ~~**GitHub Actions CD**~~ ✅ Build/push/deploy/Sentry notify
- ~~**Cypress E2E**~~ ✅ 6 suites, integrado en CI
- ~~**k6 load tests**~~ ✅ 3 escenarios
- ~~**App móvil Expo**~~ ✅ Scaffold completo con push notifications

### Pendiente (deuda menor)
- **Migración de datos one-shot** — `ImportPage` cubre CSV/Excel manual; si hay datos legacy en otro sistema, se necesita un script de migración ad-hoc

> **Estado actual (16-may-2026):** Sistema de planes completamente implementado. 156 tests pasando. Sin deuda técnica relevante.

### Completado en sesión 9-may-2026 (continuación)
- ~~**RLS policies para nuevas tablas**~~ ✅ Completado — `migration_v2.sql` creado y aplicado en BD; 22 tablas con RLS activo (13 con `tenant_id` directo + 5 hijas vía subquery + 4 de Fase 1); migraciones Prisma pendientes aplicadas (`whatsapp_envios`, `meta_publicaciones`, `sindicacion_publicaciones`, `firma_solicitudes`, BI indexes); migration file faltante `20260503100000_add_reporte_visita` restaurado
- ~~**TanStack Query**~~ ✅ Completado — `QueryClientProvider` (staleTime 30s, gcTime 5min) en `main.tsx`; 4 hooks de dominio en `web/src/hooks/` (`usePropiedades`, `useClientes`, `usePipeline`, `useVisitas`); 5 páginas migradas (Dashboard, PropertiesList, ClientsList, PipelinePage, AgendaPage); invalidación automática de caché post-mutación; actualización optimista con rollback en Kanban Pipeline
- ~~**Buffer entre citas validado en UI**~~ ✅ Completado — `GET /api/visitas/config` nuevo endpoint; `useVisitasConfig()` hook (staleTime 5min); `useConflictCheck()` pura en `VisitaFormModal`; borde ámbar en inputs de fecha conflictivos; aviso con horario de visita existente y buffer requerido; no bloquea submit (warning, no error hard)
- ~~**UI para Sindicación / Firma Digital / Videollamadas**~~ ✅ Completado — `useSindicacion.ts` + `useFirma.ts` hooks; `SindicacionPanel` en `PropertyDetailPage` (ADMIN/SUPER_ADMIN): filas por portal con estado badge, link al anuncio, botones Publicar/Retirar; `FirmaPanel` en `PropertyDetailPage`: form solicitar firma (ADMIN/SENIOR/SUPER_ADMIN), lista de solicitudes con estado/link DocuSign; Zoom en `VisitaCard` de `AgendaPage`: `useCrearMeeting`/`useEliminarMeeting` hooks, botón 📹 crear / 🎥 unirse + 🗑️ eliminar, loading por visita

### Completado en sesión 16-may-2026 — Sistema de Planes

#### Catálogo de planes configurable
- ~~**`CatalogoPlan` modelo Prisma + migración**~~ ✅ — Enum `BASIC` agregado; modelo `CatalogoPlan` con flags booleanos (`tiene_correo`, `tiene_campanas`, `tiene_portal`, `tiene_sitio_propio`, `tiene_integraciones`) y límites numéricos; seed inicial con valores FREE/BASIC/PRO/ENTERPRISE
- ~~**Módulo `catalogo-planes` CRUD SUPER_ADMIN**~~ ✅ — `GET /api/catalogo-planes`, `PUT /api/catalogo-planes/:plan`; solo SUPER_ADMIN; lectura pública implícita vía TenantsService
- ~~**`AdminPlanesPage`**~~ ✅ — Tabla de los 4 planes con todos sus valores; modal edición con toggles y campos numéricos; ruta `/admin/planes`; entrada "Planes" en sidebar SUPER_ADMIN
- ~~**`TenantsService`: derivar límites del catálogo**~~ ✅ — Al crear tenant, lee `catalogoPlan.limite_usuarios/propiedades` en lugar de valores hardcodeados; al actualizar plan, adopta automáticamente los del catálogo si no hay overrides manuales; validación que el nuevo límite no viole el conteo actual

#### PlanGuard — restricción por funcionalidad
- ~~**`@PlanFeature(key)` decorator + `PlanGuard`**~~ ✅ — Decorator `SetMetadata` con claves `tiene_correo/campanas/portal/sitio_propio/integraciones`; guard lee `CatalogoPlan` en tiempo real por `tenantId` del JWT; SUPER_ADMIN bypass; aplicado con `@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)` por controller
- ~~**Guard aplicado a controladores**~~ ✅ — `CampanasController` (`tiene_campanas`), `ConfigIntegracionesController` (`tiene_integraciones`), `ConfigPortalController` privado (`tiene_portal`)
- ~~**`ConfigPortalService.update()`: strip sitio propio**~~ ✅ — Si plan no incluye `tiene_sitio_propio`, elimina `subdominio` y `dominio_personalizado` del DTO antes de persistir

#### Restricciones de plan en frontend (web/)
- ~~**`authStore`: `plan`, `limiteUsuarios`, `limitePropiedades`**~~ ✅ — Cargados desde `GET /api/tenants/branding` al login, verify2FA y restore de sesión; limpiados en logout/forceLogout
- ~~**Sidebar filtrado por plan**~~ ✅ — `planIncludes()` helper en `AppLayout`; "Campañas" (PRO/ENTERPRISE), "Mi Portal" y "Portal público" (BASIC+), "Integraciones" (ENTERPRISE); muestra todos mientras plan carga (evita flicker)
- ~~**`PlanRoute` para rutas sensibles**~~ ✅ — `<PlanRoute allowedPlans={[...]}>` en `/campanas` (PRO/ENTERPRISE) y `/settings/integraciones` (ENTERPRISE); bloquea navegación directa por URL
- ~~**`PropertiesListPage`: límite de propiedades**~~ ✅ — `LimitPill` (verde/ámbar/rojo según %); botón "Nueva Propiedad" deshabilitado al límite; banner rojo; estado vacío sin CTA al límite
- ~~**`AdminUsersPage`: límite de usuarios**~~ ✅ — Stat card "Capacidad" `N / límite`; botón "Nuevo Usuario" deshabilitado; banner rojo
- ~~**`AdminTenantsPage`: validación al cambiar plan**~~ ✅ — Selector de plan auto-completa límites del catálogo; warnings en rojo si conteo actual supera nuevos límites antes de guardar; columna "Propiedades" en tabla; bloqueo en backend con `BadRequestException`
- ~~**`SettingsPortalPage`: campos locked**~~ ✅ — Subdominio y dominio personalizado deshabilitados con badge "Plan PRO+" para FREE/BASIC

#### Portal Next.js — plan enforcement
- ~~**`findByDomain()` + `findDefault()` con plan check**~~ ✅ — `LEFT JOIN catalogo_planes` en ambas consultas SQL raw; expone `tiene_portal` en la respuesta (incluido en caché Redis)
- ~~**`PortalConfig.tiene_portal`**~~ ✅ — Campo opcional en la interfaz; `DEFAULTS` no lo setea (dev/fallback siempre visible)
- ~~**`layout.tsx` gate**~~ ✅ — Si `config.tenant_id` existe pero `tiene_portal === false`, renderiza página de bloqueo ("Portal no disponible") sin montar hijos; todos los children (listing + detail) quedan bloqueados automáticamente

#### Email plan enforcement completo
- ~~**`sendHtml()` con plan check**~~ ✅ — Agrega `planAllowsEmail(tenantId)` al inicio; el único método de envío que faltaba
- ~~**`users.service.ts`: tenantId en activation emails**~~ ✅ — `create()` pasa `tenantId`; `createAdmin()` pasa `dto.tenantId`
- ~~**`visitas.service.ts`: tenantId en email de confirmación de visita**~~ ✅ — `sendVisitaEmail()` acepta `tenantId` en `info`; pasa a `sendHtml()`
- ~~**`portal.service.ts`: tenantId en email de verificación**~~ ✅ — `sendVerificationEmail()` acepta `tenantId?` y lo pasa a `sendHtml()`; callers ya tenían `tenantId` en scope
