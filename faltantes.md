# Faltantes — Requerimientos vs. Implementación

> **Fecha de revisión:** 28 de mayo de 2026 (actualizado post-implementación alta prioridad)
> **Base:** `Requerimientos.md` v2.0 vs. código en rama `master` (commit `9ad6e00`)
> **Criterio:** Se listan funcionalidades definidas en los requerimientos que están ausentes, incompletas o difieren de lo implementado. Lo que está correctamente implementado no se incluye.

---

## Resumen Ejecutivo

| Categoría | Cantidad |
|:----------|:--------:|
| No implementado (ausente por completo) | 10 |
| Implementación parcial o discrepancia | 12 |
| **Total de brechas** | **22** |

> **Versus revisión anterior (28-may-2026 mañana):** Los 5 ítems de alta prioridad fueron implementados: P-01 (desbloqueo manual por Admin), P-07 (logo, cláusulas y color configurable en carta de comisión), P-14 (tab Comisiones con proyectadas vs realizadas en BI), P-15 (paleta de colores por empresa en la UI), F-16 (modal de documentos requeridos al pasar a CIERRE). Total: 22 brechas (era 27).

---

## 1. No implementado — Ausente por completo

### 1.1 Seguridad y Autenticación (Sección 3)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-01 | **Alertas de acceso sospechoso**: El sistema debe enviar email automático al usuario informando sobre intentos de inicio de sesión fallidos o accesos desde dispositivos/ubicaciones nuevas. Solo está implementada la geocerca de bloqueo, no la notificación proactiva al usuario. | §3 CA-4 |

### 1.2 Auditoría (Sección 4)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-05 | **Retención y archivado automático**: Los logs se mantienen 12 meses en BD principal y luego se archivan automáticamente a almacenamiento secundario (S3 Glacier / Cold Storage), accesibles bajo solicitud. No implementado. | §4 CA-6 |

### 1.3 Estructura Organizacional (Sección 5)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-08 | **Reasignación masiva de subordinados**: El administrador debe poder reasignar masivamente los subordinados de un Senior a otro Senior cuando hay cambios organizacionales. No implementado. | §5 CA-5 |

### 1.4 Multimedia y Geolocalización (Sección 7)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-10 | **Vista de calle (Street View)**: Integrar Google Street View para que el cliente vea los alrededores de la propiedad desde el portal. No implementado. | §7 CA-2 |
| F-11 | **Puntos de interés cercanos**: Mostrar automáticamente escuelas, hospitales y supermercados usando Places API. No implementado. | §7 CA-2 |

### 1.5 Portal del Cliente (Sección 10)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-12 | **Login con Google (OAuth 2.0)**: El portal debe ofrecer registro/login social con Google. El panel "Mi cuenta" usa magic link por email, no OAuth 2.0. No implementado. | §10 CA-2 |

### 1.6 Embudo de Ventas (Sección 11)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| ~~F-16~~ | ~~**Documentos requeridos al pasar a CIERRE**~~ | ✅ **IMPLEMENTADO** | Modal `CierreModal` en PipelinePage exige escribir al menos un documento antes de transicionar. Pipeline service valida `cierreDocumentos.length > 0` y los persiste en `ClientePropiedad.cierre_documentos`. | §11 CA-3 |

### 1.7 Omnicanalidad y Productividad (Sección 12)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-18 | **@Menciones en notas de interacciones**: En las notas del timeline, el agente debe poder @mencionar a otro agente para que reciba notificación automática. No implementado. | §12 CA-1 |

### 1.8 Agenda y Visitas (Sección 13)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-21 | **Fotografías en reporte de visita**: El formulario de reporte de visita debe permitir adjuntar fotos para documentar el estado de la propiedad. No implementado. | §13 CA-3 |

### 1.9 Inteligencia de Negocios (Sección 15)

| # | Requerimiento | Referencia |
|:--|:-------------|:-----------|
| F-22 | **Mapa de calor por zona geográfica**: El dashboard del administrador debe incluir un mapa de calor de propiedades por zona. No implementado. | §15 CA-5 |

---

## 2. Implementación parcial o discrepancia

