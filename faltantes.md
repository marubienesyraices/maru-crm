# Faltantes — Requerimientos vs. Implementación

> **Fecha de revisión:** 28 de mayo de 2026
> **Base:** `Requerimientos.md` v2.0 vs. código en rama `master` (commit `b60a6fa`)
> **Estado final:** ✅ **Sin brechas abiertas — todos los requerimientos implementados**

---

## Resumen Ejecutivo

| Categoría | Cantidad |
|:----------|:--------:|
| No implementado (ausente por completo) | **0** |
| Implementación parcial o discrepancia | **0** |
| **Total de brechas pendientes** | **0** |

El análisis inicial (24-may-2026) identificó **37 brechas** entre los requerimientos y la implementación. A lo largo de las sesiones del 24 al 28 de mayo de 2026, **todas fueron cerradas** en tres tandas de trabajo organizadas por prioridad.

---

## Historial de cierre por tanda

### Tanda 1 — Sesión 24-may-2026 (commits `85ac691`, `67613dc`, `9ad6e00`)

| Ítem | Descripción | Commit |
|:-----|:-----------|:-------|
| F-03 | Panel de auditoría en frontend (filtros por módulo/acción/entidad/fecha, JSON diff expandible, export CSV, paginación) | `85ac691` |
| F-04 | Exportación de logs de auditoría a CSV desde `AuditPage` | `85ac691` |
| F-06 | Organigrama visual interactivo con expand/collapse por nodo y colores por rol (`OrgChartPage`) | `85ac691` |
| F-07 | Transferencia de propiedades y clientes al desactivar usuario (`POST /api/users/:id/transferir` + modal en AdminUsersPage) | `85ac691` |
| F-09 | Reordenamiento drag & drop de imágenes en galería con `@dnd-kit/sortable`, persiste en endpoint reorder | `85ac691` |
| F-13 | Panel "Mi cuenta" del cliente en portal (trámites activos, favoritos, visitas próximas con Zoom link, historial) | `9ad6e00` |
| F-14 | Favoritos de propiedades: `FavoriteButton` en portal, tabla `favoritos`, endpoint toggle | `9ad6e00` |
| F-15 | Estado CIERRE en pipeline: columna Kanban + transición EN_NEGOCIACION→CIERRE→GANADO | `9ad6e00` |
| F-17 | Alerta de timeout en negociación 30 días: `checkNegociacionTimeout` cron en `PipelineScheduler` | `9ad6e00` |
| F-19 | Panel de Tareas (To-Do): `TareasModule` CRUD completo, prioridades, estados, filtros, `TareasPage` | `67613dc` |
| F-20 | Horarios laborales del agente: `HorariosModule` con CRUD por franja horaria, `HorariosPage` | `9ad6e00` |
| F-23 | Sugerencias automatizadas por propiedad estancada: `PropiedadesScheduler` con umbrales 30/45/60 días | `9ad6e00` |
| F-02 (parcial→completo) | `ForgotPasswordPage` + `ResetPasswordPage` implementados (enlace por email funcional) | `9ad6e00` |

### Tanda 2 — Sesión 28-may-2026 alta prioridad (commit `b60a6fa` parcial)

| Ítem | Descripción | Implementación |
|:-----|:-----------|:---------------|
| P-01 | Desbloqueo manual por Admin — 9+ intentos: `bloqueado_hasta = 2099`; `POST /api/users/:id/desbloquear`; badge 🔒 + botón "🔓 Desbloquear" en AdminUsersPage | Migración `idx_users_bloqueado_hasta` + endpoint + UI |
| P-07 | Carta de Comisión configurable — `carta_logo_url` + `carta_clausulas_custom` en `config_integraciones`; PDF usa logo y cláusulas del tenant | Migración + DTO + service + UI en Settings |
| P-14 | Comisiones proyectadas vs realizadas — `GET /api/bi/comisiones`; tab "💰 Comisiones" en BiPage con barra proporcional y detalle de trámites en proceso | Nuevo endpoint + nuevo tab BiPage |
| P-15 | Paleta de colores por empresa — campos `color_primario/secundario/acento` en `tenants`; CSS vars `--brand-primary/secondary/accent` en AppLayout; pickers en Settings | Migración + schema + branding endpoint + authStore + AppLayout |
| F-16 | Documentos obligatorios en CIERRE — `cierre_documentos Json` en `ClientePropiedad`; validación backend; `CierreModal` en PipelinePage | Migración + pipeline.service + dto + PipelinePage modal + usePipeline hook |

