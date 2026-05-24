# Requerimientos — GestProp CRM

> **Versión:** 2.0 Consolidada
> **Fecha de creación:** 17 de abril de 2026
> **Última actualización:** 19 de abril de 2026
> **Propósito:** Documento único y consolidado de todas las historias de usuario, criterios de aceptación, reglas de negocio, matrices de datos y requerimientos no funcionales del CRM Inmobiliario multiempresa.

---

## ÍNDICE

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Gestión de Empresas (Multitenancy)](#2-gestión-de-empresas-multitenancy)
3. [Seguridad Perimetral y Autenticación](#3-seguridad-perimetral-y-autenticación)
4. [Auditoría y Trazabilidad Inmutable](#4-auditoría-y-trazabilidad-inmutable)
5. [Estructura Organizacional y Visibilidad Recursiva](#5-estructura-organizacional-y-visibilidad-recursiva)
6. [Gestión de Propiedades — Ficha Técnica y Ciclo de Vida](#6-gestión-de-propiedades--ficha-técnica-y-ciclo-de-vida)
7. [Gestión de Propiedades — Multimedia y Geolocalización](#7-gestión-de-propiedades--multimedia-y-geolocalización)
8. [Gestión de Propiedades — Expediente Privado, Propietarios y Comisiones](#8-gestión-de-propiedades--expediente-privado-propietarios-y-comisiones)
9. [Gestión de Propiedades — Herramientas de Venta (Marketing)](#9-gestión-de-propiedades--herramientas-de-venta-marketing)
10. [Portal del Cliente y Perfilamiento](#10-portal-del-cliente-y-perfilamiento)
11. [Embudo de Ventas y Máquina de Estados (Core)](#11-embudo-de-ventas-y-máquina-de-estados-core)
12. [Omnicanalidad y Productividad](#12-omnicanalidad-y-productividad)
13. [Agenda Inteligente y Visitas](#13-agenda-inteligente-y-visitas)
14. [Automatización de Marketing](#14-automatización-de-marketing)
15. [Inteligencia de Negocios (BI) y Rendimiento](#15-inteligencia-de-negocios-bi-y-rendimiento)
16. [Ecosistema Extendido y Movilidad](#16-ecosistema-extendido-y-movilidad)
17. [Módulos Transversales](#17-módulos-transversales)
18. [Matrices de Permisos](#18-matrices-de-permisos)
19. [Matriz de Datos Consolidada (Data Schema)](#19-matriz-de-datos-consolidada-data-schema)
20. [Requerimientos No Funcionales](#20-requerimientos-no-funcionales)
21. [Reglas de Negocio Consolidadas](#21-reglas-de-negocio-consolidadas)
22. [Priorización y Dependencias](#22-priorización-y-dependencias)
23. [Checklist de Validación Pre-Desarrollo](#23-checklist-de-validación-pre-desarrollo)

---

# 1. Descripción General del Sistema

Este sistema será **multiempresa** y cada empresa tendrá sus datos propios: usuarios, propiedades, clientes, trámites, etc. Los datos de cada empresa estarán completamente aislados.

Cada empresa tendrá su propia **paleta de colores** y **logo**, con un lugar dedicado para configurarlo.

El desarrollo se ejecutará en **5 fases** con un plan de trabajo estructurado en el archivo `implementacion.md`.

---

# 2. Gestión de Empresas (Multitenancy)

## Épica: Configuración y Administración Multiempresa

### Historia de Usuario

**Como** Super Administrador de la plataforma,
**quiero** crear, configurar y administrar las empresas que usan el CRM,
**para** que cada organización tenga su espacio de datos aislado y personalizado.

### Criterios de Aceptación

1. **Alta de Empresa:** Crear una empresa con: `nombre`, `logo`, `paleta_colores` (primario, secundario, acento), `dominio_personalizado` (opcional), `plan` (Free, Pro, Enterprise), `limite_usuarios`, `limite_propiedades`.
2. **Configuración Visual:** Cada empresa puede configurar su logo (para brochures, portal, app) y esquema de colores que se aplica en la interfaz de sus usuarios.
3. **Aislamiento de Datos:** Todos los datos (usuarios, propiedades, clientes, trámites, auditoría) deben estar filtrados por `tenant_id` y protegidos con Row-Level Security en PostgreSQL.
4. **Primer Administrador:** Al crear la empresa, se debe asignar un usuario Administrador inicial que completará su proceso de onboarding.
5. **Moneda y Zona Horaria:** Cada empresa define su moneda por defecto (`GTQ` o `USD`) y zona horaria (ej. `America/Guatemala`).
6. **Gestión de Estado:** La empresa puede estar en estado `Activa`, `Suspendida` o `Cancelada`. Una empresa suspendida o cancelada impide el login de sus usuarios.

---

# 3. Seguridad Perimetral y Autenticación

## Épica 1: Autenticación Multicapa y Control de Acceso

### Historia de Usuario

**Como** usuario del sistema (Administrador o Agente),
**quiero** acceder al CRM mediante múltiples capas de seguridad perimetral y de cuenta (2FA, geolocalización y monitoreo de intentos),
**para** proteger la información sensible de clientes y propiedades contra accesos malintencionados.

### Criterios de Aceptación

1. **Autenticación 2FA:** Tras ingresar usuario y contraseña correctos, el sistema debe solicitar un token de 6 dígitos generado por una app autenticadora (ej. Google Authenticator).
2. **Geocerca y Whitelist de IPs:** El administrador debe poder configurar accesos permitidos por países (ej. permitiendo accesos únicamente desde Guatemala y El Salvador) o por rangos de IP específicos.
3. **Bloqueo por Intentos:**
   - **3 intentos fallidos consecutivos** → Bloqueo temporal de **15 minutos**.
   - **6 intentos fallidos acumulados (misma sesión de 24h)** → Bloqueo de **1 hora**.
   - **9 intentos fallidos acumulados** → Bloqueo de **24 horas** y requiere intervención del Administrador para desbloquear.
   - El contador de intentos se reinicia tras un login exitoso.
4. **Sistema de Alertas:** El sistema debe enviar un correo electrónico automático al usuario informando sobre intentos de inicio de sesión fallidos o accesos desde dispositivos/ubicaciones nuevas.
5. **Expiración de Sesión:** El token JWT debe tener un `access_token` con TTL de **15 minutos** y un `refresh_token` con TTL de **7 días**. Después de **30 minutos de inactividad**, la sesión debe cerrarse automáticamente.
6. **Política de Contraseñas:** Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial. Historial de últimas 5 contraseñas (no repetir). Cambio obligatorio cada **90 días**.
7. **Sesiones Concurrentes:** Un usuario puede tener máximo **2 sesiones activas simultáneas** (ej. web y móvil). Al iniciar una tercera sesión, se cierra la más antigua con notificación.

---

## Épica 2: Recuperación de Cuenta

### Historia de Usuario

**Como** usuario del sistema,
**quiero** poder recuperar mi acceso si olvido mi contraseña o mi cuenta se bloquea,
**para** no depender exclusivamente del administrador y minimizar el tiempo sin acceso.

### Criterios de Aceptación

1. **Olvidé mi Contraseña:** El sistema debe enviar un enlace de restablecimiento válido por **30 minutos** al correo registrado. El enlace es de un solo uso.
2. **Desbloqueo Automático:** Si el bloqueo fue por 3 o 6 intentos, la cuenta se desbloquea automáticamente al cumplirse el tiempo. Si fue por 9 intentos, el Admin debe desbloquear manualmente desde el panel.
3. **Reset de 2FA:** Solo el Administrador puede resetear el secreto 2FA de un usuario. Se requiere que el usuario configure uno nuevo en el siguiente login.
4. **Verificación de Identidad:** Para restablecer contraseña, el usuario debe confirmar su email Y pasar una verificación adicional (ej. responder pregunta de seguridad o código enviado por SMS).

---

## Épica 3: Onboarding de Usuario (Primera Configuración)

### Historia de Usuario

**Como** nuevo usuario creado por el Administrador,
**quiero** recibir un enlace de activación que me guíe a configurar mi contraseña y 2FA,
**para** completar mi registro de forma segura sin que el Admin conozca mi contraseña.

### Criterios de Aceptación

1. **Enlace de Activación:** Al crear un usuario, el sistema envía un correo con enlace de activación válido por **48 horas**.
2. **Flujo de Onboarding:** El enlace redirige a una pantalla donde el usuario: (a) Crea su contraseña, (b) Escanea el QR de 2FA, (c) Valida el primer token 2FA.
3. **Estado del Usuario:** Hasta que complete el onboarding, el usuario tiene estado `Pendiente` y no puede acceder al sistema.

---

# 4. Auditoría y Trazabilidad Inmutable

## Épica: Registro Inmutable de Acciones

### Historia de Usuario

**Como** Administrador del CRM,
**quiero** que el sistema mantenga un registro inmutable y detallado de todas las interacciones de los usuarios con los datos,
**para** monitorear cambios, identificar responsabilidades y auditar posibles vulneraciones de información.

### Criterios de Aceptación

1. **Registro Universal:** Toda acción de Creación, Lectura (opcional para datos muy sensibles), Actualización o Eliminación (CRUD) debe generar un log automático.
2. **Estructura del Log:** Cada registro debe capturar:
   - Fecha/Hora (UTC e incluir zona horaria local del usuario).
   - Usuario (id + nombre).
   - Dirección IP.
   - User-Agent (navegador/dispositivo).
   - Acción realizada (CREATE, READ, UPDATE, DELETE).
   - Módulo afectado.
   - Entidad afectada (tabla + id del registro).
   - **tenant_id** (empresa).
   - Payload del cambio (Valor Anterior vs. Valor Nuevo en formato JSON diff).
3. **Inmutabilidad:** Ningún usuario, incluyendo al Administrador principal, debe tener permisos en el sistema para modificar o eliminar el historial de auditoría.
4. **Panel de Consulta:** El administrador debe contar con una vista filtrable (por fecha, usuario, módulo, tipo de acción, entidad) para revisar estos registros.
5. **Exportación:** El administrador debe poder exportar los logs filtrados en formato CSV.
6. **Retención:** Los logs se mantienen en la BD principal por **12 meses**. Después se archivan automáticamente a almacenamiento secundario (S3 Glacier / Cold Storage), accesibles bajo solicitud.
7. **Auditoría de Login:** Registrar cada intento de login (exitoso o fallido) con IP, dispositivo, resultado.

---

# 5. Estructura Organizacional y Visibilidad Recursiva

## Épica: Gestión de Roles, Jerarquía y Visibilidad

**Agrupa:** Gestión de roles, asignación de árbol jerárquico y reglas de visibilidad (Upline/Downline).

### Historia de Usuario

**Como** Administrador de Operaciones,
**quiero** estructurar a los usuarios en un árbol jerárquico multinivel (donde los Seniors gestionan Juniors y a otros Seniors),
**para** que el sistema aplique automáticamente permisos de lectura y escritura basados en la posición de cada agente dentro del equipo comercial.

### Criterios de Aceptación

1. **Gestión de Usuarios y Roles:** El administrador puede crear usuarios y asignar el rol de `Admin`, `Senior` o `Junior`.
   - El campo `estado_usuario` maneja los valores: `Pendiente`, `Activo`, `Suspendido`, `Inactivo`.
   - Un usuario `Suspendido` no puede hacer login. Un usuario `Inactivo` es una baja lógica (soft delete).
   - El administrador debe poder **transferir las propiedades y trámites** de un usuario que se desactiva hacia otro agente.
2. **Construcción del Árbol (Asignaciones):**
   - Un `Agente Senior` puede tener asignados múltiples `Agentes Junior` y múltiples `Agentes Senior`.
   - El sistema debe prevenir "referencias circulares" (ej. el Agente A no puede supervisar al Agente B si el Agente B ya supervisa al Agente A).
   - Un Agente Junior no puede ser asignado como supervisor de nadie.
   - El administrador debe poder ver el árbol jerárquico completo en formato visual (organigrama interactivo).
3. **Reglas de Agente Junior:**
   - **Edición:** Solo puede editar las propiedades donde él es el agente asignado.
   - **Lectura Ascendente (Upline):** Puede ver sus propiedades y TODAS las propiedades asignadas a su línea de mando directa hacia arriba (su Senior directo, el Senior de su Senior, y así sucesivamente hasta la raíz del árbol).
4. **Reglas de Agente Senior:**
   - **Edición y Lectura Descendente (Downline):** Puede ver y editar sus propias propiedades, y TODAS las propiedades asignadas a cualquier agente (Junior o Senior) que esté por debajo de él en su rama del árbol.
5. **Reasignación Masiva:** El administrador debe poder reasignar masivamente los subordinados de un Senior a otro Senior cuando hay cambios organizacionales.

---

# 6. Gestión de Propiedades — Ficha Técnica y Ciclo de Vida

## Épica: Registro, Tipología, Precios y Estados

### Historia de Usuario

**Como** agente inmobiliario,
**quiero** registrar una propiedad con su tipología, tipo de gestión y precio dinámico,
**para** mantener un catálogo organizado que refleje fielmente la oferta comercial y su disponibilidad.

### Criterios de Aceptación

1. **Tipificación de Propiedad:** El sistema debe permitir seleccionar entre: `Casa`, `Departamento`, `Local Comercial`, `Terreno`, `Oficina`, `Bodega`.
2. **Lógica de Gestión y Precios:**

   - El usuario selecciona `Venta`, `Renta` o `Ambas`.
   - Si es `Venta`, el campo `Precio de Venta` es obligatorio.
   - Si es `Renta`, el campo `Precio de Renta` es obligatorio.
   - Si es `Ambas`, el sistema habilita ambos campos de precio de forma obligatoria.
3. **Flujo de Estados (Status):** La propiedad debe transitar por los estados: `Nuevo`, `Disponible`, `Reservado`, `Vendido`, `Rentado`, `Cancelado`, `Inactivo`.

   - **Transiciones válidas:**

   | Estado Actual  | Puede transitar a                                                                      |
   | :------------- | :------------------------------------------------------------------------------------- |
   | `Nuevo`      | `Disponible` (automático a los 7 días), `Reservado`, `Cancelado`, `Inactivo` |
   | `Disponible` | `Reservado`, `Cancelado`, `Inactivo`                                             |
   | `Reservado`  | `Disponible` (si falla la negociación), `Vendido`, `Rentado`, `Cancelado`     |
   | `Vendido`    | — (estado final)                                                                      |
   | `Rentado`    | `Disponible` (al terminar contrato de renta)                                         |
   | `Cancelado`  | `Disponible` (reactivación)                                                         |
   | `Inactivo`   | `Disponible` (reactivación)                                                         |
4. **Sugerencia Inteligente de Precios:** Basado en la zona y el tipo de propiedad, el sistema debe mostrar un "Precio Sugerido" comparativo.

   - Se calcula como el **promedio ponderado** de propiedades del mismo `tipo_propiedad` dentro de un **radio de 5 km** (usando PostGIS) que estén en estado `Disponible` o `Vendida/Rentada` en los últimos **6 meses**.
   - Se muestra como rango: "Precio sugerido: Q 850,000 — Q 1,200,000" basado en percentiles 25 y 75.
   - Si hay menos de 3 propiedades comparables, el sistema muestra: "Datos insuficientes para sugerir precio".
5. **Campos de la Ficha Técnica:**

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

# 7. Gestión de Propiedades — Multimedia y Geolocalización

## Épica: Contenido Visual y Mapas

### Historia de Usuario

**Como** agente inmobiliario,
**quiero** enriquecer la ficha con contenido visual de alta calidad y ubicación geográfica exacta,
**para** facilitar la toma de decisiones del cliente y mejorar el posicionamiento de la propiedad.

### Criterios de Aceptación

1. **Multimedia:**
   - Soporte para carga masiva de imágenes (JPG, PNG, WebP) y videos (MP4, MOV).
   - **Límites:** Máximo **30 imágenes** y **3 videos** por propiedad. Imágenes máximo **10 MB** cada una, videos máximo **200 MB** cada uno.
   - El sistema debe generar automáticamente: (a) Thumbnail de 300x200px para listados, (b) Imagen optimizada para web (max 1920px de ancho), (c) Imagen original almacenada sin modificar.
   - **Imagen principal:** El agente debe poder seleccionar cuál imagen es la "foto de portada" que aparece en el carrusel y brochure.
   - **Ordenamiento:** El agente debe poder reordenar las imágenes mediante drag & drop.
   - **Marca de agua:** Las imágenes del portal público deben incluir una marca de agua con el logo de la empresa (configurable).
2. **Integración de Mapas:**
   - Mapa interactivo con **Google Maps** o **Mapbox** (configurable por empresa).
   - El agente puede colocar un pin (marcador) para guardar las coordenadas exactas de la propiedad.
   - **Vista de calle:** Integrar Street View (si está disponible) para que el cliente vea los alrededores.
   - **Puntos de interés:** Mostrar automáticamente puntos de interés cercanos (escuelas, hospitales, supermercados) usando la API de Places.

---

# 8. Gestión de Propiedades — Expediente Privado, Propietarios y Comisiones

## Épica: Documentos Legales, Propietarios y Comisiones

### Historia de Usuario

**Como** agente inmobiliario,
**quiero** vincular la información del propietario, los documentos legales y los acuerdos de comisión a la propiedad,
**para** asegurar la transparencia legal y garantizar el respaldo del cobro de honorarios.

### Criterios de Aceptación

1. **Asignación de Agentes:** Cada propiedad debe tener registrado el "Agente que capta/atiende al propietario".
2. **Gestión de Propietarios (CRUD Independiente):**
   - Módulo dedicado para crear, ver, editar y desactivar propietarios, evitando duplicados cuando un dueño tiene múltiples propiedades.
   - Un propietario puede tener múltiples propiedades vinculadas. Al ver el perfil del propietario, se muestra la lista de sus propiedades.
   - Búsqueda de propietarios por nombre, DPI o teléfono.
   - Campos del propietario: `nombre_completo`, `dpi_identificacion`, `nit_fiscal`, `telefono_1`, `telefono_2`, `email`, `direccion`, `notas_internas`, `estado` (Activo/Inactivo).
   - **Permisos:** Solo Admin y Agente Senior (de su equipo) pueden ver datos de propietarios.
3. **Documentación Legal:**
   - Sección de carga para documentos (Escrituras, planos, impuestos) con acceso restringido.
   - Tipos de documento predefinidos: `Escritura`, `Plano Catastral`, `Boleto de Ornato`, `IUSI`, `Carta de Comisión`, `Contrato de Exclusividad`, `Otro`.
   - **Vigencia de documentos:** El sistema debe permitir registrar fecha de vencimiento de documentos (ej. contrato de exclusividad). 7 días antes del vencimiento, se genera alerta al agente asignado.
4. **Generación de Carta de Comisión:**
   - El sistema debe generar un documento PDF (Carta de Comisión) basado en una plantilla predefinida con los datos de la propiedad, el precio y el porcentaje de comisión pactado.
   - **Plantilla configurable:** Cada empresa debe poder cargar su propia plantilla de carta de comisión.
   - **Variables de plantilla:** `{{nombre_propietario}}`, `{{direccion_propiedad}}`, `{{precio}}`, `{{comision_pct}}`, `{{monto_comision}}`, `{{fecha}}`, `{{nombre_agente}}`, `{{nombre_empresa}}`.
   - Una vez generada, el sistema debe permitir imprimirla y guardarla automáticamente en el historial de archivos privados de la propiedad.
   - **Historial de versiones:** Si se regenera la carta, las versiones anteriores se conservan en el expediente.

---

# 9. Gestión de Propiedades — Herramientas de Venta (Marketing)

## Épica: Brochure y Distribución Digital

### Historia de Usuario

**Como** agente inmobiliario,
**quiero** generar materiales de venta automatizados y compartirlos por canales digitales,
**para** responder de forma inmediata a los prospectos interesados.

### Criterios de Aceptación

1. **Generación de Brochure:**
   - Botón para crear un PDF profesional con la información comercial (sin datos privados de propietarios).
   - **Plantilla configurable por empresa** (con su logo, colores y estilo).
   - Contenido automático: Foto principal, galería (máx. 6 fotos), descripción, precio, amenidades, mapa de ubicación estático, datos de contacto del agente.
   - **Tracking:** Cada brochure generado recibe un identificador único. Si se envía por email, se rastrean las aperturas.
2. **Distribución Multicanal:**
   - **WhatsApp:** Abre la API de WA Business con un mensaje pre-configurado y link al brochure (alojado en CDN con URL corta).
   - **Correo:** Envío directo desde el CRM usando plantilla de email con el brochure adjunto o link.
   - **Copiar link:** Botón para copiar un enlace público (con tracking) al portapapeles para compartir en cualquier canal.

---

# 10. Portal del Cliente y Perfilamiento

## Épica: Descubrimiento de Propiedades, Guardado de Búsquedas y Segmentación

### Historias de Usuario

* **HU10.1:** **Como** cliente, **quiero** navegar por un catálogo dinámico filtrable (ubicación, tipo, precio) y guardar mis preferencias en mi cuenta, **para** encontrar fácilmente propiedades relevantes y recibir actualizaciones.
* **HU10.2:** **Como** agente comercial, **quiero** que el sistema agrupe a mis clientes según sus búsquedas guardadas y me alerte sobre prospectos inactivos, **para** ejecutar campañas de reactivación enfocadas.

### Criterios de Aceptación

1. **Catálogo Público:**
   - El carrusel inicial debe mostrar inmuebles en estado `Disponible` y `Nuevo`.
   - **Filtros avanzados:** Tipo de propiedad, rango de precios, ubicación/zona, número de habitaciones, superficie mínima, tipo de gestión (Venta/Renta).
   - **Ordenamiento:** Por precio (ascendente/descendente), por fecha de publicación, por relevancia (score de interacción).
   - **Paginación:** 12 propiedades por página con scroll infinito o paginación numérica (configurable).
   - **Vista de mapa:** Opción de ver propiedades como pines en un mapa interactivo (vista de mapa vs. vista de lista/grid).
2. **Perfil del Cliente:**
   - El cliente debe poder crear una cuenta para guardar sus filtros. El sistema registrará su fecha de "Última Actividad" con cada inicio de sesión o clic en una propiedad.
   - **Campos del registro:** Nombre completo, email (verificado), teléfono, tipo de propiedad de interés, rango de precio de interés, zona de interés.
   - **Login social:** Opción de registrar con Google (OAuth 2.0). El 2FA NO aplica para clientes del portal.
   - **Mi cuenta:** El cliente debe tener un panel con: Mis trámites, Mis favoritos, Mis búsquedas guardadas, Mis citas.
3. **Alertas de Inactividad:**
   - Si un lead pasa más de **14 días** sin interactuar (configurable por empresa entre 7 y 30 días), el CRM debe generar una notificación push/visual en el panel del agente sugiriendo contactarlo.
   - La alerta se muestra como notificación en el panel del agente y opcionalmente por email al agente.

### Preferencias de Búsqueda del Cliente

| Preferencia                    | Tipo de Dato | Descripción                                                        |
| :----------------------------- | :----------- | :------------------------------------------------------------------ |
| `tipo_propiedad_preferido`   | Enum[]       | Lista de tipos: Casa, Depto, Local, Terreno, Oficina, Bodega        |
| `tipo_gestion_preferido`     | Enum         | Venta, Renta o Ambas                                                |
| `rango_precio_min`           | Decimal      | Precio mínimo deseado                                              |
| `rango_precio_max`           | Decimal      | Precio máximo deseado                                              |
| `ubicacion_preferida`        | String/JSON  | Zona, colonia, municipio o coordenadas de interés                  |
| `num_habitaciones_min`       | Integer      | Número mínimo de habitaciones                                     |
| `superficie_min_m2`          | Decimal      | Metros cuadrados mínimos                                           |
| `alertas_nuevas_propiedades` | Boolean      | Recibir notificación cuando se publiquen propiedades que coincidan |
| `fecha_ultima_actividad`     | Datetime     | Actualizada automáticamente en cada interacción                   |

---

# 11. Embudo de Ventas y Máquina de Estados (Core)

## Épica: Proceso de Venta/Renta, Concurrencia y Reglas de Bloqueo

### Historias de Usuario

* **HU11.1:** **Como** cliente, **quiero** iniciar y dar seguimiento a un trámite de compra/renta desde mi perfil, **para** conocer la etapa exacta de mi solicitud.
* **HU11.2:** **Como** administrador, **quiero** que el sistema gestione "Trámites" (Cliente + Propiedad) bajo reglas estrictas de concurrencia, **para** evitar que múltiples agentes oferten sobre una propiedad que ya está en negociación.

### Criterios de Aceptación (Reglas Críticas de Negocio)

1. **Inicio del Proceso:** Al iniciar el trámite, se crea un registro en estado `Interesado`. En este estado, pueden existir múltiples clientes interesados en la misma propiedad.
2. **Transición a Negociación (Bloqueo):**
   - Cuando un cliente presenta una oferta, su trámite avanza a `Negociación`.
   - **Automáticamente**, la propiedad cambia a estado `Reservada`.
   - **Concurrencia:** Los trámites de otros clientes sobre esa propiedad se pausan. Se bloquea el botón "Ofertar" para agentes Junior. Solo un `Agente Senior` puede registrar una oferta competitiva si la propiedad está en "Negociación".
   - **Timeout de negociación:** Si un trámite permanece en `Negociación` más de **30 días naturales**, el sistema envía alerta al agente y al Admin sugiriendo resolver o cancelar.
   - **Oferta competitiva:** Cuando un Senior presenta oferta competitiva, se crea un trámite paralelo en sub-estado `Negociación (Competitiva)`. Solo puede existir **1 oferta competitiva** activa a la vez.
3. **Transición a Cierre:**
   - Si se acepta la oferta, el trámite pasa a `Cierre` y luego a `Finalizado`. La propiedad pasa a `Vendida/Rentada`. Todos los trámites pausados de otros clientes pasan a `Cancelado (Perdido)`.
   - **Documentación de cierre:** Al pasar a `Cierre`, el sistema debe solicitar adjuntar documentos de soporte (ej. promesa de compraventa, pagos recibidos).
   - **Comisión calculada:** Al finalizar, el sistema calcula automáticamente el monto de comisión: `precio_venta * comision_pct / 100`.
4. **Transición a Cancelado:**
   - Si la venta fracasa, el trámite actual se `Cancela`, la propiedad vuelve a `Disponible` y los trámites pausados se reactivan.
   - Se exige un **motivo obligatorio** seleccionado de una lista predefinida: `Precio no competitivo`, `Cliente no calificó para crédito`, `Propietario retiró propiedad`, `Cliente encontró otra opción`, `Documentación incompleta`, `Otro (especificar)`.

---

# 12. Omnicanalidad y Productividad

## Épica: Registro de Comunicaciones y Gestión de Tareas

### Historias de Usuario

* **HU12.1:** **Como** agente, **quiero** que mis correos, llamadas y mensajes de WhatsApp se vinculen automáticamente al historial del trámite del cliente, **para** tener contexto centralizado.
* **HU12.2:** **Como** agente, **quiero** configurar tareas recurrentes y recibir notificaciones cuando un cliente abra un correo de propuesta, **para** contactarlo en el momento de mayor interés (Termómetro de Lead).

### Criterios de Aceptación

1. **Línea de Tiempo (Timeline):**
   - Cada trámite debe tener una vista cronológica que muestre el log de interacciones.
   - Tipos de entrada: `Email enviado`, `Email recibido`, `Llamada realizada`, `Llamada recibida`, `Mensaje WhatsApp`, `Nota manual`, `Cambio de estado`, `Cita agendada`, `Documento adjunto`, `Acción del sistema`.
   - **Nota rápida:** El agente debe poder agregar notas manuales con un botón rápido desde la timeline (sin navegar a otra pantalla).
   - **Mención a otro agente:** En las notas, el agente debe poder @mencionar a otro agente para que reciba notificación.
2. **Tracking de Email:**
   - El sistema debe usar un pixel de seguimiento en los correos enviados desde el CRM para cambiar el estado a "Leído" y disparar una alerta en tiempo real al agente.
   - **Privacidad:** El pixel de tracking debe cumplir con regulaciones de privacidad. El sistema debe informar al destinatario que el correo contiene tracking (footer del email).
3. **Tareas Automáticas:**
   - Permitir la creación de flujos como "Recordatorio de seguimiento cada 7 días si el trámite sigue en estado Interesado".
   - **Tipos de tarea:** `Seguimiento`, `Llamada`, `Enviar documento`, `Agendar visita`, `Revisar precio`, `Personalizada`.
   - **Prioridad:** Alta, Media, Baja.
   - **Asignación:** Las tareas pueden asignarse a uno mismo o a un agente subordinado (según jerarquía).
   - **Vista de tareas pendientes:** Panel consolidado tipo "To-Do" con filtros por prioridad, fecha de vencimiento y estado (Pendiente, En Progreso, Completada, Vencida).

---

# 13. Agenda Inteligente y Visitas

## Épica: Programación de Citas, Reprogramación y Reportes de Campo

### Historias de Usuario

* **HU13.1:** **Como** agente, **quiero** agendar visitas enviando invitaciones de calendario (.ics) basadas en mi disponibilidad real, **para** evitar choques de horarios.
* **HU13.2:** **Como** agente, **quiero** que el cliente pueda reprogramar su visita desde un enlace y que yo deba llenar un reporte obligatorio al finalizar la cita, **para** mantener informado al propietario de la casa.

### Criterios de Aceptación

1. **Prevención de Conflictos:**
   - El agendador debe ocultar los horarios donde el agente ya tenga otra cita en el CRM o en su calendario sincronizado.
   - **Buffer entre citas:** Buffer configurable de **30 minutos** entre citas para traslados.
   - **Horarios laborales:** El agente debe poder definir su horario laboral (ej. Lunes a Viernes 9:00-18:00). Las citas fuera de horario se bloquean por defecto.
2. **Portal de Reprogramación:** El correo de confirmación de cita debe incluir un enlace seguro donde el cliente pueda cambiar la hora (respetando los bloques libres del agente) sin necesidad de llamar.
3. **Reporte de Visita:**
   - 2 horas después de la cita, el CRM debe generar una tarea "Pendiente" exigiendo al agente completar un formulario.
   - **Campos del reporte:**
     - Nivel de interés (1-5 estrellas).
     - ¿El cliente asistió? (Sí / No / Llegó tarde).
     - Comentarios positivos (texto libre).
     - Comentarios negativos / objeciones (texto libre).
     - ¿Se programa otra visita? (Sí/No → si sí, abre el agendador).
     - Fotografías de la visita (opcional, para documentar estado actual de la propiedad).
   - **Envío al propietario:** El agente puede optar por enviar un resumen (sin datos del cliente) al propietario por email desde el mismo formulario.

---

# 14. Automatización de Marketing

## Épica: Campañas, Chatbot, Redes Sociales y Respuestas Rápidas

### Historias de Usuario

* **HU14.1 (Redes Sociales):** **Como** agente inmobiliario, **quiero** conectar mi cuenta de Meta para publicar automáticamente el inventario en Facebook e Instagram desde el CRM, **para** reducir el tiempo de carga manual y unificar la gestión de anuncios.
* **HU14.2 (Email Marketing & Respuestas):** **Como** agente comercial, **quiero** configurar plantillas de respuestas rápidas y correos automatizados (auto-responders) que se disparen según la actividad del cliente, **para** mantener la comunicación constante sin esfuerzo manual.
* **HU14.3 (Chatbot):** **Como** administrador, **quiero** integrar un widget de chatbot en el portal web que capture datos básicos (nombre, teléfono, tipo de propiedad de interés), **para** alimentar automáticamente el embudo de ventas con nuevos leads 24/7.

### Criterios de Aceptación

1. **Publicación en Meta:**
   - El sistema debe usar el *Graph API* de Meta. Al marcar una propiedad como "Publicar en Redes", el CRM enviará la galería principal, el precio y el link hacia la página de Facebook del agente/agencia.
   - **Publicación programada:** El agente debe poder programar la publicación para una fecha/hora futura.
   - **Historial de publicaciones:** Registrar cada publicación con fecha, red social, ID externo, y estado (Publicado, Error, Eliminado).
2. **Disparadores de Correo (Triggers):**
   - Si un cliente entra a estado "Interesado", el sistema debe enviar instantáneamente el correo plantilla `Bienvenida_Propiedad_X`.
   - **Tipos de trigger configurables:**
     - `on_nuevo_interesado` → Enviar bienvenida.
     - `on_cambio_estado` → Notificar al cliente.
     - `on_propiedad_nueva_match` → Alertar a clientes con preferencias que coincidan.
     - `on_cita_agendada` → Confirmación + enlace de reprogramación.
     - `on_inactividad` → Email de re-engagement al lead.
3. **Gestor de Plantillas (CRUD):**
   - Los agentes deben poder crear y guardar textos predefinidos usando variables dinámicas (ej. `Hola {{nombre_cliente}}, adjunto el brochure de {{titulo_propiedad}}`).
   - **Previsualización:** El agente debe poder previsualizar la plantilla con datos de ejemplo antes de guardar.
   - **Versionado:** Las plantillas deben tener un historial de versiones (quién cambió qué y cuándo).
4. **Webhook del Chatbot:**
   - Al finalizar la conversación, el chatbot debe inyectar el contacto en la base de datos.
   - **Modos de asignación:** `Round Robin` (equitativo por turno), `Menos carga` (asigna al agente con menos trámites activos), `Manual` (entra a bandeja de "Sin asignar" para que el Admin distribuya).

---

# 15. Inteligencia de Negocios (BI) y Rendimiento

## Épica: Reportes, Métricas, Ranking y Sugerencias del Sistema

### Historias de Usuario

* **HU15.1 (Métricas de Inventario):** **Como** agente, **quiero** visualizar un dashboard que clasifique mis propiedades por "Nivel de Interacción" (clics, correos, citas en los últimos 30 días), **para** identificar qué inmuebles requieren ajuste de precio o más publicidad.
* **HU15.2 (Reporte de Desempeño):** **Como** agente, **quiero** generar reportes estadísticos de mis cierres, clientes contactados y comisiones proyectadas, **para** evaluar mi propio cumplimiento de metas.
* **HU15.3 (Gamificación / Ranking):** **Como** agente, **quiero** ver mi posición en un ranking anónimo de ventas de la agencia, **para** comparar mi rendimiento promedio contra el resto del equipo.

### Criterios de Aceptación

1. **Filtros de Dashboard:** El panel de reportes debe permitir filtrar por rango de fechas (Semana, Mes, Trimestre, Año) y exportar los datos a PDF o Excel.
2. **Algoritmo de Interacción:** El "Top Propiedades" se calculará sumando:
   - `Vistas web (1pt) + Favoritos (2pts) + Correos abiertos (2pts) + Llamadas registradas (3pts) + Citas agendadas (5pts) + Ofertas recibidas (10pts)`.
   - El score se recalcula en la vista materializada cada **15 minutos**.
3. **Privacidad del Ranking (RBAC):** Un agente Junior o Senior solo verá su propio nombre y "Agente Oculto 1", "Agente Oculto 2", etc. Solo el rol **Administrador** puede ver los nombres de todos en la comparativa de rendimiento.
4. **Sugerencias Automatizadas:**
   - **30 días** sin interacción → Alerta leve: "Considerar reducir precio o mejorar fotos".
   - **45 días** sin interacción → Alerta moderada: "Revisar precio de mercado".
   - **60 días** sin interacción → Alerta alta: "Propiedad estancada — considerar pausa o reestructuración de venta".
5. **Dashboard del Administrador:** Métricas globales de la empresa:
   - Total de propiedades por estado (gráfico de dona).
   - Embudo de conversión general (Interesados → Negociación → Cierre → Finalizado).
   - Comisiones totales proyectadas vs. realizadas.
   - Ranking de agentes (con nombres visibles para Admin).
   - Mapa de calor de propiedades por zona geográfica.

### Notas para el equipo de desarrollo

* Es altamente recomendable que los desarrolladores no calculen los reportes complejos en tiempo real consultando las tablas transaccionales, sino que utilicen **vistas materializadas** o una base de datos secundaria (Data Warehouse ligero) para no ralentizar el sistema cuando los agentes saquen reportes de fin de mes.

---

# 16. Ecosistema Extendido y Movilidad

## Épica: Portales Externos, Firmas Digitales, Videollamadas y Notificaciones

### Historias de Usuario

* **HU16.1 (Sindicación Inmobiliaria):** **Como** administrador, **quiero** conectar el inventario vía API o XML a portales externos (Zillow, MercadoLibre, Encuentra24), **para** que las propiedades disponibles se sincronicen automáticamente sin doble digitación.
* **HU16.2 (Integraciones de Cierre y Citas):** **Como** agente, **quiero** enviar contratos vía DocuSign/Adobe Sign y agendar videollamadas con Zoom/Meet nativamente, **para** que el historial del trámite centralice los enlaces y documentos legales firmados.
* **HU16.3 (Movilidad y Alertas):** **Como** agente en campo, **quiero** recibir notificaciones push en mi celular sobre citas próximas, vencimiento de contratos de exclusividad y nuevos leads, **para** no perder oportunidades por estar fuera de la oficina.

### Criterios de Aceptación

1. **Mapeo de Sindicación:**
   - El administrador debe poder elegir qué propiedades se envían a qué portales mediante checkboxes en la ficha técnica de la propiedad.
   - **Estado de sincronización:** Mostrar por portal: `Sincronizado`, `Pendiente`, `Error (con detalle)`.
   - **Frecuencia de sincronización:** Configurable por portal: Tiempo real, cada hora, diario.
2. **Estado de Firma (Webhooks):** El sistema debe escuchar el estado de DocuSign. Cuando el cliente firma, el trámite debe avanzar automáticamente o notificar al agente.
3. **Motor de Recordatorios (Cronjobs):**
   - Un proceso automático en el servidor revisará diariamente las fechas clave y generará notificaciones del sistema 7, 3 y 1 día antes de un vencimiento.
   - **Tipos de recordatorio:**
     - Vencimiento de contrato de exclusividad.
     - Pago de comisión pendiente.
     - Cita sin reporte de visita completado.
     - Trámite en negociación por más de 30 días.
     - Propiedad sin actividad por más de 30/45/60 días.
     - Renovación de documentos legales próxima a vencer.
4. **App Móvil (Notificaciones Push):**
   - La aplicación móvil debe estar conectada a Firebase Cloud Messaging (FCM) o Apple Push Notification service (APNs) para alertas en tiempo real.
   - **Centro de Notificaciones configurable:** El agente debe poder encender/apagar cada tipo de notificación individualmente para evitar fatiga de alertas. Opciones: Push, Email, Solo in-app, Desactivada.

---

# 17. Módulos Transversales

## 17.1 Centro de Notificaciones

### Historia de Usuario

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

## 17.2 Búsqueda Global

### Historia de Usuario

**Como** usuario del CRM,
**quiero** poder buscar rápidamente propiedades, clientes, trámites o agentes desde una barra de búsqueda global,
**para** navegar eficientemente sin recorrer múltiples módulos.

### Criterios de Aceptación

1. **Barra de búsqueda:** Accesible desde el header del CRM, activable con atajo de teclado (`Ctrl+K` o `/`).
2. **Búsqueda federada:** Los resultados agrupan por entidad: Propiedades, Clientes, Trámites, Agentes.
3. **Resultados instantáneos:** Tipo-ahead con resultados después de 3 caracteres, con debounce de 300ms.
4. **Respeto de permisos:** Solo muestra resultados a los que el usuario tiene acceso según RBAC y jerarquía.

---

## 17.3 Importación Masiva de Datos

### Historia de Usuario

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

# 18. Matrices de Permisos

## 18.1 Permisos de Inventario (RBAC y Jerarquía)

*Nota técnica: "Línea Ascendente" (Upline) refiere a los jefes hacia arriba. "Línea Descendente" (Downline) refiere a los subordinados hacia abajo.*

| Acción sobre Propiedades                | Administrador       | Agente Senior                    | Agente Junior            |
| :--------------------------------------- | :------------------ | :------------------------------- | :----------------------- |
| **Crear / Editar Propias**         | ✅ Sí              | ✅ Sí                           | ✅ Sí                   |
| **Ver Propias**                    | ✅ Sí              | ✅ Sí                           | ✅ Sí                   |
| **Ver Línea Ascendente**          | N/A                 | ❌ No (Configurable por empresa) | ✅ Sí                   |
| **Ver Línea Descendente**         | ✅ Sí (Ve todo)    | ✅ Sí                           | ❌ No (No tiene a cargo) |
| **Editar Línea Descendente**      | ✅ Sí (Edita todo) | ✅ Sí                           | ❌ No                    |
| **Editar Línea Ascendente**       | N/A                 | ❌ No                            | ❌ No                    |
| **Ofertar en Propiedad Reservada** | ✅ Sí              | ✅ Sí                           | ❌ Bloqueado             |

## 18.2 Permisos de Información Sensible

| Elemento              | Administrador | Agente Senior                 | Agente Junior                     |
| :-------------------- | :------------ | :---------------------------- | :-------------------------------- |
| Ver Info Comercial    | ✅ Sí        | ✅ Sí                        | ✅ Sí                            |
| Ver Datos Propietario | ✅ Sí        | ✅ Sí (Si es su equipo)      | ❌ No (Opcional según política) |
| Ver Carta Comisión   | ✅ Sí        | ✅ Sí (Solo sus propiedades) | ❌ No                             |
| Editar Precios        | ✅ Sí        | ✅ Sí                        | ❌ Solo si es el captador         |

## 18.3 Permisos por Módulo

| Módulo                     | Administrador           | Agente Senior               | Agente Junior     | Cliente                  |
| :-------------------------- | :---------------------- | :-------------------------- | :---------------- | :----------------------- |
| Dashboard                   | ✅ Completo             | ✅ Su equipo                | ✅ Personal       | ❌ N/A                   |
| Gestión de Usuarios        | ✅ CRUD                 | ❌ Solo lectura (su equipo) | ❌ N/A            | ❌ N/A                   |
| Propiedades — Propias      | ✅ CRUD                 | ✅ CRUD                     | ✅ CRUD           | ❌ Solo lectura (portal) |
| Propiedades — Downline     | ✅ CRUD (todas)         | ✅ CRUD                     | ❌ N/A            | ❌ N/A                   |
| Propiedades — Upline       | ✅ N/A                  | ❌ No (Configurable)        | ✅ Solo lectura   | ❌ N/A                   |
| Datos del Propietario       | ✅ Ver/Editar           | ✅ Solo su equipo           | ❌ No             | ❌ No                    |
| Documentos Legales          | ✅ Ver/Editar           | ✅ Solo su equipo           | ❌ No             | ❌ No                    |
| Carta de Comisión          | ✅ Ver/Generar          | ✅ Solo propias             | ❌ No             | ❌ No                    |
| Trámites (Embudo)          | ✅ Ver todos            | ✅ Su equipo                | ✅ Solo asignados | ✅ Solo propios          |
| Citas / Visitas             | ✅ Ver todas            | ✅ Su equipo                | ✅ Solo propias   | ✅ Solo propias          |
| Reportes BI                 | ✅ Completo             | ✅ Su equipo                | ✅ Personal       | ❌ N/A                   |
| Ranking de Agentes          | ✅ Con nombres visibles | ⚠️ Anónimo               | ⚠️ Anónimo     | ❌ N/A                   |
| Configuración de Seguridad | ✅ Completo             | ❌ N/A                      | ❌ N/A            | ❌ N/A                   |
| Auditoría                  | ✅ Solo lectura         | ❌ N/A                      | ❌ N/A            | ❌ N/A                   |
| Campañas Marketing         | ✅ CRUD                 | ✅ CRUD                     | ❌ Solo lectura   | ❌ N/A                   |
| Portal Público             | ❌ N/A                  | ❌ N/A                      | ❌ N/A            | ✅ Acceso total          |

## 18.4 Portal Público del Cliente

| Funcionalidad                    | Descripción                                                               | Autenticación             |
| :------------------------------- | :------------------------------------------------------------------------- | :------------------------- |
| Ver catálogo de propiedades     | Carrusel y listado filtrable (solo estado "Disponible" y "Nuevo")          | ❌ No requerida            |
| Filtrar propiedades              | Por ubicación, tipo de propiedad, rango de precios, habitaciones          | ❌ No requerida            |
| Ver detalle de propiedad         | Galería multimedia, mapa, descripción, precio (sin datos de propietario) | ❌ No requerida            |
| Guardar búsquedas/preferencias  | Registrar filtros favoritos para recibir alertas                           | ✅ Requiere cuenta         |
| Solicitar información al agente | Enviar mensaje sobre una propiedad específica                             | ✅ Requiere cuenta         |
| Iniciar trámite de compra/renta | Expresar interés formal en una propiedad                                  | ✅ Requiere cuenta         |
| Dar seguimiento a trámites      | Ver estado actual de su proceso de compra/renta                            | ✅ Requiere cuenta         |
| Reprogramar cita                 | Cambiar horario de visita desde enlace seguro                              | ✅ Requiere enlace válido |

---

# 19. Matriz de Datos Consolidada (Data Schema)

## 19.1 Entidad: Empresa (Tenant)

| Atributo             | Tipo de Dato | Obligatorio | Regla de Negocio                         |
| :------------------- | :----------- | :---------- | :--------------------------------------- |
| `id_empresa`       | UUID         | Sí         | PK. Clave de multitenancy.               |
| `nombre_empresa`   | String(100)  | Sí         | Único en la plataforma.                 |
| `logo_url`         | String(500)  | No          | Ruta a S3/R2.                            |
| `color_primario`   | String(7)    | Sí         | Formato HEX. Default:`#1E3A5F`.        |
| `color_secundario` | String(7)    | Sí         | Formato HEX. Default:`#F5A623`.        |
| `color_acento`     | String(7)    | No          | Color de acento para botones/links.      |
| `plan`             | Enum         | Sí         | `[Free, Pro, Enterprise]`.             |
| `max_usuarios`     | Integer      | Sí         | Límite de usuarios activos.             |
| `max_propiedades`  | Integer      | Sí         | Límite de propiedades activas.          |
| `moneda_default`   | Enum         | Sí         | `[GTQ, USD]`.                          |
| `zona_horaria`     | String(50)   | Sí         | IANA Timezone. Ej:`America/Guatemala`. |
| `estado_empresa`   | Enum         | Sí         | `[Activa, Suspendida, Cancelada]`.     |
| `created_at`       | Datetime     | Sí         | Automático.                             |
| `updated_at`       | Datetime     | Sí         | Automático.                             |

## 19.2 Entidad: Usuario

| Atributo                | Tipo de Dato | Obligatorio | Regla de Negocio                               |
| :---------------------- | :----------- | :---------- | :--------------------------------------------- |
| `id_usuario`          | UUID         | Sí         | PK.                                            |
| `tenant_id`           | UUID (FK)    | Sí         | Referencia a Empresa.                          |
| `email`               | String(255)  | Sí         | Único por tenant.                             |
| `password_hash`       | String       | Sí         | BCrypt.                                        |
| `nombre_completo`     | String(200)  | Sí         | —                                             |
| `telefono`            | String(20)   | No          | —                                             |
| `avatar_url`          | String(500)  | No          | Foto de perfil.                                |
| `rol`                 | Enum         | Sí         | `[SUPER_ADMIN, ADMIN, SENIOR, JUNIOR]`.      |
| `id_supervisor`       | UUID (FK)    | No          | Auto-referencia. Crea árbol jerárquico.      |
| `estado_usuario`      | Enum         | Sí         | `[Pendiente, Activo, Suspendido, Inactivo]`. |
| `secret_2fa`          | String       | No          | Obligatorio tras onboarding.                   |
| `intentos_login`      | Integer      | Sí         | Default: 0.                                    |
| `fecha_bloqueo`       | Datetime     | No          | Si está bloqueado, indica hasta cuándo.      |
| `ultimo_login`        | Datetime     | No          | Fecha del último acceso exitoso.              |
| `password_changed_at` | Datetime     | No          | Para política de cambio cada 90 días.        |
| `created_at`          | Datetime     | Sí         | Automático.                                   |
| `updated_at`          | Datetime     | Sí         | Automático.                                   |

## 19.3 Entidad: Propietario

| Atributo               | Tipo de Dato | Obligatorio | Regla de Negocio        |
| :--------------------- | :----------- | :---------- | :---------------------- |
| `id_propietario`     | UUID         | Sí         | PK.                     |
| `tenant_id`          | UUID (FK)    | Sí         | Referencia a Empresa.   |
| `nombre_completo`    | String(200)  | Sí         | —                      |
| `dpi_identificacion` | String(20)   | Sí         | Único por tenant.      |
| `nit_fiscal`         | String(15)   | No          | —                      |
| `telefono_1`         | String(20)   | Sí         | —                      |
| `telefono_2`         | String(20)   | No          | —                      |
| `email`              | String(255)  | No          | —                      |
| `direccion`          | String(500)  | No          | —                      |
| `notas_internas`     | Text         | No          | —                      |
| `estado`             | Enum         | Sí         | `[Activo, Inactivo]`. |
| `created_at`         | Datetime     | Sí         | Automático.            |
| `updated_at`         | Datetime     | Sí         | Automático.            |

## 19.4 Entidad: Propiedad

| Atributo                       | Tipo de Dato  | Obligatorio | Regla de Negocio                                                     |
| :----------------------------- | :------------ | :---------- | :------------------------------------------------------------------- |
| `id_propiedad`               | UUID          | Sí         | PK.                                                                  |
| `tenant_id`                  | UUID (FK)     | Sí         | Referencia a Empresa.                                                |
| `codigo_referencia`          | String(20)    | Sí         | Auto-generado, único por tenant. Ej:`PROP-0001`.                  |
| `tipo_propiedad`             | Enum          | Sí         | Casa, Depto, Local, Terreno, Oficina, Bodega.                        |
| `tipo_gestion`               | Enum          | Sí         | Venta, Renta, Ambas.                                                 |
| `precio_venta`               | Decimal(12,2) | Condicional | Requerido si gestión incluye Venta.                                 |
| `precio_renta`               | Decimal(12,2) | Condicional | Requerido si gestión incluye Renta.                                 |
| `moneda`                     | Enum          | Sí         | `[GTQ, USD]`. Default: configuración de empresa.                  |
| `status`                     | Enum          | Sí         | Nuevo, Disponible, Reservado, Vendido, Rentado, Cancelado, Inactivo. |
| `descripcion`                | Text          | Sí         | Mínimo 50 caracteres.                                               |
| `direccion_texto`            | String(500)   | Sí         | Dirección legible.                                                  |
| `zona_sector`                | String(100)   | Sí         | Zona geográfica.                                                    |
| `coords_gps`                 | Point/JSON    | Sí         | Latitud y Longitud.                                                  |
| `num_habitaciones`           | Integer       | Condicional | Obligatorio para Casa y Departamento.                                |
| `num_banos`                  | Integer       | Condicional | Obligatorio para Casa y Departamento.                                |
| `num_parqueos`               | Integer       | No          | —                                                                   |
| `superficie_m2`              | Decimal(10,2) | Sí         | Metros cuadrados totales.                                            |
| `superficie_construccion_m2` | Decimal(10,2) | No          | —                                                                   |
| `anio_construccion`          | Integer       | No          | —                                                                   |
| `nivel_piso`                 | Integer       | No          | Aplica para Depto/Oficina.                                           |
| `amenidades`                 | JSON          | No          | Array de strings.                                                    |
| `id_propietario`             | UUID (FK)     | Sí         | Referencia a Propietario.                                            |
| `id_agente_captador`         | UUID (FK)     | Sí         | Agente responsable.                                                  |
| `comision_pct`               | Decimal(5,2)  | Sí         | Porcentaje pactado.                                                  |
| `doc_comision_url`           | String(500)   | No          | Ruta al PDF generado.                                                |
| `imagen_portada_url`         | String(500)   | No          | Foto principal de la propiedad.                                      |
| `galeria_multimedia`         | JSON          | No          | Array de objetos:`{url, tipo, orden, thumbnail_url}`.              |
| `expediente_legal`           | JSON          | No          | Array de `{url, tipo_doc, fecha_vencimiento, nombre}`.             |
| `publicar_en_portal`         | Boolean       | Sí         | Default: true.                                                       |
| `fecha_publicacion`          | Datetime      | No          | Fecha en que se publicó por primera vez.                            |
| `created_at`                 | Datetime      | Sí         | Automático.                                                         |
| `updated_at`                 | Datetime      | Sí         | Automático.                                                         |

## 19.5 Entidad: Cliente

| Atributo                     | Tipo de Dato | Obligatorio | Regla de Negocio                   |
| :--------------------------- | :----------- | :---------- | :--------------------------------- |
| `id_cliente`               | UUID         | Sí         | PK. ID del usuario final.          |
| `tenant_id`                | UUID (FK)    | Sí         | Referencia a Empresa.              |
| `nombre_completo`          | String(200)  | Sí         | —                                 |
| `email`                    | String(255)  | Sí         | Único por tenant. Verificado.     |
| `telefono`                 | String(20)   | No          | —                                 |
| `password_hash`            | String       | Sí         | BCrypt.                            |
| `tipo_propiedad_preferido` | JSON         | No          | Array de Enums: tipos de interés. |
| `rango_precio_min`         | Decimal      | No          | —                                 |
| `rango_precio_max`         | Decimal      | No          | —                                 |
| `ubicacion_preferida`      | String/JSON  | No          | Zona de interés.                  |
| `fecha_ultima_actividad`   | Datetime     | Sí         | Actualizada en cada login o clic.  |
| `estado`                   | Enum         | Sí         | `[Pendiente, Activo, Inactivo]`. |
| `created_at`               | Datetime     | Sí         | Automático.                       |
| `updated_at`               | Datetime     | Sí         | Automático.                       |

## 19.6 Entidad: Trámite

| Atributo                    | Tipo de Dato  | Obligatorio | Regla de Negocio                                                       |
| :-------------------------- | :------------ | :---------- | :--------------------------------------------------------------------- |
| `id_tramite`              | UUID          | Sí         | PK. El "Deal". Une Cliente, Agente y Propiedad.                        |
| `tenant_id`               | UUID (FK)     | Sí         | Referencia a Empresa.                                                  |
| `id_cliente`              | UUID (FK)     | Sí         | Referencia a Cliente.                                                  |
| `id_propiedad`            | UUID (FK)     | Sí         | Referencia a Propiedad.                                                |
| `id_agente`               | UUID (FK)     | Sí         | Agente que gestiona el trámite.                                       |
| `estado_tramite`          | Enum          | Sí         | `[Interesado, Negociacion, Cierre, Finalizado, Cancelado, Pausado]`. |
| `tipo_tramite`            | Enum          | Sí         | `[Compra, Renta]`.                                                   |
| `monto_oferta`            | Decimal(12,2) | No          | Registrado al pasar a Negociación.                                    |
| `motivo_cancelacion`      | Text          | Condicional | Requerido si estado = Cancelado.                                       |
| `motivo_cancelacion_tipo` | Enum          | Condicional | Valor predefinido de motivo.                                           |
| `comision_calculada`      | Decimal(12,2) | No          | Calculada al Finalizar:`precio * comision_pct / 100`.                |
| `fecha_inicio`            | Datetime      | Sí         | Automática.                                                           |
| `fecha_cierre`            | Datetime      | No          | Cuando pasa a Finalizado.                                              |
| `created_at`              | Datetime      | Sí         | Automático.                                                           |
| `updated_at`              | Datetime      | Sí         | Automático.                                                           |

## 19.7 Entidad: Interacción

| Atributo           | Tipo de Dato | Obligatorio | Regla de Negocio                               |
| :----------------- | :----------- | :---------- | :--------------------------------------------- |
| `id_interaccion` | UUID         | Sí         | PK. Log de comunicación.                      |
| `tenant_id`      | UUID (FK)    | Sí         | Referencia a Empresa.                          |
| `id_tramite`     | UUID (FK)    | Sí         | Referencia al trámite.                        |
| `id_usuario`     | UUID (FK)    | Sí         | Agente que registra.                           |
| `tipo_canal`     | Enum         | Sí         | `[Email, WhatsApp, Llamada, Sistema, Nota]`. |
| `direccion`      | Enum         | Sí         | `[Entrante, Saliente, Interna]`.             |
| `contenido`      | Text         | No          | Cuerpo del mensaje o nota.                     |
| `metadata`       | JSON         | No          | Datos adicionales (email_id, tracking, etc.).  |
| `created_at`     | Datetime     | Sí         | Automático.                                   |

## 19.8 Entidad: Cita

| Atributo                  | Tipo de Dato | Obligatorio | Regla de Negocio                                      |
| :------------------------ | :----------- | :---------- | :---------------------------------------------------- |
| `id_cita`               | UUID         | Sí         | PK. Evento de agenda.                                 |
| `tenant_id`             | UUID (FK)    | Sí         | Referencia a Empresa.                                 |
| `id_tramite`            | UUID (FK)    | Sí         | Referencia al trámite.                               |
| `id_agente`             | UUID (FK)    | Sí         | Agente asignado.                                      |
| `id_cliente`            | UUID (FK)    | Sí         | Cliente citado.                                       |
| `id_propiedad`          | UUID (FK)    | Sí         | Propiedad a visitar.                                  |
| `fecha_hora_inicio`     | Datetime     | Sí         | Inicio de la cita.                                    |
| `fecha_hora_fin`        | Datetime     | Sí         | Fin de la cita.                                       |
| `estado_cita`           | Enum         | Sí         | `[Programada, Reprogramada, Realizada, Cancelada]`. |
| `token_reprogramacion`  | String       | Sí         | Token seguro para el link de reprogramación.         |
| `feedback_interes`      | Integer      | No          | Escala del 1 al 5 llenada por el agente.              |
| `cliente_asistio`       | Enum         | No          | `[Si, No, Llego_tarde]`.                            |
| `comentarios_positivos` | Text         | No          | —                                                    |
| `comentarios_negativos` | Text         | No          | Objeciones del cliente.                               |
| `fotos_visita`          | JSON         | No          | Array de URLs de fotos tomadas durante la visita.     |
| `created_at`            | Datetime     | Sí         | Automático.                                          |
| `updated_at`            | Datetime     | Sí         | Automático.                                          |

## 19.9 Entidad: Plantilla de Mensaje

| Atributo         | Tipo de Dato | Obligatorio | Regla de Negocio                             |
| :--------------- | :----------- | :---------- | :------------------------------------------- |
| `id_plantilla` | UUID         | Sí         | PK. ID del texto predefinido.                |
| `tenant_id`    | UUID (FK)    | Sí         | Referencia a Empresa.                        |
| `nombre`       | String(100)  | Sí         | Nombre descriptivo.                          |
| `tipo`         | Enum         | Sí         | `[Email, WhatsApp, SMS]`.                  |
| `cuerpo_html`  | Text         | Sí         | Contenido con variables (ej.`{{nombre}}`). |
| `version`      | Integer      | Sí         | Número de versión.                         |
| `created_by`   | UUID (FK)    | Sí         | Usuario que creó.                           |
| `created_at`   | Datetime     | Sí         | Automático.                                 |
| `updated_at`   | Datetime     | Sí         | Automático.                                 |

## 19.10 Entidad: Campaña de Ads

| Atributo              | Tipo de Dato | Obligatorio | Regla de Negocio                               |
| :-------------------- | :----------- | :---------- | :--------------------------------------------- |
| `id_campana`        | UUID         | Sí         | PK. ID interno de la promoción.               |
| `tenant_id`         | UUID (FK)    | Sí         | Referencia a Empresa.                          |
| `id_propiedad`      | UUID (FK)    | Sí         | Propiedad promocionada.                        |
| `id_externo_fb`     | String       | No          | ID devuelto por el API de Facebook.            |
| `red_social`        | Enum         | Sí         | `[Facebook, Instagram]`.                     |
| `estado`            | Enum         | Sí         | `[Programado, Publicado, Error, Eliminado]`. |
| `fecha_publicacion` | Datetime     | No          | Fecha efectiva o programada.                   |
| `created_at`        | Datetime     | Sí         | Automático.                                   |

## 19.11 Entidad: Métrica de Propiedad

| Atributo              | Tipo de Dato | Obligatorio | Regla de Negocio                                          |
| :-------------------- | :----------- | :---------- | :-------------------------------------------------------- |
| `id_metrica`        | UUID         | Sí         | PK.                                                       |
| `tenant_id`         | UUID (FK)    | Sí         | Referencia a Empresa.                                     |
| `id_propiedad`      | UUID (FK)    | Sí         | Referencia a Propiedad.                                   |
| `visitas_web`       | Integer      | Sí         | Contador de views en el portal. Default: 0.               |
| `favoritos`         | Integer      | Sí         | Número de veces guardada como favorito. Default: 0.      |
| `score_interaccion` | Integer      | Calculado   | Fórmula de vistas + favoritos + leads + citas + ofertas. |
| `updated_at`        | Datetime     | Sí         | Automático.                                              |

## 19.12 Entidad: Integración

| Atributo                  | Tipo de Dato | Obligatorio | Regla de Negocio                                                             |
| :------------------------ | :----------- | :---------- | :--------------------------------------------------------------------------- |
| `id_integracion`        | UUID         | Sí         | PK.                                                                          |
| `tenant_id`             | UUID (FK)    | Sí         | Referencia a Empresa.                                                        |
| `proveedor`             | Enum         | Sí         | `[Zillow, MercadoLibre, Encuentra24, DocuSign, Zoom, GoogleMaps, Mapbox]`. |
| `api_key_token`         | String       | Sí         | Llave de conexión encriptada (AES-256).                                     |
| `estado`                | Enum         | Sí         | `[Activa, Inactiva, Error]`.                                               |
| `ultima_sincronizacion` | Datetime     | No          | —                                                                           |
| `created_at`            | Datetime     | Sí         | Automático.                                                                 |

## 19.13 Entidad: Recordatorio

| Atributo            | Tipo de Dato | Obligatorio | Regla de Negocio                                                           |
| :------------------ | :----------- | :---------- | :------------------------------------------------------------------------- |
| `id_recordatorio` | UUID         | Sí         | PK. Alerta programada.                                                     |
| `tenant_id`       | UUID (FK)    | Sí         | Referencia a Empresa.                                                      |
| `id_usuario`      | UUID (FK)    | Sí         | Agente destinatario.                                                       |
| `tipo`            | Enum         | Sí         | `[Vencimiento, Comision, Reporte, Negociacion, Inactividad, Documento]`. |
| `titulo`          | String(200)  | Sí         | Resumen del recordatorio.                                                  |
| `entidad_ref`     | String       | No          | Tabla + ID del registro relacionado.                                       |
| `fecha_disparo`   | Datetime     | Sí         | Cuándo debe enviarse la alerta.                                           |
| `estado`          | Enum         | Sí         | `[Pendiente, Enviado, Leido, Descartado]`.                               |
| `created_at`      | Datetime     | Sí         | Automático.                                                               |

## 19.14 Entidad: Notificación

| Atributo            | Tipo de Dato | Obligatorio | Regla de Negocio                                                |
| :------------------ | :----------- | :---------- | :-------------------------------------------------------------- |
| `id_notificacion` | UUID         | Sí         | PK.                                                             |
| `tenant_id`       | UUID (FK)    | Sí         | Referencia a Empresa.                                           |
| `id_usuario`      | UUID (FK)    | Sí         | Usuario destinatario.                                           |
| `tipo`            | Enum         | Sí         | `[Asignacion, Lead, Cita, Tarea, Tramite, Sistema, Mencion]`. |
| `titulo`          | String(200)  | Sí         | —                                                              |
| `mensaje`         | String(500)  | Sí         | —                                                              |
| `link`            | String(500)  | No          | URL al recurso relacionado.                                     |
| `leida`           | Boolean      | Sí         | Default: false.                                                 |
| `created_at`      | Datetime     | Sí         | Automático.                                                    |

## 19.15 Entidad: Auditoría

| Atributo           | Tipo de Dato | Obligatorio | Regla de Negocio                                   |
| :----------------- | :----------- | :---------- | :------------------------------------------------- |
| `id_auditoria`   | UUID         | Sí         | PK.                                                |
| `tenant_id`      | UUID (FK)    | Sí         | Referencia a Empresa.                              |
| `id_usuario`     | UUID (FK)    | Sí         | Quién realizó la acción.                        |
| `nombre_usuario` | String       | Sí         | Nombre del usuario (desnormalizado para consulta). |
| `accion`         | Enum         | Sí         | `[CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT]`. |
| `modulo`         | String(50)   | Sí         | Módulo afectado.                                  |
| `entidad`        | String(50)   | Sí         | Tabla afectada.                                    |
| `entidad_id`     | UUID         | No          | ID del registro afectado.                          |
| `ip_address`     | String(45)   | Sí         | IPv4 o IPv6.                                       |
| `user_agent`     | String(500)  | No          | Navegador/dispositivo.                             |
| `payload_cambio` | JSON         | No          | Estado antes y después del cambio.                |
| `created_at`     | Datetime     | Sí         | Automático. Inmutable.                            |

## 19.16 Entidad: Seguridad (Configuración por Empresa)

| Atributo                    | Tipo de Dato | Obligatorio | Regla de Negocio                      |
| :-------------------------- | :----------- | :---------- | :------------------------------------ |
| `id_config`               | UUID         | Sí         | PK.                                   |
| `tenant_id`               | UUID (FK)    | Sí         | Referencia a Empresa.                 |
| `geo_paises`              | JSON         | No          | Ej.`["GT", "SV"]`.                  |
| `ips_permitidas`          | JSON         | No          | Lista blanca de IPs.                  |
| `dias_inactividad_lead`   | Integer      | Sí         | Default: 14. Rango: 7-30.             |
| `modo_asignacion_leads`   | Enum         | Sí         | `[RoundRobin, MenosCarga, Manual]`. |
| `senior_puede_ver_upline` | Boolean      | Sí         | Default: false.                       |
| `buffer_entre_citas_min`  | Integer      | Sí         | Default: 30 (minutos).                |
| `marca_agua_activa`       | Boolean      | Sí         | Default: true.                        |
| `created_at`              | Datetime     | Sí         | Automático.                          |
| `updated_at`              | Datetime     | Sí         | Automático.                          |

---

# 20. Requerimientos No Funcionales

## 20.1 Rendimiento

| #      | Requerimiento                                           | Métrica                                     |
| :----- | :------------------------------------------------------ | :------------------------------------------- |
| RNF-01 | Tiempo de carga de cualquier página del CRM            | ≤ 2 segundos (P95)                          |
| RNF-02 | Tiempo de respuesta de API                              | ≤ 500ms (P95) para operaciones CRUD         |
| RNF-03 | Tiempo de generación de PDF (brochure/carta comisión) | ≤ 10 segundos                               |
| RNF-04 | Tiempo de carga del portal público                     | ≤ 3 segundos (First Contentful Paint)       |
| RNF-05 | Consultas de reportes BI                                | ≤ 5 segundos (usando vistas materializadas) |

## 20.2 Disponibilidad y Confiabilidad

| #      | Requerimiento                  | Métrica                                            |
| :----- | :----------------------------- | :-------------------------------------------------- |
| RNF-06 | Disponibilidad del sistema     | 99.5% uptime mensual (≤ 3.6 horas de downtime/mes) |
| RNF-07 | Respaldos de base de datos     | Automáticos cada 24 horas. Retención: 30 días.   |
| RNF-08 | RPO (Recovery Point Objective) | ≤ 24 horas                                         |
| RNF-09 | RTO (Recovery Time Objective)  | ≤ 4 horas                                          |

## 20.3 Escalabilidad

| #      | Requerimiento                     | Métrica                                               |
| :----- | :-------------------------------- | :----------------------------------------------------- |
| RNF-10 | Usuarios concurrentes por empresa | Hasta 50 simultáneos                                  |
| RNF-11 | Propiedades por empresa           | Hasta 10,000 activas                                   |
| RNF-12 | Archivos multimedia almacenados   | Sin límite lógico (escalamiento horizontal en S3/R2) |
| RNF-13 | Empresas en la plataforma         | Hasta 100 tenants sin degradación                     |

## 20.4 Seguridad

| #      | Requerimiento              | Métrica                                                      |
| :----- | :------------------------- | :------------------------------------------------------------ |
| RNF-14 | Encriptación en tránsito | TLS 1.2+ obligatorio (HTTPS)                                  |
| RNF-15 | Encriptación en reposo    | AES-256 para datos sensibles (DPI, contraseñas, API keys)    |
| RNF-16 | OWASP Top 10               | Cumplimiento de las 10 vulnerabilidades principales           |
| RNF-17 | Rate limiting              | Máximo 100 requests/min por usuario, 1000/min por IP         |
| RNF-18 | Sanitización de inputs    | Prevención de XSS, SQL Injection, CSRF en todas las entradas |

## 20.5 Usabilidad

| #      | Requerimiento                 | Métrica                                                     |
| :----- | :---------------------------- | :----------------------------------------------------------- |
| RNF-19 | Diseño responsive            | Compatible con resoluciones ≥ 320px (móvil) hasta 4K       |
| RNF-20 | Compatibilidad de navegadores | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+                |
| RNF-21 | Accesibilidad                 | WCAG 2.1 nivel AA (mínimo)                                  |
| RNF-22 | Idioma del sistema            | Español (es-GT) como idioma principal. Preparado para i18n. |

## 20.6 Mantenibilidad

| #      | Requerimiento         | Métrica                                                    |
| :----- | :-------------------- | :---------------------------------------------------------- |
| RNF-23 | Cobertura de tests    | ≥ 70% para lógica de negocio                              |
| RNF-24 | Documentación de API | Swagger/OpenAPI auto-generada                               |
| RNF-25 | Logging estructurado  | Winston con formato JSON, niveles: error, warn, info, debug |
| RNF-26 | Monitoreo de errores  | Sentry con alertas automáticas para errores críticos      |

---

# 21. Reglas de Negocio Consolidadas

| #     | Módulo      | Regla                                                                                                                     | Prioridad |
| :---- | :----------- | :------------------------------------------------------------------------------------------------------------------------ | :-------- |
| RN-01 | Auth         | Un usuario bloqueado no puede hacer login hasta que expire el bloqueo o el Admin lo desbloquee.                           | 🔴 Alta   |
| RN-02 | Auth         | La contraseña debe cambiar cada 90 días. El sistema alerta 7 días antes.                                               | 🟡 Media  |
| RN-03 | Jerarquía   | No pueden existir referencias circulares en el árbol de supervisión.                                                    | 🔴 Alta   |
| RN-04 | Jerarquía   | Un Junior solo puede editar propiedades donde es agente captador.                                                         | 🔴 Alta   |
| RN-05 | Jerarquía   | Un Senior ve y edita todo su downline recursivamente.                                                                     | 🔴 Alta   |
| RN-06 | Propiedades  | El estado `Nuevo` se asigna automáticamente y dura 7 días. Después pasa a `Disponible`.                            | 🟡 Media  |
| RN-07 | Propiedades  | Los campos de precio son condicionales al `tipo_gestion`.                                                               | 🔴 Alta   |
| RN-08 | Propiedades  | Solo se muestran en el portal público propiedades con `publicar_en_portal = true` y estado `Nuevo` o `Disponible`. | 🔴 Alta   |
| RN-09 | Trámites    | Pueden existir múltiples trámites en estado `Interesado` para la misma propiedad.                                     | 🔴 Alta   |
| RN-10 | Trámites    | Al pasar a `Negociación`, la propiedad pasa a `Reservada` y los demás trámites se `Pausan`.                      | 🔴 Alta   |
| RN-11 | Trámites    | Solo un Senior puede presentar oferta competitiva sobre propiedad en Negociación.                                        | 🔴 Alta   |
| RN-12 | Trámites    | Al cancelar un trámite, se requiere motivo obligatorio.                                                                  | 🟡 Media  |
| RN-13 | Trámites    | Al finalizar un trámite, se calcula la comisión automáticamente.                                                       | 🟡 Media  |
| RN-14 | Citas        | No se pueden agendar citas en horarios donde el agente ya tiene otra cita (incluyendo buffer).                            | 🔴 Alta   |
| RN-15 | Citas        | 2 horas después de la cita, se genera tarea obligatoria de reporte.                                                      | 🟡 Media  |
| RN-16 | Auditoría   | Ningún usuario puede modificar o eliminar registros de auditoría.                                                       | 🔴 Alta   |
| RN-17 | Multitenancy | Un usuario solo puede ver datos de su propia empresa.                                                                     | 🔴 Alta   |
| RN-18 | Multitenancy | El aislamiento de datos se refuerza con Row-Level Security en PostgreSQL.                                                 | 🔴 Alta   |
| RN-19 | Inactividad  | Un lead sin interacción en X días (configurable: 7-30, default 14) genera alerta al agente.                             | 🟡 Media  |
| RN-20 | Eliminación | Las propiedades, usuarios y clientes usan soft delete (no se eliminan físicamente).                                      | 🔴 Alta   |

---

# 22. Priorización y Dependencias

## 22.1 Dependencias Críticas entre Épicas

```
                    ┌──────────────┐
                    │  Multitenancy │ ◄─── Fundamento para TODO
                    │  (Sección 2) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌──────────┐
     │  Seguridad │ │ Auditoría│ │ Jerarquía│
     │ (Secc. 3)  │ │ (Secc. 4)│ │ (Secc. 5)│
     └─────┬──────┘ └────┬─────┘ └────┬─────┘
           │              │            │
           └──────────────┼────────────┘
                          ▼
              ┌───────────────────────┐
              │ Propiedades + Clientes│
              │ (Secc. 6-10)          │
              └───────────┬───────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
     ┌────────────┐ ┌──────────┐ ┌──────────────────┐
     │ Interaccions│ │  Citas  │ │  Notificaciones  │
     │ (Secc. 12) │ │(Secc. 13)│ │  (Secc. 17)      │
     └──────┬─────┘ └────┬─────┘ └────────┬─────────┘
            │             │                │
            └─────────────┼────────────────┘
                          ▼
              ┌───────────────────────┐
              │  Marketing + BI +     │
              │  Integraciones        │
              │  (Secc. 14-16)        │
              └───────────────────────┘
```

---

# 23. Checklist de Validación Pre-Desarrollo

- [ ] Confirmar la moneda principal del sistema (GTQ, USD o multi-moneda). R/ es multimoneda
- [ ] Confirmar si el Agente Senior puede ver el upline (actualmente configurable por empresa, default: NO). R/ NO
- [ ] Definir el umbral exacto de inactividad del lead (propuesta: 14 días configurable).  R/ 21 dias configurable
- [ ] Validar la fórmula del precio sugerido con stakeholders de negocio. R/ se podria hacer una busqueda en otros sitios de
- [ ] Confirmar si el sistema requiere un rol `SUPER_ADMIN` por encima del `ADMIN` para gestión de tenants.  R/ Si. esta correcto tener un usuario  por encima del ADMIN
- [ ] Definir si el portal público requiere SEO server-side rendering (SSR) o si un SPA con meta tags dinámicos es suficiente. R/ se requiere SEO server-side rendering (SSR).
- [ ] Confirmar la estrategia de almacenamiento multimedia: ¿S3 de AWS o R2 de Cloudflare?  R/  se usara R2 de Cloudflare
- [ ] Definir los proveedores de mapas: ¿Google Maps o Mapbox? ¿Cuál es el presupuesto de API calls? R/ Se usara un hibrido para el **Frontend (Portal del Cliente):** Usa **Mapbox** para mostrar el carrusel de propiedades y el mapa de búsqueda. Como es la parte pública 			con más tráfico, absorberás el costo en su capa gratuita de 50,000 visitas. y para el **Backend (CRM Agentes):** Usa **Google Maps Geocoding API** solo cuando el agente registra la propiedad, para asegurar que la coordenada Lat/Lng sea perfecta. Ese dato se guarda en tu base de datos y luego Mapbox solo lo dibuja.
- [ ] Confirmar si se requiere WhatsApp Business API (paga) o solo la API de click-to-chat (gratis).  R/ utiliza la api de click-to-chat
- [ ] Definir si los brochures se generan del lado del servidor (PDF server-side) o del cliente (browser-side).  R/ PDF server-side

---

> **Fin del Documento de Requerimientos Consolidado**
>
> **Acciones siguientes:**
>
> 1. Revisión y validación con el Product Owner.
> 2. Resolución de los items del checklist pre-desarrollo (Sección 23).
> 3. Actualización de `Analisis_y_Diseno.md` con los refinamientos aprobados.
> 4. Actualización del `implementacion.md` con las nuevas historias de usuario.