### 2.1 Seguridad y Autenticación (Sección 3)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| ~~P-01~~ | ~~**Bloqueo progresivo de intentos**~~ | ✅ **IMPLEMENTADO** | Los umbrales 3/6/9 ya existían. Se añadió bloqueo permanente en 9+ intentos (hasta 2099) y endpoint `POST /api/users/:id/desbloquear`. AdminUsersPage muestra 🔒 y botón "Desbloquear". | §3 CA-3 |
| P-02 | **Cambio obligatorio de contraseña cada 90 días** | El modelo tiene `password_changed_at` | No hay cron que fuerce el cambio ni alerta proactiva 7 días antes del vencimiento. | §3 CA-6 |
| P-03 | **Reset de 2FA por Administrador** | No existe opción en UI de gestión de usuarios | El req dice que solo el Admin puede resetear el secreto 2FA de un usuario. Esta acción no está disponible en `AdminUsersPage`. | §3 Épica 2 CA-3 |
| P-04 | **Cierre por inactividad de 30 minutos** | Timer de expiración de token (TTL 15 min) | El req pide cierre tras 30 min de **inactividad real** (sin clics). El timer actual expira el token por TTL, no por ausencia de actividad del usuario en la UI. | §3 CA-5 |
| F-02 | **Verificación adicional en reset de contraseña** | `ForgotPasswordPage` + `ResetPasswordPage` implementados | El req exige email + verificación adicional (pregunta de seguridad o código SMS). La implementación usa solo enlace por email (un factor). Ahora existe la UI pero falta el segundo factor de verificación. | §3 Épica 2 CA-4 |

### 2.2 Multimedia (Sección 7)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| P-05 | **Thumbnail de 300×200px** | `ImageService` comprime a máx. 2000px | El req pide generar explícitamente un thumbnail separado de 300×200 para listados. El sistema optimiza la imagen pero no genera un thumbnail de tamaño fijo. | §7 CA-1 |
| P-06 | **Imagen original sin modificar** | Solo se almacena la versión procesada (JPEG 82) | El req pide conservar la imagen original intacta en almacenamiento. Solo existe la versión comprimida. | §7 CA-1 |

### 2.3 Propietarios y Comisiones (Sección 8)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| ~~P-07~~ | ~~**Plantilla configurable de Carta de Comisión**~~ | ✅ **IMPLEMENTADO** | Se añadieron `carta_logo_url` y `carta_clausulas_custom` en `config_integraciones`. El PDF usa logo propio del tenant y cláusulas personalizadas. Campos en Settings > Apariencia > Carta de Comisión. | §8 CA-4 |
| P-08 | **Historial de versiones de Carta de Comisión** | Se genera y guarda el PDF | Si se regenera la carta, las versiones anteriores deben conservarse en el expediente. Solo existe la última versión generada. | §8 CA-4 |

### 2.4 Herramientas de Venta (Sección 9)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| P-09 | **Brochure con plantilla configurable por empresa** | Template fijo en `BrochureService` | Cada empresa debe poder personalizar la plantilla del brochure (logo, colores, estilo). No hay CRUD de plantillas de brochure por tenant. | §9 CA-1 |

### 2.5 Agenda (Sección 13)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| P-10 | **Envío de resumen al propietario desde reporte de visita** | El reporte registra feedback | El agente debe poder enviar por email un resumen (sin datos del cliente) al propietario directamente desde el formulario de reporte. No implementado el botón/acción de envío. | §13 CA-3 |

### 2.6 Marketing (Sección 14)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| P-11 | **Versionado de plantillas de email** | Campo `version: Integer` en el modelo | El historial de versiones anteriores no se conserva; solo existe la versión actual. Al editar una plantilla se pierde el historial de cambios. | §14 CA-3 |
| P-12 | **Modo de asignación de leads del chatbot** | `modo_asignacion_leads` en `ConfigSeguridad` | El campo existe pero el chatbot siempre notifica a todos los ADMINs (equivalente a "Manual"). No se implementa Round Robin ni Asignación por Menos Carga. | §14 CA-4 |

### 2.7 Inteligencia de Negocios (Sección 15)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| P-13 | **Exportar reportes BI a PDF** | Exportación a Excel (XLSX) | El req pide exportar a **PDF o Excel**. Solo está disponible XLSX. | §15 CA-1 |
| ~~P-14~~ | ~~**Comisiones proyectadas vs. realizadas**~~ | ✅ **IMPLEMENTADO** | Nuevo endpoint `GET /api/bi/comisiones`. Tab "💰 Comisiones" en BiPage con KPIs (realizadas/proyectadas/total), barra visual proporcional, y tabla de trámites en proceso con monto proyectado por propiedad. | §15 CA-5 |