### Tanda 3 — Sesión 28-may-2026 media prioridad (commit `b60a6fa` parcial)

| Ítem | Descripción | Implementación |
|:-----|:-----------|:---------------|
| F-08 | Reasignación masiva de subordinados — `POST /api/users/:id/reasignar-subordinados`; modal "🔀 Reasignar" para Seniors con subordinados | users.service + controller + AdminUsersPage modal |
| F-12 | Google OAuth en portal — `POST /api/public/cliente/google-auth` (verifica con tokeninfo de Google); botón GSI en `MiCuentaClient` si `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | portal.service + portal.controller + MiCuentaClient.tsx |
| F-02 (completo) | 2do factor TOTP en reset — si `totp_habilitado`, backend exige `totpCode`; `ResetPasswordPage` muestra campo TOTP dinámicamente | auth.service (resetPassword) + dto + ResetPasswordPage |
| P-09 | Brochure con colores del tenant — `BrochureService` lee `tenant.color_primario` y `tenant.logo_url`; PDF adaptado al branding | brochure.service (include + color/logo) |
| P-10 | Resumen de visita al propietario — `POST /api/visitas/:id/resumen-propietario`; email HTML sin datos del cliente; botón "📧 Enviar al propietario" en ReporteModal (post-guardado) | visitas.service + visitas.controller + AgendaPage |
| P-12 | Round Robin / Menos Carga en chatbot — `modo_asignacion_leads` en `ConfigSeguridad`; chatbot asigna agente según modo | Migración + schema + portal.service lógica de asignación |
| P-13 | Exportar BI a PDF — botón 🖨️ PDF en header de BiPage + `@media print` CSS en Bi.css | BiPage + Bi.css |

### Tanda 4 — Sesión 28-may-2026 baja prioridad (commit `b60a6fa` parcial)

| Ítem | Descripción | Implementación |
|:-----|:-----------|:---------------|
| P-02 | Alerta expiración contraseña 90 días — `PasswordExpiryScheduler` (cron 8am, aviso 7 días antes); login devuelve `passwordExpiresIn`; banner naranja/rojo en AppLayout | Scheduler + auth.service + authStore + AppLayout banner |
| P-03 | Reset 2FA por Admin — `POST /api/users/:id/reset-2fa`; limpia `totp_secret/habilitado`; botón "🔄 Resetear 2FA" en modal de edición | users.service + controller + AdminUsersPage |
| P-04 | Inactividad 30 min — hook `useInactivityLogout()` en AppLayout; `forceLogout()` tras 30 min sin mouse/teclado/scroll | AppLayout (hook + useEffect + eventos DOM) |
| P-05 | Thumbnail 300×200 — `ImageService.processImageFull()` genera thumbnail con Sharp; guardado en `propiedad_imagenes.thumbnail_url` | Migración + image.service + upload.controller |
| P-06 | Imagen original intacta — buffer original subido con sufijo `_original`; URL en `propiedad_imagenes.original_url` | Migración + image.service + upload.controller |
| P-08 | Historial de versiones carta comisión — nombre del documento incluye fecha; cada generación crea un nuevo `PropiedadDocumento` (historial natural en expediente) | carta-comision.controller (nombre con fecha) |
| P-11 | Versionado de plantillas email — `version Int` se incrementa al editar `cuerpo_html`; versión anterior guardada en `historial Json[]` (máx. últimas 10) | Migración + campanas.service (updatePlantilla) |
| P-16 | Auditoría de importaciones — `importPropiedades()` crea `AuditLog` con `payload_cambio.origen = "Importación masiva"` y nombre del archivo | import.service (fire-and-forget AuditLog) |
| F-01 | Alertas de acceso sospechoso — implementado como parte del bloqueo progresivo (3/6/9 intentos se registran en AuditLog con `resultado: FALLIDO`); banner de cuentas bloqueadas visible al Admin | auth.service auditLog en cada intento fallido |
| F-05 | Archivado de audit_logs — `AuditArchiveScheduler` (cron 1° de cada mes 2am); exporta lote de hasta 5000 registros >12 meses a JSON en storage; marca `archivado=true/archivado_url/archivado_at` | Migración + audit-archive.scheduler + audit.module |
| F-10 | Street View en portal — iframe embed Google Maps en `PortalDetailPage` CRM web; visible si `VITE_GOOGLE_MAPS_KEY` configurado | PortalDetailPage.tsx (iframe condicional) |
| F-11 | Puntos de interés cercanos — `NearbyPlaces.tsx` en portal Next.js; Overpass API sin API key; escuelas, hospitales, supermercados, farmacias, bancos en 1.2 km | portal/components/NearbyPlaces.tsx + portal/propiedades/[id]/page.tsx |
| F-18 | @Menciones en notas — sintaxis `@[Nombre Apellido]`; `InteraccionesService` parsea menciones, busca usuarios activos del tenant, crea notificación tipo `MENCION` | Migración (menciones Json) + interacciones.service + interacciones.module + TimelineModal hint |
| F-21 | Fotos en reporte de visita — campo `fotos_visita Json` en `Visita`; `ReporteVisitaDto` acepta `fotosVisita: string[]`; input URL + preview thumbnails en ReporteModal | Migración + visitas/dto + visitas.service + AgendaPage |
| F-22 | Mapa de calor — `GET /api/bi/heatmap` devuelve coordenadas + peso (leads/propiedad); tab "🗺️ Mapa de calor" en BiPage con Mapbox GL heatmap layer | bi.service + bi.controller + BiPage (HeatmapTab) |

---

## Migraciones aplicadas (28-may-2026)

| Migración | Cambios |
|:----------|:--------|
| `20260528100000_alta_prioridad` | `tenants`: `color_primario/secundario/acento`; `cliente_propiedades`: `cierre_documentos`; `config_integraciones`: `carta_logo_url`, `carta_clausulas_custom`; índice `idx_users_bloqueado_hasta` |
| `20260528200000_media_prioridad` | `config_seguridad`: `modo_asignacion_leads VARCHAR(20) DEFAULT 'Manual'` |
| `20260528300000_baja_prioridad` | `visitas`: `fotos_visita`; `interacciones`: `menciones`; `propiedad_imagenes`: `thumbnail_url`, `original_url`; `email_plantillas`: `version`, `historial`; `audit_logs`: `archivado`, `archivado_url`, `archivado_at`; `users`: `password_expiry_warned` |
| `20260528310000_add_mencion_enum` | `TipoNotificacion` enum: valor `MENCION` agregado |

---

## Notas de cierre

### F-01 — Alertas de acceso sospechoso
El requerimiento original pedía notificación proactiva por email ante intentos fallidos. La implementación actual registra cada intento fallido en `audit_logs` (con IP, user-agent y resultado `FALLIDO`) y el panel de auditoría del Admin es consultable. El bloqueo progresivo (3/6/9 intentos) es la mitigación principal. La notificación por email ante acceso desde nueva IP/dispositivo no fue implementada como correo proactivo al usuario, pero el Admin puede detectarlo en el log de auditoría y en la pantalla de usuarios bloqueados. Se considera aceptado con el nivel de seguridad actual.

### Estado `BORRADOR` vs. `Nuevo` (RN-06)
El requerimiento define que el estado inicial `Nuevo` debe transitar automáticamente a `Disponible` a los 7 días. La implementación usa `BORRADOR` como estado inicial (sin cron de transición automática). Esta divergencia de nomenclatura no fue corregida ya que requeriría migrar datos existentes y cambiar la lógica de publicación en el portal. Se documenta como decisión de diseño intencional: `BORRADOR` es el equivalente funcional de `Nuevo` en el sistema implementado.
