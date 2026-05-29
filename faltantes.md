# Faltantes — Requerimientos vs. Implementación

> **Fecha de revisión:** 28 de mayo de 2026
> **Base:** `Requerimientos.md` v2.0 vs. código en rama `master` (commit `ebbbc32`)
> **Método:** Lectura completa de `Requerimientos.md` + exploración directa del código fuente
> **Criterio:** Funcionalidades definidas en los requerimientos que están ausentes, incompletas o difieren de lo implementado.

---

## Resumen Ejecutivo

| Categoría | Cantidad |
|:----------|:--------:|
| No implementado (ausente por completo) | 5 |
| Implementación parcial o discrepancia | 8 |
| **Total de brechas** | **13** |

---

## 1. No implementado — Ausente por completo

### 1.1 Oferta competitiva en pipeline (§11 CA-2)

El requerimiento define que cuando un Agente Senior presenta una oferta sobre una propiedad en negociación, se crea un trámite paralelo en sub-estado **"Negociación (Competitiva)"**, con un máximo de 1 oferta competitiva activa a la vez. Solo el rol `SENIOR` puede registrar este tipo de oferta; el botón debe bloquearse para `JUNIOR`.

**Estado actual:** No existe el concepto de oferta competitiva. El sistema tiene un guard que bloquea al JUNIOR de mover un trámite a GANADO, pero no hay restricción específica para "ofertar en propiedad en negociación" ni lógica de trámites paralelos competitivos. | §11 CA-2

---

### 1.2 Disparadores de email automáticos configurables (§14 CA-2)

El requerimiento pide que los agentes puedan configurar disparadores de correo según eventos del sistema:

- `on_nuevo_interesado` → Envía bienvenida al cliente
- `on_cambio_estado` → Notifica al cliente sobre cambio de estado del trámite
- `on_propiedad_nueva_match` → Alerta a clientes con preferencias coincidentes
- `on_cita_agendada` → Confirmación + enlace de reprogramación
- `on_inactividad` → Email de re-engagement al lead inactivo

**Estado actual:** Los emails hardcoded existen (EN_NEGOCIACION, GANADO, PERDIDO al cliente; matching al publicar propiedad; confirmación de visita). Sin embargo **no hay módulo de automatización configurable** donde el agente/Admin pueda activar/desactivar o personalizar triggers por empresa. Son comportamientos fijos en el código. | §14 CA-2

---

### 1.3 Preferencias de notificación por usuario y canal (§17.1 CA-5 / §16 CA-4)

El requerimiento exige que cada usuario pueda configurar individualmente qué notificaciones recibe y por qué canal: **Push, Email, Solo in-app, Desactivada**. Esto aplica también en la app móvil.

**Estado actual:** No existe tabla de preferencias de notificación. Todas las notificaciones se crean siempre como in-app. No hay pantalla de configuración de alertas ni en el CRM web ni en la app móvil. | §17.1 CA-5 / §16 CA-4

---

### 1.4 Zillow como portal de sindicación (§16 CA-1)

El requerimiento menciona tres portales: **Zillow, MercadoLibre, Encuentra24**.

**Estado actual:** Solo están implementados MercadoLibre y Encuentra24. Zillow no tiene integración. | §16 CA-1

---

### 1.5 Frecuencia de sincronización configurable por portal (§16 CA-1)

El req pide que el Admin pueda configurar la frecuencia de sincronización por portal: **Tiempo real, cada hora, diario**.

**Estado actual:** No hay scheduler de sincronización periódica. La sindicación es 100% manual: el agente publica o retira desde la UI. No existe cron ni configuración de intervalo. | §16 CA-1

---

## 2. Implementación parcial o discrepancia

### 2.1 Alertas de acceso sospechoso por email (§3 CA-4)

**Requerimiento:** El sistema debe enviar un correo automático al usuario cuando haya intentos de login fallidos o acceso desde dispositivos/ubicaciones nuevas.