### 2.8 Configuración Visual por Empresa (Sección 2)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| ~~P-15~~ | ~~**Paleta de colores y logo por empresa en la UI**~~ | ✅ **IMPLEMENTADO** | Migración agrega `color_primario`, `color_secundario`, `color_acento` a tabla `tenants`. Se aplican como CSS variables `--brand-primary/secondary/accent` al cargar el branding. Pickers de color en Settings > Identidad visual. | §2 CA-2 |

### 2.9 Importación Masiva (Sección 17)

| # | Requerimiento | Implementado | Brecha | Referencia |
|:--|:-------------|:------------|:-------|:-----------|
| P-16 | **Marcado de origen en auditoría al importar** | `ImportPage` funcional con CSV/Excel | Los registros importados deben marcarse como "Origen: Importación masiva" en `audit_logs`. No está confirmado que este tag se capture diferenciado en la auditoría. | §17.3 CA-4 |

---

## 3. Observaciones adicionales

### Estado `BORRADOR` vs. `Nuevo` (RN-06)

El req define el primer estado de una propiedad como `Nuevo` (automático, dura 7 días y luego pasa a `Disponible` automáticamente). La implementación usa `BORRADOR`. No existe un cron que transite automáticamente de `BORRADOR` a `DISPONIBLE` después de 7 días como exige la regla RN-06.

### Contador de vistas web en portal

El BI calcula un `score_interaccion` que incluye `visitas_web (1pt)`. No está documentado si el portal incrementa este contador cuando un visitante anónimo ve una propiedad, ni si el contador de `favoritos` se actualiza correctamente al marcar/desmarcar desde el portal (los favoritos fueron implementados en este sprint pero el score no se recalcula en tiempo real).

### Bloqueo de Junior en oferta competitiva

El req es explícito: "Solo un Agente Senior puede registrar una oferta competitiva". El guard del pipeline previene a JUNIOR de cerrar GANADO, pero no hay un control específico para la oferta competitiva en propiedades en EN_NEGOCIACION o CIERRE.

### Modo asignación leads del chatbot

El campo `modo_asignacion_leads` existe en `ConfigSeguridad` pero el `portal.service.ts` (chatbot) siempre notifica a todos los ADMINs del tenant. Los modos `RoundRobin` y `MenosCarga` no están implementados (P-12).

---

## 4. Ítems resueltos desde la revisión del 24-may-2026

Los siguientes ítems quedaron implementados entre el 24 y 28 de mayo y ya **no** forman parte del backlog de faltantes:

| Ítem | Descripción | Commit |
|:-----|:-----------|:-------|
| F-03 | Panel de auditoría en frontend (filtros, JSON diff, paginación) | `85ac691` |
| F-04 | Exportación de logs de auditoría a CSV | `85ac691` |
| F-06 | Organigrama visual interactivo con expand/collapse y colores por rol | `85ac691` |
| F-07 | Transferencia de propiedades/clientes al desactivar usuario | `85ac691` |
| F-09 | Reordenamiento drag & drop de imágenes en galería (`@dnd-kit/sortable`) | `85ac691` |
| F-19 | Panel de Tareas (To-Do) completo con CRUD, prioridades, estados y filtros | `67613dc` |
| F-13 | Panel "Mi cuenta" del cliente en portal (trámites, favoritos, visitas, magic link) | `9ad6e00` |
| F-14 | Favoritos de propiedades en portal (`FavoriteButton`, tabla `favoritos`) | `9ad6e00` |
| F-15 | Estado CIERRE en pipeline (columna Kanban, transición EN_NEGOCIACION→CIERRE→GANADO) | `9ad6e00` |
| F-17 | Alerta de timeout en negociación 30 días (`checkNegociacionTimeout` en `PipelineScheduler`) | `9ad6e00` |
| F-20 | Horarios laborales del agente (módulo `horarios` con CRUD por franja horaria) | `9ad6e00` |
| F-23 | Sugerencias automatizadas por propiedad estancada (30/45/60 días con `PropiedadesScheduler`) | `9ad6e00` |

---

## 5. Priorización sugerida

### Alta (impacto directo en uso diario o seguridad) — ✅ TODOS IMPLEMENTADOS
- ~~**P-01**~~ ✅ Desbloqueo manual por Admin — 9 intentos bloquea hasta 2099, botón "🔓 Desbloquear" en AdminUsersPage
- ~~**P-07**~~ ✅ Carta de Comisión configurable — campos `carta_logo_url` y `carta_clausulas_custom` en Settings
- ~~**P-15**~~ ✅ Paleta de colores por empresa — campos en Tenant, pickers en Settings, CSS vars aplicadas al login
- ~~**F-16**~~ ✅ Documentos en CIERRE — modal obligatorio con lista de docs antes de transicionar a CIERRE
- ~~**P-14**~~ ✅ Comisiones proyectadas vs realizadas — nuevo tab "💰 Comisiones" en BiPage con barra visual y detalle

