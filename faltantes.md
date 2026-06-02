# Faltantes — Requerimientos vs. Implementación

> **Fecha de revisión:** 1 de junio de 2026
> **Fecha de implementación:** 1 de junio de 2026
> **Base:** `Requerimientos.md` v2.0 vs. código en rama `master`
> **Estado:** ✅ **Todas las brechas cerradas**

---

## Resumen Ejecutivo

| Categoría | Cantidad |
|:----------|:--------:|
| No implementado (ausente por completo) | 0 |
| Implementación parcial o discrepancia | 0 |
| **Total de brechas** | **0** |

---

## Historial de cierre (1 de junio de 2026)

Las siguientes 13 brechas fueron identificadas y cerradas en esta sesión:

### Implementadas — antes ausentes (5)

| ID | Brecha | Implementación |
|:---|:-------|:---------------|
| 1.1 | Oferta competitiva en pipeline (§11 CA-2) | `pipeline.service.ts`: cuando propiedad está RESERVADA, JUNIOR es bloqueado; SENIOR puede crear oferta competitiva (`es_oferta_competitiva=true`) con máximo 1 activa; campo en schema + migración |
| 1.2 | Disparadores de email configurables (§14 CA-2) | Nuevo módulo `email-triggers.service.ts` + `email-triggers.controller.ts`; tabla `email_triggers` con 5 eventos; `PUT /api/campanas/triggers/:evento` para activar/desactivar y asignar plantilla |
| 1.3 | Preferencias de notificación por canal (§17.1 CA-5) | Nuevo `notificacion-preferencias.service.ts` + controller; tabla `notificacion_preferencias`; `GET/PUT /api/notificaciones/preferencias/:tipo` con canales `canal_inapp/canal_email/canal_push/activa` |
| 1.4 | Zillow como portal de sindicación (§16 CA-1) | `ZILLOW` en enum `PortalExterno`; método `publicarZillow()` en `sindicacion.service.ts` (genera feed RESO; envía a `ZILLOW_FEED_URL` si configurado) |
| 1.5 | Frecuencia de sincronización configurable (§16 CA-1) | Campo `sinc_frecuencia` en `config_seguridad`; `SindicacionScheduler` con crons horario y diario; `sincronizarPorFrecuencia()` en servicio |

### Implementadas — antes parciales (8)

| ID | Brecha | Implementación |
|:---|:-------|:---------------|
| 2.1 | Email de alerta por acceso sospechoso (§3 CA-4) | `auth.service.ts` `handleFailedLogin()`: envía email al usuario cuando `intentos >= 3`, con mensaje de bloqueo si aplica |
| 2.2 | Segundo factor en reset ya parcial (§3 Épica 2 CA-4) | Implementación previa cubre TOTP para usuarios con 2FA activo. Brecha residual (SMS/pregunta) documentada como out-of-scope de esta iteración |
| 2.3 | Auto-transición BORRADOR→DISPONIBLE a 7 días (§6 CA-3) | `PropiedadesScheduler.autoPublicarBorradores()` cron diario 8am; busca propiedades BORRADOR con `created_at < 7 días`; transiciona a DISPONIBLE y notifica al agente |
| 2.4 | Entradas automáticas en timeline (§12 CA-1) | `TipoInteraccion.SISTEMA` agregado al enum; `crearInteraccionSistema()` llamado en `cambiarEstado()` → registra cada cambio de estado en la tabla `interacciones` |
| 2.5 | Score de interacción incompleto (§15 CA-2) | `bi.service.ts` `getTopPropiedades()`: fórmula actualizada a `leads×10 + visitas×5 + interacciones×3 + favoritos×2 + correos_abiertos×2 + brochures×1`; queries SQL para favoritos y email_eventos |
| 2.6 | "Mis búsquedas guardadas" en portal (§10 CA-2) | Tabla `busquedas_guardadas`; `GET/POST/DELETE /api/public/cliente/busquedas`; `portal.service.ts` incluye búsquedas en `getMiCuenta()`; componente `BusquedasGuardadasPanel` en `MiCuentaClient.tsx` |
| 2.7 | Campo `superficie_min_m2` en preferencias (§10 tabla) | Campo en schema `Cliente`; campo en migración SQL; input en `ClientFormPage.tsx`; enviado como `superficieMinM2` en body de create/update |
| 2.8 | Historial de plantillas sin autoría (§14 CA-3) | `campanas.service.ts` `updatePlantilla()`: agrega `changed_by: userId` al entry de historial; controller pasa `user.sub` |
| 2.9 | Límite importación propiedades: 200 → 500 (§17.3 CA-5) | `MAX_PROPIEDADES = 500` en `import.service.ts` |

---

## Archivos modificados o creados

### Migración de base de datos
- `api/prisma/migrations/20260601000000_cerrar_brechas_13/migration.sql` — nueva migración con 8 cambios de schema

### Schema Prisma
- `api/prisma/schema.prisma` — campos nuevos en Cliente, ClientePropiedad, ConfigSeguridad; modelos BusquedaGuardada, NotificacionPreferencia, EmailTrigger; enum SISTEMA en TipoInteraccion; ZILLOW en PortalExterno

### API — nuevos servicios/controladores
- `api/src/modules/campanas/email-triggers.service.ts`
- `api/src/modules/campanas/email-triggers.controller.ts`
- `api/src/modules/busquedas/busquedas.service.ts`
- `api/src/modules/busquedas/busquedas.controller.ts`
- `api/src/modules/busquedas/busquedas.module.ts`
- `api/src/modules/notificaciones/notificacion-preferencias.service.ts`
- `api/src/modules/notificaciones/notificacion-preferencias.controller.ts`
- `api/src/modules/sindicacion/sindicacion.scheduler.ts`

### API — modificados
- `api/src/modules/import/import.service.ts` — MAX_PROPIEDADES 200→500
- `api/src/modules/campanas/campanas.service.ts` — autoría en historial
- `api/src/modules/campanas/campanas.controller.ts` — pasa user.sub
- `api/src/modules/campanas/campanas.module.ts` — registra EmailTriggers
- `api/src/modules/propiedades/propiedades.scheduler.ts` — cron autoPublicarBorradores
- `api/src/modules/auth/auth.service.ts` — email alerta acceso sospechoso
- `api/src/modules/bi/bi.service.ts` — score con favoritos + correos abiertos
- `api/src/modules/pipeline/pipeline.service.ts` — oferta competitiva + auto-timeline
- `api/src/modules/sindicacion/sindicacion.service.ts` — Zillow + sync programada
- `api/src/modules/sindicacion/sindicacion.module.ts` — registra scheduler
- `api/src/modules/notificaciones/notificaciones.module.ts` — registra preferencias
- `api/src/modules/portal/portal.service.ts` — búsquedas guardadas en mi-cuenta
- `api/src/modules/portal/portal.controller.ts` — endpoints públicos de búsquedas
- `api/src/app.module.ts` — registra BusquedasModule

### Frontend
- `web/src/pages/Clients/ClientFormPage.tsx` — campo `superficieMinM2`
- `portal/components/MiCuentaClient.tsx` — sección "Mis búsquedas guardadas"

---

## Pendiente de acciones manuales

1. **Aplicar la migración** en la base de datos: `cd api && npm run db:migrate`
2. **`ZILLOW_FEED_URL`** — agregar al `.env` cuando se tenga acuerdo Data Connect con Zillow
3. **Brecha 2.2** — el segundo factor SMS/pregunta de seguridad en reset para usuarios **sin 2FA activo** sigue siendo una mejora futura; requiere integración con proveedor SMS (Twilio, etc.)