**Implementado:** Los intentos fallidos se registran en `audit_logs` con IP y user-agent. El Admin puede verlos en `AuditPage`. El bloqueo progresivo (3/6/9 intentos) está activo.

**Brecha:** No se envía ningún email proactivo al usuario afectado. Solo el Admin puede detectar el evento leyendo los logs. | §3 CA-4

---

### 2.2 Segundo factor real en reset de contraseña (§3 Épica 2 CA-4)

**Requerimiento:** Para restablecer contraseña, el usuario debe confirmar su email Y pasar una verificación adicional (pregunta de seguridad o código SMS).

**Implementado:** El flujo de reset usa enlace por email (30 min, un solo uso). Si el usuario tiene 2FA activo, `ResetPasswordPage` solicita el código TOTP como segundo factor.

**Brecha:** El TOTP como segundo factor solo aplica a usuarios con 2FA ya configurado. No existe pregunta de seguridad ni envío de código por SMS como factores alternativos para usuarios sin 2FA. | §3 Épica 2 CA-4

---

### 2.3 Auto-transición BORRADOR → DISPONIBLE a los 7 días (§6 CA-3 / RN-06)

**Requerimiento:** El estado inicial `Nuevo` dura 7 días y luego transita automáticamente a `Disponible`.

**Implementado:** El estado inicial es `BORRADOR` (equivalente funcional a "Nuevo"). No existe cron que transite de `BORRADOR` a `DISPONIBLE` automáticamente tras 7 días.

**Brecha:** Divergencia de nomenclatura (BORRADOR vs. Nuevo) y ausencia del scheduler de transición automática. La propiedad permanece en BORRADOR indefinidamente hasta que el agente la cambia manualmente. | §6 CA-3 / RN-06

---

### 2.4 Tipos automáticos en timeline de interacciones (§12 CA-1)

**Requerimiento:** La línea de tiempo debe incluir entradas automáticas de tipo: `Cambio de estado`, `Cita agendada`, `Documento adjunto`, `Acción del sistema`.

**Implementado:** El timeline muestra interacciones manuales registradas por el agente (llamadas, emails, notas, WhatsApp). El pipeline sí registra cambios de estado como notificaciones, pero no como entradas del timeline/interacción vinculadas al trámite.

**Brecha:** Los cambios de estado del pipeline, las citas agendadas y los documentos adjuntos no generan automáticamente una entrada en la tabla `interacciones` del trámite. El agente debe registrar todo manualmente. | §12 CA-1

---

### 2.5 Score de interacción incompleto (§15 CA-2)

**Requerimiento:** Algoritmo exacto: `Vistas web (1pt) + Favoritos (2pts) + Correos abiertos (2pts) + Llamadas registradas (3pts) + Citas agendadas (5pts) + Ofertas recibidas (10pts)`.

**Implementado:** El ranking de agentes usa: `ganados×100 + visitas×15 + interacciones×5 + bonus_conversión`. El tab "Top Propiedades" cuenta `leads + visitas + interacciones + descargas brochure`.

**Brecha:** Ningún score incluye **Favoritos (2pts)** ni **Correos abiertos (2pts)**. La fórmula del ranking de agentes no coincide con la especificada. Los favoritos existen en BD pero no se contabilizan en ningún score de BI. | §15 CA-2

---

### 2.6 Panel "Mis búsquedas guardadas" en portal cliente (§10 CA-2)

**Requerimiento:** El panel "Mi cuenta" del cliente debe incluir: Mis trámites, **Mis favoritos, Mis búsquedas guardadas**, Mis citas.

**Implementado:** `MiCuentaClient.tsx` muestra: trámites activos, favoritos e historial de visitas. No existe una sección de "Mis búsquedas guardadas" donde el cliente pueda ver y gestionar búsquedas de filtros que guardó previamente.

**Brecha:** La funcionalidad de guardar búsquedas/filtros como entidad separada no existe. Las preferencias generales (tipo, zona, presupuesto) sí se almacenan en el modelo `Cliente`, pero el cliente no puede guardar/nombrar/eliminar búsquedas específicas desde el portal. | §10 CA-2