### Media (mejoran experiencia del agente y cliente) — ✅ TODOS IMPLEMENTADOS
- ~~**F-08**~~ ✅ Reasignación masiva — endpoint `POST /api/users/:id/reasignar-subordinados` + modal "🔀 Reasignar" en AdminUsersPage
- ~~**P-09**~~ ✅ Brochure configurable — usa `tenant.color_primario` y `tenant.logo_url` en el PDF
- ~~**P-10**~~ ✅ Resumen al propietario — endpoint `POST /api/visitas/:id/resumen-propietario` + botón en ReporteModal (post-guardado)
- ~~**P-12**~~ ✅ Round Robin / Menos Carga — campo `modo_asignacion_leads` en ConfigSeguridad; chatbot asigna agente según modo configurado
- ~~**P-13**~~ ✅ Exportar BI a PDF — botón 🖨️ PDF en header de BiPage + `@media print` CSS
- ~~**F-02**~~ ✅ 2do factor en reset — si usuario tiene 2FA, backend exige código TOTP; ResetPasswordPage muestra campo TOTP dinámicamente
- ~~**F-12**~~ ✅ Google OAuth en portal — `POST /api/public/cliente/google-auth`; MiCuentaClient carga GSI script y muestra botón "Sign in with Google" si `NEXT_PUBLIC_GOOGLE_CLIENT_ID` está configurado

### Baja — ✅ TODOS IMPLEMENTADOS
- ~~**F-05**~~ ✅ Archivado audit_logs — `AuditArchiveScheduler` cron mensual (1° de cada mes 2am): exporta logs >12 meses a JSON en storage, marca `archivado=true`
- ~~**F-10**~~ ✅ Street View — iframe embed de Google Maps en `PortalDetailPage` (requiere `VITE_GOOGLE_MAPS_KEY`)
- ~~**F-11**~~ ✅ Puntos de interés — componente `NearbyPlaces.tsx` en portal Next.js usa Overpass API (sin API key) para escuelas, hospitales, supermercados en 1.2km
- ~~**F-18**~~ ✅ @Menciones — sintaxis `@[Nombre]` en notas de interacciones; backend crea notificación `MENCION` a usuarios referenciados; hint en TimelineModal
- ~~**F-21**~~ ✅ Fotos en reporte — campo `fotos_visita Json` en Visita; input de URLs + preview en `ReporteModal` en `AgendaPage`
- ~~**F-22**~~ ✅ Mapa de calor — endpoint `GET /api/bi/heatmap`; tab "🗺️ Mapa de calor" en BiPage con Mapbox GL heatmap layer (intensidad = leads por propiedad)
- ~~**P-02**~~ ✅ Expiración de contraseña — `PasswordExpiryScheduler` alerta 7 días antes; login devuelve `passwordExpiresIn`; banner en AppLayout
- ~~**P-03**~~ ✅ Reset 2FA por Admin — endpoint `POST /api/users/:id/reset-2fa`; botón "🔄 Resetear 2FA" en modal de edición de usuario
- ~~**P-04**~~ ✅ Inactividad 30 min — hook `useInactivityLogout()` en AppLayout; `forceLogout()` tras 30 min sin mouse/teclado
- ~~**P-05**~~ ✅ Thumbnail 300×200 — `ImageService.processImageFull()` genera thumbnail separado; se guarda en `propiedad_imagenes.thumbnail_url`
- ~~**P-06**~~ ✅ Original intacta — `processImageFull()` guarda el buffer original; URL en `propiedad_imagenes.original_url`
- ~~**P-08**~~ ✅ Versiones de Carta de Comisión — nombre del documento incluye fecha (`Carta de Comisión — PROP-001 — 2026-05-28`); cada generación crea un nuevo documento (historial natural)
- ~~**P-11**~~ ✅ Versionado de plantillas — al editar `cuerpo_html`, la versión anterior se guarda en `historial Json` (últimas 10); campo `version Int` se incrementa
- ~~**P-16**~~ ✅ Auditoría de importaciones — `importPropiedades()` crea entrada en `audit_logs` con `payload_cambio.origen = "Importación masiva"` y nombre del archivo
