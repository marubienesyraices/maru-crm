# Requerimientos Refinados — CRM Inmobiliario "Maru Bienes y Raíces"

> **Versión:** 1.0 Refinada
> **Fecha:** 19 de abril de 2026
> **Propósito:** Este documento consolida, valida y refina los requerimientos originales (`Requerimientos.md`), identificando brechas, ambigüedades, criterios faltantes y nuevas historias de usuario necesarias para una implementación completa.

---

## ÍNDICE DE REFINAMIENTO

1. [Resumen de Hallazgos](#1-resumen-de-hallazgos)
2. [Seguridad y Autenticación — Refinado](#2-seguridad-y-autenticación--refinado)
3. [Auditoría y Trazabilidad — Refinado](#3-auditoría-y-trazabilidad--refinado)
4. [Estructura Organizacional — Refinado](#4-estructura-organizacional--refinado)
5. [Gestión de Propiedades — Refinado](#5-gestión-de-propiedades--refinado)
6. [Motor de Ventas y Clientes — Refinado](#6-motor-de-ventas-y-clientes--refinado)
7. [Automatización e Integraciones — Refinado](#7-automatización-e-integraciones--refinado)
8. [Historias de Usuario NUEVAS (Faltantes)](#8-historias-de-usuario-nuevas-faltantes)
9. [Matriz de Datos Consolidada — Refinada](#9-matriz-de-datos-consolidada--refinada)
10. [Requerimientos No Funcionales (Faltantes)](#10-requerimientos-no-funcionales-faltantes)
11. [Reglas de Negocio Consolidadas](#11-reglas-de-negocio-consolidadas)
12. [Priorización y Dependencias](#12-priorización-y-dependencias)

---

# 1. Resumen de Hallazgos

## 1.1 Brechas Identificadas en el Documento Original

| # | Categoría | Brecha Identificada | Severidad |
|:--|:----------|:--------------------|:----------|
| 1 | **Multitenancy** | No se detallan historias de usuario para la gestión de empresas/tenants (alta, baja, configuración de paleta de colores, logo, plan). | 🔴 Alta |
| 2 | **Gestión de Usuarios** | Falta el flujo de creación, edición, desactivación de usuarios y el proceso de onboarding (primera configuración de 2FA). | 🔴 Alta |
| 3 | **Recuperación de Cuenta** | No existe flujo de "Olvidé mi contraseña", desbloqueo de cuenta ni reset de 2FA. | 🔴 Alta |
| 4 | **Configuración de Empresa** | Se menciona paleta de colores y logo por empresa pero no hay historia de usuario ni criterios de aceptación. | 🟡 Media |
| 5 | **Propietarios** | Se mencionan datos de propietario, pero no existe una entidad/módulo dedicado a la gestión de propietarios (CRUD). | 🟡 Media |
| 6 | **Notificaciones In-App** | Se mencionan alertas y notificaciones push pero no hay un "Centro de Notificaciones" como módulo transversal. | 🟡 Media |
| 7 | **Moneda y Localización** | No se especifica la moneda del sistema (USD, GTQ, multi-moneda), ni la zona horaria, ni el idioma. | 🟡 Media |
| 8 | **Bloqueo Temporal** | Se menciona bloqueo por 3 intentos pero no se define la duración, ni el proceso de desbloqueo. | 🟡 Media |
| 9 | **Eliminación de Datos** | No se define si las propiedades/usuarios/clientes se eliminan físicamente o se desactivan (soft delete). | 🟡 Media |
| 10 | **Paginación y Búsqueda** | No hay criterios de aceptación para la búsqueda global, paginación de listados, ni la cantidad de registros por página. | 🟢 Baja |
| 11 | **Exportación de Datos** | Solo se menciona exportar reportes a PDF/Excel, pero no se define la exportación masiva de inventario ni contactos. | 🟢 Baja |
| 12 | **Backup y Recuperación** | No hay requerimientos de respaldos de datos, recuperación ante desastres ni RPO/RTO. | 🟡 Media |
| 13 | **Términos y Condiciones** | No se contempla la aceptación de términos de servicio ni política de privacidad para clientes del portal. | 🟢 Baja |
| 14 | **Sesiones Concurrentes** | No se define si un usuario puede tener sesiones abiertas en múltiples dispositivos simultáneamente. | 🟢 Baja |

## 1.2 Ambigüedades Detectadas

| # | Ubicación | Ambigüedad | Aclaración Propuesta |
|:--|:----------|:-----------|:---------------------|
| 1 | Épica Seguridad, CA #3 | "Bloquearse temporalmente" — ¿Cuánto tiempo? | Definir: **15 minutos** tras 3 intentos, **1 hora** tras 6 intentos, **24 horas** tras 9 intentos. |
| 2 | Épica Propiedades, CA #3 | "Nuevo (automático los primeros 7 días)" — ¿Después de 7 días pasa a qué estado? | Definir: Después de 7 días se marca automáticamente como `Disponible` mediante un cronjob diario. |
| 3 | Épica Ventas, CA #2 | "Solo un Agente Senior puede registrar una oferta competitiva" — ¿Qué pasa si hay múltiples offers en paralelo? | Definir: Máximo 1 oferta competitiva activa adicional. Si un Senior presenta oferta, la propiedad mantiene estado `Reservada` y se extiende a `Multi-Negociación`. |
| 4 | Sección Clientes, CA #3 | "Si un lead pasa más de X días sin interactuar" — ¿Cuántos días? | Definir: **14 días** por defecto, configurable por empresa entre 7 y 30 días. |
| 5 | Matriz Permisos, fila "Ver Upline Senior" | "❌ No (Opcional)" — ¿Es No o es Opcional? | Definir como **configurable por empresa**. Por defecto: NO. El Admin puede activarlo. |
| 6 | Épica Marketing, CA #4 | "asignarlo mediante un Round Robin o al agente de turno" — ¿Cómo se configura? | Definir: Configurable por empresa con 3 modos: `Round Robin`, `Agente de turno`, `Asignación manual por Admin`. |
| 7 | Épica Propiedades, CA #4 | "Precio Sugerido comparativo" — ¿Basado en qué datos? | Definir: Promedio de `precio_venta` de propiedades del mismo `tipo_propiedad` en un radio de 5 km con estado `Disponible` o `Vendida` en los últimos 6 meses. |

---

# 2. Seguridad y Autenticación — Refinado

## Épica 1: Seguridad Perimetral y Autenticación

### Historia de Usuario Refinada (Sin cambios al original, validada ✅)

**Como** usuario del sistema (Administrador o Agente),
**quiero** acceder al CRM mediante múltiples capas de seguridad perimetral y de cuenta (2FA, geolocalización y monitoreo de intentos),
**para** proteger la información sensible de clientes y propiedades contra accesos malintencionados.

### Criterios de Aceptación — ACTUALIZADOS

1. **Autenticación 2FA:** ✅ Sin cambios. Tras ingresar usuario y contraseña correctos, el sistema debe solicitar un token de 6 dígitos generado por una app autenticadora (ej. Google Authenticator).
2. **Geocerca y Whitelist de IPs:** ✅ Sin cambios.
3. **Bloqueo por Intentos:** ⚠️ **REFINADO:**
   - **3 intentos fallidos consecutivos** → Bloqueo temporal de **15 minutos**.
   - **6 intentos fallidos acumulados (misma sesión de 24h)** → Bloqueo de **1 hora**.
   - **9 intentos fallidos acumulados** → Bloqueo de **24 horas** y requiere intervención del Administrador para desbloquear.
   - El contador de intentos se reinicia tras un login exitoso.
4. **Sistema de Alertas:** ✅ Sin cambios.
5. **🆕 Expiración de Sesión:** El token JWT debe tener un `access_token` con TTL de **15 minutos** y un `refresh_token` con TTL de **7 días**. Después de **30 minutos de inactividad**, la sesión debe cerrarse automáticamente.
6. **🆕 Política de Contraseñas:** Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial. Historial de últimas 5 contraseñas (no repetir). Cambio obligatorio cada **90 días**.
7. **🆕 Sesiones Concurrentes:** Un usuario puede tener máximo **2 sesiones activas simultáneas** (ej. web y móvil). Al iniciar una tercera sesión, se cierra la más antigua con notificación.

---

### 🆕 Historia de Usuario NUEVA: Recuperación de Cuenta

**Como** usuario del sistema,
**quiero** poder recuperar mi acceso si olvido mi contraseña o mi cuenta se bloquea,
**para** no depender exclusivamente del administrador y minimizar el tiempo sin acceso.

### Criterios de Aceptación

1. **Olvidé mi Contraseña:** El sistema debe enviar un enlace de restablecimiento válido por **30 minutos** al correo registrado. El enlace es de un solo uso.
2. **Desbloqueo Automático:** Si el bloqueo fue por 3 o 6 intentos, la cuenta se desbloquea automáticamente al cumplirse el tiempo. Si fue por 9 intentos, el Admin debe desbloquear manualmente desde el panel.
3. **Reset de 2FA:** Solo el Administrador puede resetear el secreto 2FA de un usuario. Se requiere que el usuario configure uno nuevo en el siguiente login.
4. **Verificación de Identidad:** Para restablecer contraseña, el usuario debe confirmar su email Y pasar una verificación adicional (ej. responder pregunta de seguridad o código enviado por SMS).

---

### 🆕 Historia de Usuario NUEVA: Onboarding de Usuario (Primera Configuración)

**Como** nuevo usuario creado por el Administrador,
**quiero** recibir un enlace de activación que me guíe a configurar mi contraseña y 2FA,
**para** completar mi registro de forma segura sin que el Admin conozca mi contraseña.

### Criterios de Aceptación

1. **Enlace de Activación:** Al crear un usuario, el sistema envía un correo con enlace de activación válido por **48 horas**.
2. **Flujo de Onboarding:** El enlace redirige a una pantalla donde el usuario: (a) Crea su contraseña, (b) Escanea el QR de 2FA, (c) Valida el primer token 2FA.
3. **Estado del Usuario:** Hasta que complete el onboarding, el usuario tiene estado `Pendiente` y no puede acceder al sistema.

---

# 3. Auditoría y Trazabilidad — Refinado

## Épica 2: Auditoría y Trazabilidad Inmutable

### Historia de Usuario Refinada (Sin cambios, validada ✅)

### Criterios de Aceptación — ACTUALIZADOS

1. **Registro Universal:** ✅ Sin cambios.
2. **Estructura del Log:** ⚠️ **REFINADO — Agregar campos:**
   - Fecha/Hora (UTC e incluir zona horaria local del usuario).
   - Usuario (id + nombre).
   - Dirección IP.
   - User-Agent (navegador/dispositivo).
   - Acción realizada (CREATE, READ, UPDATE, DELETE).
   - Módulo afectado.
   - Entidad afectada (tabla + id del registro).
   - **tenant_id** (empresa).
   - Payload del cambio (Valor Anterior vs. Valor Nuevo en formato JSON diff).
3. **Inmutabilidad:** ✅ Sin cambios.
4. **Panel de Consulta:** ⚠️ **REFINADO:**
   - Filtrable por: fecha, usuario, módulo, tipo de acción, entidad.
   - 🆕 **Exportación:** El administrador debe poder exportar los logs filtrados en formato CSV.
   - 🆕 **Retención:** Los logs se mantienen en la BD principal por **12 meses**. Después se archivan automáticamente a almacenamiento secundario (S3 Glacier / Cold Storage), accesibles bajo solicitud.
5. **🆕 Auditoría de Login:** Registrar cada intento de login (exitoso o fallido) con IP, dispositivo, resultado.

---

# 4. Estructura Organizacional — Refinado

## Épica 3: Estructura Organizacional y Visibilidad Recursiva

### Historia de Usuario Refinada (Sin cambios, validada ✅)

### Criterios de Aceptación — ACTUALIZADOS

1. **Gestión de Usuarios y Roles:** ⚠️ **REFINADO:**
   - Agregar campo `estado_usuario` con valores: `Pendiente`, `Activo`, `Suspendido`, `Inactivo`.
   - Un usuario `Suspendido` no puede hacer login. Un usuario `Inactivo` es una baja lógica (soft delete).
   - 🆕 El administrador debe poder **transferir las propiedades y trámites** de un usuario que se desactiva hacia otro agente.
2. **Construcción del Árbol (Asignaciones):** ⚠️ **REFINADO:**
   - ✅ Sin cambios en la regla de referencias circulares.
   - 🆕 **Validación adicional:** Un Agente Junior no puede ser asignado como supervisor de nadie.
   - 🆕 **Visualización:** El administrador debe poder ver el árbol jerárquico completo en formato visual (organigrama interactivo).
3. **Reglas de Agente Junior:** ✅ Sin cambios.
4. **Reglas de Agente Senior:** ✅ Sin cambios.
5. **🆕 Reasignación Masiva:** El administrador debe poder reasignar masivamente los subordinados de un Senior a otro Senior cuando hay cambios organizacionales.

---

# 5. Gestión de Propiedades — Refinado

## Épica 1: Gestión de Ficha Técnica y Ciclo de Vida

### Criterios de Aceptación — ACTUALIZADOS

1. **Tipificación de Propiedad:** ✅ Sin cambios. Valores: `Casa`, `Departamento`, `Local Comercial`, `Terreno`, `Oficina`, `Bodega`.
2. **Lógica de Gestión y Precios:** ✅ Sin cambios.
3. **Flujo de Estados (Status):** ⚠️ **REFINADO:**
   - Los estados son: `Nuevo` → `Disponible` → `Reservado` → `Vendido`/`Rentado` → `Cancelado`.
   - 🆕 Agregar estado `Inactivo` para propiedades que el propietario retira del mercado temporalmente.
   - 🆕 **Transiciones válidas:** Definir la máquina de estados con transiciones explícitas:

   | Estado Actual | Puede transitar a |
   |:-------------|:-------------------|
   | `Nuevo` | `Disponible` (automático a los 7 días), `Reservado`, `Cancelado`, `Inactivo` |
   | `Disponible` | `Reservado`, `Cancelado`, `Inactivo` |
   | `Reservado` | `Disponible` (si falla la negociación), `Vendido`, `Rentado`, `Cancelado` |
   | `Vendido` | — (estado final) |
   | `Rentado` | `Disponible` (al terminar contrato de renta) |
   | `Cancelado` | `Disponible` (reactivación) |
   | `Inactivo` | `Disponible` (reactivación) |

4. **Sugerencia Inteligente de Precios:** ⚠️ **REFINADO:**
   - Se calcula como el **promedio ponderado** de propiedades del mismo `tipo_propiedad` dentro de un **radio de 5 km** (usando PostGIS) que estén en estado `Disponible` o `Vendida/Rentada` en los últimos **6 meses**.
   - Se muestra como rango: "Precio sugerido: Q 850,000 — Q 1,200,000" basado en percentiles 25 y 75.
   - Si hay menos de 3 propiedades comparables, el sistema muestra: "Datos insuficientes para sugerir precio".
5. **🆕 Campos adicionales de la Ficha Técnica:**
   - `num_habitaciones` (Integer, Condicional — obligatorio para Casa y Departamento).
   - `num_banos` (Integer, Condicional — obligatorio para Casa y Departamento).
   - `num_parqueos` (Integer, opcional).
   - `superficie_m2` (Decimal, obligatorio).
   - `superficie_construccion_m2` (Decimal, opcional).
   - `anio_construccion` (Integer, opcional).
   - `nivel_piso` (Integer, opcional — aplica para Departamento y Oficina).
   - `descripcion` (Text, obligatorio, mínimo 50 caracteres).
   - `amenidades` (Array/JSON — ej: "Piscina", "Gimnasio", "Área de juegos", "Seguridad 24/7").
   - `direccion_texto` (String, obligatorio — dirección legible para humanos).
   - `zona_sector` (String, obligatorio — ej: "Zona 10", "Carretera a El Salvador").
   - `moneda` (Enum: `GTQ`, `USD` — por defecto según configuración de empresa).

---

## Épica 2: Multimedia y Geolocalización — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Multimedia:** ⚠️ **REFINADO:**
   - Soporte para carga masiva de imágenes (JPG, PNG, WebP) y videos (MP4, MOV).
   - **Límites:** Máximo **30 imágenes** y **3 videos** por propiedad. Imágenes máximo **10 MB** cada una, videos máximo **200 MB** cada uno.
   - El sistema debe generar automáticamente: (a) Thumbnail de 300x200px para listados, (b) Imagen optimizada para web (max 1920px de ancho), (c) Imagen original almacenada sin modificar.
   - 🆕 **Imagen principal:** El agente debe poder seleccionar cuál imagen es la "foto de portada" que aparece en el carrusel y brochure.
   - 🆕 **Ordenamiento:** El agente debe poder reordenar las imágenes mediante drag & drop.
   - 🆕 **Marca de agua:** Las imágenes del portal público deben incluir una marca de agua con el logo de la empresa (configurable).
2. **Integración de Mapas:** ⚠️ **REFINADO:**
   - Mapa interactivo con **Google Maps** o **Mapbox** (configurable por empresa).
   - El agente puede colocar un pin para definir la ubicación exacta.
   - 🆕 **Vista de calle:** Integrar Street View (si está disponible) para que el cliente vea los alrededores.
   - 🆕 **Puntos de interés:** Mostrar automáticamente puntos de interés cercanos (escuelas, hospitales, supermercados) usando la API de Places.

---

## Épica 3: Expediente Privado, Propietarios y Comisiones — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Asignación de Agentes:** ✅ Sin cambios.
2. **Expediente del Propietario:** ⚠️ **REFINADO:**
   - 🆕 **Módulo de Propietarios:** Crear un CRUD independiente de propietarios (`Propietario`) para evitar duplicados cuando un dueño tiene múltiples propiedades.
   - Campos del propietario: `nombre_completo`, `dpi_identificacion`, `nit`, `telefono`, `email`, `direccion`, `notas`.
   - Una propiedad se vincula a un propietario existente o se crea uno nuevo al registrar la propiedad.
3. **Documentación Legal:** ⚠️ **REFINADO:**
   - Tipos de documento predefinidos: `Escritura`, `Plano Catastral`, `Boleto de Ornato`, `IUSI`, `Carta de Comisión`, `Contrato de Exclusividad`, `Otro`.
   - 🆕 **Vigencia de documentos:** El sistema debe permitir registrar fecha de vencimiento de documentos (ej. contrato de exclusividad). 7 días antes del vencimiento, se genera alerta al agente asignado.
4. **Generación de Carta de Comisión:** ⚠️ **REFINADO:**
   - 🆕 **Plantilla configurable:** Cada empresa debe poder cargar su propia plantilla de carta de comisión (Word/PDF).
   - 🆕 **Variables de plantilla:** `{{nombre_propietario}}`, `{{direccion_propiedad}}`, `{{precio}}`, `{{comision_pct}}`, `{{monto_comision}}`, `{{fecha}}`, `{{nombre_agente}}`, `{{nombre_empresa}}`.
   - 🆕 **Historial de versiones:** Si se regenera la carta, las versiones anteriores se conservan en el expediente.

---

## Épica 4: Herramientas de Venta (Marketing) — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Generación de Brochure:** ⚠️ **REFINADO:**
   - 🆕 **Plantilla del brochure configurable por empresa** (con su logo, colores y estilo).
   - Contenido automático: Foto principal, galería (máx. 6 fotos), descripción, precio, amenidades, mapa de ubicación estático, datos de contacto del agente.
   - **Excluir** datos del propietario, carta de comisión y documentos legales.
   - 🆕 **Tracking:** Cada brochure generado recibe un identificador único. Si se envía por email, se rastrean las aperturas.
2. **Distribución Multicanal:** ⚠️ **REFINADO:**
   - WhatsApp: Abre la API de WA Business con un mensaje pre-configurado y link al brochure (alojado en CDN con URL corta).
   - Correo: Envío directo desde el CRM usando plantilla de email con el brochure adjunto o link.
   - 🆕 **Copiar link:** Botón para copiar un enlace público (con tracking) al portapapeles para compartir en cualquier canal.

---

# 6. Motor de Ventas y Clientes — Refinado

## Épica 1: Portal del Cliente y Perfilamiento — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Catálogo Público:** ⚠️ **REFINADO:**
   - El carrusel debe mostrar propiedades en estado `Disponible` y `Nuevo`.
   - 🆕 **Filtros avanzados:** Tipo de propiedad, rango de precios, ubicación/zona, número de habitaciones, superficie mínima, tipo de gestión (Venta/Renta).
   - 🆕 **Ordenamiento:** Por precio (ascendente/descendente), por fecha de publicación, por relevancia (score de interacción).
   - 🆕 **Paginación:** 12 propiedades por página con scroll infinito o paginación numérica (configurable).
   - 🆕 **Vista de mapa:** Opción de ver propiedades como pines en un mapa interactivo (vista de mapa vs. vista de lista/grid).
2. **Perfil del Cliente:** ⚠️ **REFINADO:**
   - 🆕 **Campos del registro:** Nombre completo, email (verificado), teléfono, tipo de propiedad de interés, rango de precio de interés, zona de interés.
   - 🆕 **Login social:** Opción de registrar con Google (OAuth 2.0). El 2FA NO aplica para clientes del portal.
   - 🆕 **Mi cuenta:** El cliente debe tener un panel con: Mis trámites, Mis favoritos, Mis búsquedas guardadas, Mis citas.
3. **Alertas de Inactividad:** ⚠️ **REFINADO:**
   - Umbral por defecto: **14 días** sin interacción.
   - Configurable por empresa entre **7 y 30 días**.
   - La alerta se muestra como notificación en el panel del agente y opcionalmente por email al agente.

---

## Épica 2: Embudo de Ventas y Máquina de Estados (Core) — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Inicio del Proceso:** ✅ Sin cambios.
2. **Transición a Negociación (Bloqueo):** ⚠️ **REFINADO:**
   - ✅ Regla de bloqueo sin cambios.
   - 🆕 **Timeout de negociación:** Si un trámite permanece en `Negociación` más de **30 días naturales**, el sistema envía alerta al agente y al Admin sugiriendo resolver o cancelar.
   - 🆕 **Oferta competitiva:** Cuando un Senior presenta oferta competitiva, se crea un trámite paralelo en sub-estado `Negociación (Competitiva)`. Solo puede existir **1 oferta competitiva** activa a la vez.
3. **Transición a Cierre:** ⚠️ **REFINADO:**
   - ✅ Flujo base sin cambios.
   - 🆕 **Documentación de cierre:** Al pasar a `Cierre`, el sistema debe solicitar adjuntar documentos de soporte (ej. promesa de compraventa, pagos recibidos).
   - 🆕 **Comisión calculada:** Al finalizar, el sistema calcula automáticamente el monto de comisión: `precio_venta * comision_pct / 100`.
4. **Transición a Cancelado:** ⚠️ **REFINADO:**
   - ✅ Flujo base sin cambios.
   - 🆕 **Motivos predefinidos:** El motivo de cancelación debe seleccionarse de una lista predefinida + campo de texto libre: `Precio no competitivo`, `Cliente no calificó para crédito`, `Propietario retiró propiedad`, `Cliente encontró otra opción`, `Documentación incompleta`, `Otro (especificar)`.

---

## Épica 3: Omnicanalidad y Productividad — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Línea de Tiempo (Timeline):** ⚠️ **REFINADO:**
   - Tipos de entrada: `Email enviado`, `Email recibido`, `Llamada realizada`, `Llamada recibida`, `Mensaje WhatsApp`, `Nota manual`, `Cambio de estado`, `Cita agendada`, `Documento adjunto`, `Acción del sistema`.
   - 🆕 **Nota rápida:** El agente debe poder agregar notas manuales con un botón rápido desde la timeline (sin navegar a otra pantalla).
   - 🆕 **Mención a otro agente:** En las notas, el agente debe poder @mencionar a otro agente para que reciba notificación.
2. **Tracking de Email:** ⚠️ **REFINADO:**
   - ✅ Sin cambios en la funcionalidad base.
   - 🆕 **Privacidad:** El pixel de tracking debe cumplir con regulaciones de privacidad. El sistema debe informar al destinatario que el correo contiene tracking (footer del email).
3. **Tareas Automáticas:** ⚠️ **REFINADO:**
   - 🆕 **Tipos de tarea:** `Seguimiento`, `Llamada`, `Enviar documento`, `Agendar visita`, `Revisar precio`, `Personalizada`.
   - 🆕 **Prioridad:** Alta, Media, Baja.
   - 🆕 **Asignación:** Las tareas pueden asignarse a uno mismo o a un agente subordinado (según jerarquía).
   - 🆕 **Vista de tareas pendientes:** Panel consolidado tipo "To-Do" con filtros por prioridad, fecha de vencimiento y estado (Pendiente, En Progreso, Completada, Vencida).

---

## Épica 4: Agenda Inteligente y Visitas — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Prevención de Conflictos:** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Buffer entre citas:** Agregar un buffer configurable de **30 minutos** entre citas para traslados.
   - 🆕 **Horarios laborales:** El agente debe poder definir su horario laboral (ej. Lunes a Viernes 9:00-18:00). Las citas fuera de horario se bloquean por defecto.
2. **Portal de Reprogramación:** ✅ Sin cambios.
3. **Reporte de Visita:** ⚠️ **REFINADO:**
   - ✅ Se genera 2 horas después de la cita.
   - 🆕 **Campos del reporte:**
     - Nivel de interés (1-5 estrellas).
     - ¿El cliente asistió? (Sí / No / Llegó tarde).
     - Comentarios positivos (texto libre).
     - Comentarios negativos / objeciones (texto libre).
     - ¿Se programa otra visita? (Sí/No → si sí, abre el agendador).
     - Fotografías de la visita (opcional, para documentar estado actual de la propiedad).
   - 🆕 **Envío al propietario:** El agente puede optar por enviar un resumen (sin datos del cliente) al propietario por email desde el mismo formulario.

---

# 7. Automatización e Integraciones — Refinado

## Épica 1: Automatización de Marketing — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Publicación en Meta:** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Publicación programada:** El agente debe poder programar la publicación para una fecha/hora futura.
   - 🆕 **Historial de publicaciones:** Registrar cada publicación con fecha, red social, ID externo, y estado (Publicado, Error, Eliminado).
2. **Disparadores de Correo:** ⚠️ **REFINADO:**
   - 🆕 **Tipos de trigger configurables:**
     - `on_nuevo_interesado` → Enviar bienvenida.
     - `on_cambio_estado` → Notificar al cliente.
     - `on_propiedad_nueva_match` → Alertar a clientes con preferencias que coincidan.
     - `on_cita_agendada` → Confirmación + enlace de reprogramación.
     - `on_inactividad` → Email de re-engagement al lead.
3. **Gestor de Plantillas:** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Previsualización:** El agente debe poder previsualizar la plantilla con datos de ejemplo antes de guardar.
   - 🆕 **Versionado:** Las plantillas deben tener un historial de versiones (quién cambió qué y cuándo).
4. **Webhook del Chatbot:** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Modos de asignación:** `Round Robin` (equitativo por turno), `Menos carga` (asigna al agente con menos trámites activos), `Manual` (entra a bandeja de "Sin asignar" para que el Admin distribuya).

---

## Épica 2: Inteligencia de Negocios (BI) — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Filtros de Dashboard:** ✅ Sin cambios.
2. **Algoritmo de Interacción:** ⚠️ **REFINADO:**
   - Fórmula: `Vistas web (1pt) + Favoritos (2pts) + Correos abiertos (2pts) + Llamadas registradas (3pts) + Citas agendadas (5pts) + Ofertas recibidas (10pts)`.
   - El score se recalcula en la vista materializada cada **15 minutos**.
3. **Privacidad del Ranking:** ✅ Sin cambios.
4. **Sugerencias Automatizadas:** ⚠️ **REFINADO:**
   - 🆕 **Múltiples umbrales:**
     - **30 días** sin interacción → Alerta leve: "Considerar reducir precio o mejorar fotos".
     - **45 días** sin interacción → Alerta moderada: "Revisar precio de mercado".
     - **60 días** sin interacción → Alerta alta: "Propiedad estancada — considerar pausa o reestructuración de venta".
5. **🆕 Dashboard del Administrador:** Métricas globales de la empresa:
   - Total de propiedades por estado (gráfico de dona).
   - Embudo de conversión general (Interesados → Negociación → Cierre → Finalizado).
   - Comisiones totales proyectadas vs. realizadas.
   - Ranking de agentes (con nombres visibles para Admin).
   - Mapa de calor de propiedades por zona geográfica.

---

## Épica 3: Ecosistema Extendido — ACTUALIZADO

### Criterios de Aceptación — ACTUALIZADOS

1. **Mapeo de Sindicación:** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Estado de sincronización:** Mostrar por portal: `Sincronizado`, `Pendiente`, `Error (con detalle)`.
   - 🆕 **Frecuencia de sincronización:** Configurable por portal: Tiempo real, cada hora, diario.
2. **Estado de Firma (Webhooks):** ✅ Sin cambios.
3. **Motor de Recordatorios (Cronjobs):** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Tipos de recordatorio:**
     - Vencimiento de contrato de exclusividad.
     - Pago de comisión pendiente.
     - Cita sin reporte de visita completado.
     - Trámite en negociación por más de 30 días.
     - Propiedad sin actividad por más de 30/45/60 días.
     - Renovación de documentos legales próxima a vencer.
4. **App Móvil (Notificaciones Push):** ⚠️ **REFINADO:**
   - ✅ Funcionalidad base sin cambios.
   - 🆕 **Centro de Notificaciones:** El agente debe poder encender/apagar cada tipo de notificación individualmente para evitar fatiga de alertas. Opciones: Push, Email, Solo in-app, Desactivada.

---

# 8. Historias de Usuario NUEVAS (Faltantes)

## 🆕 HU-T1: Gestión de Empresas (Multitenancy)

**Como** Super Administrador de la plataforma,
**quiero** crear, configurar y administrar las empresas que usan el CRM,
**para** que cada organización tenga su espacio de datos aislado y personalizado.

### Criterios de Aceptación

1. **Alta de Empresa:** Crear una empresa con: `nombre`, `logo`, `paleta_colores` (primario, secundario, acento), `dominio_personalizado` (opcional), `plan` (Free, Pro, Enterprise), `limite_usuarios`, `limite_propiedades`.
2. **Configuración Visual:** Cada empresa puede configurar su logo (para brochures, portal, app) y esquema de colores que se aplica en la interfaz de sus usuarios.
3. **Aislamiento de Datos:** Todos los datos (usuarios, propiedades, clientes, trámites, auditoría) deben estar filtrados por `tenant_id` y protegidos con Row-Level Security.
4. **Primer Administrador:** Al crear la empresa, se debe asignar un usuario Administrador inicial que completará su onboarding.

### Matriz de Atributos

| Atributo | Tipo de Dato | Obligatorio | Descripción |
|:---------|:-------------|:------------|:------------|
| `id_empresa` | UUID | Sí | Identificador del tenant |
| `nombre_empresa` | String | Sí | Nombre comercial |
| `logo_url` | String | No | Ruta al logo almacenado en S3/R2 |
| `color_primario` | String (HEX) | Sí | Color principal de la interfaz. Default: #1E3A5F |
| `color_secundario` | String (HEX) | Sí | Color secundario. Default: #F5A623 |
| `color_acento` | String (HEX) | No | Color de acento para botones/links |
| `plan` | Enum | Sí | `[Free, Pro, Enterprise]` |
| `max_usuarios` | Integer | Sí | Límite de usuarios activos |
| `max_propiedades` | Integer | Sí | Límite de propiedades activas |
| `moneda_default` | Enum | Sí | `[GTQ, USD]` |
| `zona_horaria` | String | Sí | Ej: `America/Guatemala` |
| `estado_empresa` | Enum | Sí | `[Activa, Suspendida, Cancelada]` |
| `fecha_creacion` | Datetime | Sí | Fecha de alta |

---

## 🆕 HU-T2: Gestión de Propietarios (CRUD)

**Como** agente inmobiliario,
**quiero** gestionar un catálogo de propietarios independiente del inventario de propiedades,
**para** evitar duplicados y centralizar la información de contacto de los dueños.

### Criterios de Aceptación

1. **CRUD Completo:** Crear, ver, editar y desactivar propietarios.
2. **Vinculación:** Un propietario puede tener múltiples propiedades vinculadas. Al ver el perfil del propietario, se muestra la lista de sus propiedades.
3. **Búsqueda:** Buscar propietarios por nombre, DPI o teléfono.
4. **Permisos:** Solo Admin y Agente Senior (de su equipo) pueden ver datos de propietarios.
5. **Campos:** `nombre_completo`, `dpi_identificacion`, `nit_fiscal`, `telefono_1`, `telefono_2`, `email`, `direccion`, `notas_internas`, `estado` (Activo/Inactivo).

---

## 🆕 HU-T3: Centro de Notificaciones

**Como** usuario del CRM,
**quiero** tener un centro de notificaciones unificado donde vea todas mis alertas y avisos,
**para** no perder información importante y gestionar mis prioridades.

### Criterios de Aceptación

1. **Campana de Notificaciones:** Icono de campana en el header con badge del número de notificaciones no leídas.
2. **Panel desplegable:** Al hacer clic, se muestra un panel con las últimas 20 notificaciones. Cada notificación muestra: tipo, mensaje resumido, fecha/hora, y link al recurso relacionado.
3. **Marcar como leída:** Individual o "Marcar todas como leídas".
4. **Tipos de notificación:** Nueva asignación de propiedad, nuevo lead, cita próxima, tarea vencida, trámite con cambio de estado, alerta del sistema, mención en nota.
5. **Configuración de preferencias:** El usuario puede elegir qué notificaciones recibe y por qué canal (Push, Email, In-app).

---

## 🆕 HU-T4: Búsqueda Global

**Como** usuario del CRM,
**quiero** poder buscar rápidamente propiedades, clientes, trámites o agentes desde una barra de búsqueda global,
**para** navegar eficientemente sin recorrer múltiples módulos.

### Criterios de Aceptación

1. **Barra de búsqueda:** Accesible desde el header del CRM, activable con atajo de teclado (`Ctrl+K` o `/`).
2. **Búsqueda federada:** Los resultados agrupan por entidad: Propiedades, Clientes, Trámites, Agentes.
3. **Resultados instantáneos:** Tipo-ahead con resultados después de 3 caracteres, con debounce de 300ms.
4. **Respeto de permisos:** Solo muestra resultados a los que el usuario tiene acceso según RBAC y jerarquía.

---

## 🆕 HU-T5: Importación Masiva de Datos

**Como** administrador del CRM,
**quiero** importar propiedades y contactos desde un archivo Excel/CSV,
**para** migrar datos existentes sin capturar uno por uno.

### Criterios de Aceptación

1. **Plantilla descargable:** El sistema ofrece una plantilla Excel con los campos esperados y validaciones.
2. **Validación previa:** Antes de importar, el sistema muestra un resumen: registros válidos, registros con errores (detallando el error), registros duplicados.
3. **Importación parcial:** El usuario puede optar por importar solo los registros válidos, descartando los erróneos.
4. **Auditoría:** Cada registro importado se marca como "Origen: Importación masiva" en la auditoría.
5. **Límite:** Máximo **500 registros** por archivo de importación.

---

# 9. Matriz de Datos Consolidada — Refinada

## 9.1 Entidad: Empresa (Tenant) — 🆕

| Atributo | Tipo de Dato | Obligatorio | Regla de Negocio |
|:---------|:-------------|:------------|:-----------------|
| `id_empresa` | UUID | Sí | PK. Clave de multitenancy. |
| `nombre_empresa` | String(100) | Sí | Único en la plataforma. |
| `logo_url` | String(500) | No | Ruta a S3/R2. |
| `color_primario` | String(7) | Sí | Formato HEX. Default: `#1E3A5F`. |
| `color_secundario` | String(7) | Sí | Formato HEX. Default: `#F5A623`. |
| `moneda_default` | Enum | Sí | `[GTQ, USD]`. |
| `zona_horaria` | String(50) | Sí | IANA Timezone. |
| `estado_empresa` | Enum | Sí | `[Activa, Suspendida, Cancelada]`. |
| `created_at` | Datetime | Sí | Automático. |
| `updated_at` | Datetime | Sí | Automático. |

## 9.2 Entidad: Usuario — ACTUALIZADO

| Atributo | Tipo de Dato | Obligatorio | Regla de Negocio |
|:---------|:-------------|:------------|:-----------------|
| `id_usuario` | UUID | Sí | PK. |
| `tenant_id` | UUID (FK) | Sí | Referencia a Empresa. |
| `email` | String(255) | Sí | Único por tenant. |
| `password_hash` | String | Sí | BCrypt. |
| `nombre_completo` | String(200) | Sí | — |
| `telefono` | String(20) | No | — |
| `avatar_url` | String(500) | No | Foto de perfil. |
| `rol` | Enum | Sí | `[SUPER_ADMIN, ADMIN, SENIOR, JUNIOR]`. |
| `id_supervisor` | UUID (FK) | No | Auto-referencia. Crea árbol jerárquico. |
| `estado_usuario` | Enum | Sí | `[Pendiente, Activo, Suspendido, Inactivo]`. |
| `secret_2fa` | String | No | Obligatorio tras onboarding. |
| `intentos_login` | Integer | Sí | Default: 0. |
| `fecha_bloqueo` | Datetime | No | Si está bloqueado, indica hasta cuándo. |
| `ultimo_login` | Datetime | No | Fecha del último acceso exitoso. |
| `password_changed_at` | Datetime | No | Para política de cambio cada 90 días. |
| `created_at` | Datetime | Sí | Automático. |
| `updated_at` | Datetime | Sí | Automático. |

## 9.3 Entidad: Propietario — 🆕

| Atributo | Tipo de Dato | Obligatorio | Regla de Negocio |
|:---------|:-------------|:------------|:-----------------|
| `id_propietario` | UUID | Sí | PK. |
| `tenant_id` | UUID (FK) | Sí | Referencia a Empresa. |
| `nombre_completo` | String(200) | Sí | — |
| `dpi_identificacion` | String(20) | Sí | Único por tenant. |
| `nit_fiscal` | String(15) | No | — |
| `telefono_1` | String(20) | Sí | — |
| `telefono_2` | String(20) | No | — |
| `email` | String(255) | No | — |
| `direccion` | String(500) | No | — |
| `notas_internas` | Text | No | — |
| `estado` | Enum | Sí | `[Activo, Inactivo]`. |
| `created_at` | Datetime | Sí | Automático. |

## 9.4 Entidad: Propiedad — ACTUALIZADO

| Atributo | Tipo de Dato | Obligatorio | Regla de Negocio |
|:---------|:-------------|:------------|:-----------------|
| `id_propiedad` | UUID | Sí | PK. |
| `tenant_id` | UUID (FK) | Sí | Referencia a Empresa. |
| `codigo_referencia` | String(20) | Sí | Auto-generado, único por tenant. Ej: `PROP-0001`. |
| `tipo_propiedad` | Enum | Sí | Casa, Depto, Local, Terreno, Oficina, Bodega. |
| `tipo_gestion` | Enum | Sí | Venta, Renta, Ambas. |
| `precio_venta` | Decimal(12,2) | Condicional | Requerido si gestión incluye Venta. |
| `precio_renta` | Decimal(12,2) | Condicional | Requerido si gestión incluye Renta. |
| `moneda` | Enum | Sí | `[GTQ, USD]`. Default: configuración de empresa. |
| `status` | Enum | Sí | Nuevo, Disponible, Reservado, Vendido, Rentado, Cancelado, Inactivo. |
| `descripcion` | Text | Sí | Mínimo 50 caracteres. |
| `direccion_texto` | String(500) | Sí | Dirección legible. |
| `zona_sector` | String(100) | Sí | Zona geográfica. |
| `coords_gps` | Point/JSON | Sí | Latitud y Longitud. |
| `num_habitaciones` | Integer | Condicional | Obligatorio para Casa y Departamento. |
| `num_banos` | Integer | Condicional | Obligatorio para Casa y Departamento. |
| `num_parqueos` | Integer | No | — |
| `superficie_m2` | Decimal(10,2) | Sí | Metros cuadrados totales. |
| `superficie_construccion_m2` | Decimal(10,2) | No | — |
| `anio_construccion` | Integer | No | — |
| `nivel_piso` | Integer | No | Aplica para Depto/Oficina. |
| `amenidades` | JSON | No | Array de strings. |
| `id_propietario` | UUID (FK) | Sí | Referencia a Propietario. |
| `id_agente_captador` | UUID (FK) | Sí | Agente responsable. |
| `comision_pct` | Decimal(5,2) | Sí | Porcentaje pactado. |
| `doc_comision_url` | String(500) | No | Ruta al PDF generado. |
| `imagen_portada_url` | String(500) | No | Foto principal de la propiedad. |
| `galeria_multimedia` | JSON | No | Array de objetos: {url, tipo, orden, thumbnail_url}. |
| `expediente_legal` | JSON | No | Array de {url, tipo_doc, fecha_vencimiento, nombre}. |
| `publicar_en_portal` | Boolean | Sí | Default: true. |
| `fecha_publicacion` | Datetime | No | Fecha en que se publicó por primera vez. |
| `created_at` | Datetime | Sí | Automático. |
| `updated_at` | Datetime | Sí | Automático. |

## 9.5 Entidad: Trámite — ACTUALIZADO

| Atributo | Tipo de Dato | Obligatorio | Regla de Negocio |
|:---------|:-------------|:------------|:-----------------|
| `id_tramite` | UUID | Sí | PK. |
| `tenant_id` | UUID (FK) | Sí | Referencia a Empresa. |
| `id_cliente` | UUID (FK) | Sí | Referencia a Cliente. |
| `id_propiedad` | UUID (FK) | Sí | Referencia a Propiedad. |
| `id_agente` | UUID (FK) | Sí | Agente que gestiona el trámite. |
| `estado_tramite` | Enum | Sí | `[Interesado, Negociacion, Cierre, Finalizado, Cancelado, Pausado]`. |
| `tipo_tramite` | Enum | Sí | `[Compra, Renta]`. |
| `monto_oferta` | Decimal(12,2) | No | Registrado al pasar a Negociación. |
| `motivo_cancelacion` | Text | Condicional | Requerido si estado = Cancelado. |
| `motivo_cancelacion_tipo` | Enum | Condicional | Valor predefinido de motivo. |
| `comision_calculada` | Decimal(12,2) | No | Calculada al Finalizar: `precio * comision_pct / 100`. |
| `fecha_inicio` | Datetime | Sí | Automática. |
| `fecha_cierre` | Datetime | No | Cuando pasa a Finalizado. |
| `created_at` | Datetime | Sí | Automático. |
| `updated_at` | Datetime | Sí | Automático. |

## 9.6 Entidades Complementarias (sin cambios significativos)

Las entidades **Cliente**, **Interacción**, **Cita**, **Plantilla_Mensaje**, **Campaña_Ads**, **Métrica_Propiedad**, **Integración** y **Recordatorio** mantienen su estructura original del `Requerimientos.md` con los campos `tenant_id` agregado y timestamps (`created_at`, `updated_at`).

---

# 10. Requerimientos No Funcionales (Faltantes)

El documento original no incluye requerimientos no funcionales explícitos. Se agregan los siguientes:

## 10.1 Rendimiento

| # | Requerimiento | Métrica |
|:--|:-------------|:--------|
| RNF-01 | Tiempo de carga de cualquier página del CRM | ≤ 2 segundos (P95) |
| RNF-02 | Tiempo de respuesta de API | ≤ 500ms (P95) para operaciones CRUD |
| RNF-03 | Tiempo de generación de PDF (brochure/carta comisión) | ≤ 10 segundos |
| RNF-04 | Tiempo de carga del portal público | ≤ 3 segundos (First Contentful Paint) |
| RNF-05 | Consultas de reportes BI | ≤ 5 segundos (usando vistas materializadas) |

## 10.2 Disponibilidad y Confiabilidad

| # | Requerimiento | Métrica |
|:--|:-------------|:--------|
| RNF-06 | Disponibilidad del sistema | 99.5% uptime mensual (≤ 3.6 horas de downtime/mes) |
| RNF-07 | Respaldos de base de datos | Automáticos cada 24 horas. Retención: 30 días. |
| RNF-08 | RPO (Recovery Point Objective) | ≤ 24 horas |
| RNF-09 | RTO (Recovery Time Objective) | ≤ 4 horas |

## 10.3 Escalabilidad

| # | Requerimiento | Métrica |
|:--|:-------------|:--------|
| RNF-10 | Usuarios concurrentes por empresa | Hasta 50 simultáneos |
| RNF-11 | Propiedades por empresa | Hasta 10,000 activas |
| RNF-12 | Archivos multimedia almacenados | Sin límite lógico (escalamiento horizontal en S3/R2) |
| RNF-13 | Empresas en la plataforma | Hasta 100 tenants sin degradación |

## 10.4 Seguridad

| # | Requerimiento | Métrica |
|:--|:-------------|:--------|
| RNF-14 | Encriptación en tránsito | TLS 1.2+ obligatorio (HTTPS) |
| RNF-15 | Encriptación en reposo | AES-256 para datos sensibles (DPI, contraseñas, API keys) |
| RNF-16 | OWASP Top 10 | Cumplimiento de las 10 vulnerabilidades principales |
| RNF-17 | Rate limiting | Máximo 100 requests/min por usuario, 1000/min por IP |
| RNF-18 | Sanitización de inputs | Prevención de XSS, SQL Injection, CSRF en todas las entradas |

## 10.5 Usabilidad

| # | Requerimiento | Métrica |
|:--|:-------------|:--------|
| RNF-19 | Diseño responsive | Compatible con resoluciones ≥ 320px (móvil) hasta 4K |
| RNF-20 | Compatibilidad de navegadores | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| RNF-21 | Accesibilidad | WCAG 2.1 nivel AA (mínimo) |
| RNF-22 | Idioma del sistema | Español (es-GT) como idioma principal. Preparado para i18n. |

## 10.6 Mantenibilidad

| # | Requerimiento | Métrica |
|:--|:-------------|:--------|
| RNF-23 | Cobertura de tests | ≥ 70% para lógica de negocio |
| RNF-24 | Documentación de API | Swagger/OpenAPI auto-generada |
| RNF-25 | Logging estructurado | Winston con formato JSON, niveles: error, warn, info, debug |
| RNF-26 | Monitoreo de errores | Sentry con alertas automáticas para errores críticos |

---

# 11. Reglas de Negocio Consolidadas

| # | Módulo | Regla | Prioridad |
|:--|:-------|:------|:----------|
| RN-01 | Auth | Un usuario bloqueado no puede hacer login hasta que expire el bloqueo o el Admin lo desbloquee. | 🔴 Alta |
| RN-02 | Auth | La contraseña debe cambiar cada 90 días. El sistema alerta 7 días antes. | 🟡 Media |
| RN-03 | Jerarquía | No pueden existir referencias circulares en el árbol de supervisión. | 🔴 Alta |
| RN-04 | Jerarquía | Un Junior solo puede editar propiedades donde es agente captador. | 🔴 Alta |
| RN-05 | Jerarquía | Un Senior ve y edita todo su downline recursivamente. | 🔴 Alta |
| RN-06 | Propiedades | El estado `Nuevo` se asigna automáticamente y dura 7 días. | 🟡 Media |
| RN-07 | Propiedades | Los campos de precio son condicionales al `tipo_gestion`. | 🔴 Alta |
| RN-08 | Propiedades | Solo se muestran en el portal público propiedades con `publicar_en_portal = true` y estado `Nuevo` o `Disponible`. | 🔴 Alta |
| RN-09 | Trámites | Pueden existir múltiples trámites en estado `Interesado` para la misma propiedad. | 🔴 Alta |
| RN-10 | Trámites | Al pasar a `Negociación`, la propiedad pasa a `Reservada` y los demás trámites se `Pausan`. | 🔴 Alta |
| RN-11 | Trámites | Solo un Senior puede presentar oferta competitiva sobre propiedad en Negociación. | 🔴 Alta |
| RN-12 | Trámites | Al cancelar un trámite, se requiere motivo obligatorio. | 🟡 Media |
| RN-13 | Trámites | Al finalizar un trámite, se calcula la comisión automáticamente. | 🟡 Media |
| RN-14 | Citas | No se pueden agendar citas en horarios donde el agente ya tiene otra cita. | 🔴 Alta |
| RN-15 | Citas | 2 horas después de la cita, se genera tarea obligatoria de reporte. | 🟡 Media |
| RN-16 | Auditoría | Ningún usuario puede modificar o eliminar registros de auditoría. | 🔴 Alta |
| RN-17 | Multitenancy | Un usuario solo puede ver datos de su propia empresa. | 🔴 Alta |
| RN-18 | Multitenancy | El aislamiento de datos se refuerza con Row-Level Security en PostgreSQL. | 🔴 Alta |
| RN-19 | Inactividad | Un lead sin interacción en X días genera alerta configurable al agente. | 🟡 Media |
| RN-20 | Eliminación | Las propiedades, usuarios y clientes usan soft delete (no se eliminan físicamente). | 🔴 Alta |

---

# 12. Priorización y Dependencias

## 12.1 Dependencias Críticas entre Épicas

```
                    ┌──────────────┐
                    │  Multitenancy │ ◄─── Fundamento para TODO
                    │  (HU-T1)     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌──────────┐
     │  Seguridad │ │ Auditoría│ │ Jerarquía│
     │  (Épica 1) │ │ (Épica 2)│ │ (Épica 3)│
     └─────┬──────┘ └────┬─────┘ └────┬─────┘
           │              │            │
           └──────────────┼────────────┘
                          ▼
              ┌───────────────────────┐
              │  Propiedades + Clientes│
              │  (Épicas 1-4 Props +  │
              │   Épica 1-2 Ventas)   │
              └───────────┬───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
     ┌────────────┐ ┌──────────┐ ┌──────────────────┐
     │ Interaccions│ │  Citas  │ │  Notificaciones  │
     │ + Timeline │ │ + Agenda │ │  (HU-T3)         │
     └──────┬─────┘ └────┬─────┘ └────────┬─────────┘
            │             │                │
            └─────────────┼────────────────┘
                          ▼
              ┌───────────────────────┐
              │  Marketing + BI +     │
              │  Integraciones        │
              └───────────────────────┘
```

## 12.2 Checklist de Validación Pre-Desarrollo

- [ ] Confirmar la moneda principal del sistema (GTQ, USD o multi-moneda).
- [ ] Confirmar si el Agente Senior puede ver el upline (actualmente marcado como "Opcional").
- [ ] Definir el umbral exacto de inactividad del lead (propuesta: 14 días configurable).
- [ ] Validar la fórmula del precio sugerido con stakeholders de negocio.
- [ ] Confirmar si el sistema requiere un rol `SUPER_ADMIN` por encima del `ADMIN` para gestión de tenants.
- [ ] Definir si el portal público requiere SEO server-side rendering (SSR) o si un SPA con meta tags dinámicos es suficiente.
- [ ] Confirmar la estrategia de almacenamiento multimedia: ¿S3 de AWS o R2 de Cloudflare?
- [ ] Definir los proveedores de mapas: ¿Google Maps o Mapbox? ¿Cuál es el presupuesto de API calls?
- [ ] Confirmar si se requiere WhatsApp Business API (paga) o solo la API de click-to-chat (gratis).
- [ ] Definir si los brochures se generan del lado del servidor (PDF server-side) o del cliente (browser-side).

---

> **Fin del Documento de Requerimientos Refinados**
>
> **Acciones siguientes:**
> 1. Revisión y validación con el Product Owner.
> 2. Resolución de los items del checklist pre-desarrollo (Sección 12.2).
> 3. Actualización de `Analisis_y_Diseno.md` con los refinamientos aprobados.
> 4. Actualización del `implementacion.md` con las nuevas historias de usuario.