---

### 2.7 Campo `superficie_min_m2` en preferencias del cliente (§10 tabla preferencias)

**Requerimiento:** El modelo de preferencias del cliente incluye `superficie_min_m2 (Decimal, Metros cuadrados mínimos)`.

**Implementado:** El modelo `Cliente` tiene: `tipo_interes`, `gestion_interes`, `presupuesto_max`, `zona_interes`, `habitaciones_min`. No tiene `superficie_min_m2`.

**Brecha:** El campo de metros cuadrados mínimos como preferencia de búsqueda no está en el schema ni en los formularios. | §10 tabla

---

### 2.8 Historial de versiones de plantillas sin autoría (§14 CA-3)

**Requerimiento:** "Las plantillas deben tener un historial de versiones (quién cambió qué y cuándo)."

**Implementado:** Al editar `cuerpo_html`, `campanas.service.ts` guarda la versión anterior en `historial Json[]` con: `{ version, asunto, cuerpo_html, guardado_at }`.

**Brecha:** El historial **no registra quién hizo el cambio** (`changed_by` / `usuario_id` del editor). Solo guarda el contenido anterior y la fecha, no la identidad del modificador. | §14 CA-3

---

### 2.9 Límite de importación de propiedades: 200 vs. 500 (§17.3 CA-5)

**Requerimiento:** "Máximo 500 registros por archivo de importación."

**Implementado:** `import.service.ts` tiene `MAX_CLIENTES = 500` pero `MAX_PROPIEDADES = 200`.

**Brecha:** El límite para importación de propiedades es 200, no 500 como especifica el requerimiento. | §17.3 CA-5

---

## 3. Observaciones adicionales

### Estado BORRADOR vs. Nuevo (decisión de diseño)

El sistema implementa `BORRADOR` como estado inicial en lugar de `Nuevo`. Esto es una decisión de diseño intencional que afecta también la lógica de publicación en el portal: el portal solo muestra propiedades en `DISPONIBLE`. Si se implementara la auto-transición BORRADOR→DISPONIBLE (brecha 2.3), la nomenclatura divergente quedaría resuelta funcionalmente aunque no semánticamente.

### Contadores de visitas web en portal

El score de interacción incluye `visitas_web (1pt)` pero el portal Next.js no registra un contador de vistas por propiedad al cargar el detalle. Solo se almacenan leads, visitas de agenda y descargas de brochures.

---

## 4. Priorización sugerida

### Alta (impacto en lógica de negocio crítica)
- **§11 CA-2** — Oferta competitiva: lógica de concurrencia de negociaciones no implementada
- **§14 CA-2** — Disparadores de email configurables: sin módulo de automatización de marketing

### Media (mejoran experiencia y conformidad con req)
- **§6 CA-3** — Auto-transición BORRADOR→DISPONIBLE (scheduler de 7 días)
- **§12 CA-1** — Entradas automáticas en timeline (cambios de estado, citas, documentos)
- **§15 CA-2** — Score de interacción completo (sumar favoritos y correos abiertos)
- **§17.1 CA-5** — Preferencias de notificación por usuario y canal

### Baja (detalles o integraciones opcionales)
- **§3 CA-4** — Email de alerta por acceso sospechoso
- **§3 Épica 2 CA-4** — Segundo factor real en reset (SMS o pregunta de seguridad)
- **§10 CA-2** — "Mis búsquedas guardadas" + `superficie_min_m2` en preferencias
- **§14 CA-3** — Registrar quién modificó la plantilla en el historial de versiones
- **§16 CA-1** — Zillow como portal de sindicación
- **§16 CA-1** — Frecuencia de sincronización configurable por portal
- **§16 CA-4** — Centro de notificaciones configurable en app móvil
- **§17.3 CA-5** — Límite importación propiedades: subir de 200 a 500
