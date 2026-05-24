# Especificación de Requisitos de Software (SRS)

## Proyecto: GestProp CRM

**Versión:** 1.0
**Fecha:** 15 de mayo de 2026

---

## Historial de Revisiones

| Fecha | Versión | Descripción | Autor |
| :--- | :--- | :--- | :--- |
| 15/05/2026 | 1.0 | Creación inicial de la Especificación de Requisitos (IEEE 830) basada en requerimientos refinados y análisis. | Equipo de Desarrollo |

---

## Índice

1. [Introducción](#1-introducción)
   1.1 [Propósito](#11-propósito)
   1.2 [Alcance](#12-alcance)
   1.3 [Definiciones, acrónimos y abreviaturas](#13-definiciones-acrónimos-y-abreviaturas)
   1.4 [Referencias](#14-referencias)
   1.5 [Visión general](#15-visión-general)
2. [Descripción general](#2-descripción-general)
   2.1 [Perspectiva del producto](#21-perspectiva-del-producto)
   2.2 [Funciones del producto](#22-funciones-del-producto)
   2.3 [Características de los usuarios](#23-características-de-los-usuarios)
   2.4 [Restricciones](#24-restricciones)
   2.5 [Suposiciones y dependencias](#25-suposiciones-y-dependencias)
3. [Requisitos específicos](#3-requisitos-específicos)
   3.1 [Interfaces externas](#31-interfaces-externas)
   3.2 [Requisitos funcionales](#32-requisitos-funcionales)
   3.3 [Requisitos de rendimiento](#33-requisitos-de-rendimiento)
   3.4 [Restricciones de diseño](#34-restricciones-de-diseño)
   3.5 [Atributos de calidad del sistema](#35-atributos-de-calidad-del-sistema)
   3.6 [Otros requisitos](#36-otros-requisitos)
4. [Apéndices](#4-apéndices)

---

## 1. Introducción

### 1.1 Propósito
El propósito de este documento es definir la Especificación de Requisitos de Software (SRS) para el sistema **GestProp CRM**. Este documento servirá como guía y referencia detallada para los desarrolladores, evaluadores de calidad (QA), analistas, y stakeholders involucrados en la construcción, despliegue y mantenimiento del sistema. Detalla los requerimientos funcionales y no funcionales, reglas de negocio y restricciones operativas del sistema.

### 1.2 Alcance
El CRM Inmobiliario es una plataforma diseñada para digitalizar, automatizar y centralizar los procesos de gestión inmobiliaria de la agencia GestProp (con soporte a futuro para arquitectura *multitenant* o multiempresa). El alcance abarca:
- **Gestión Inmobiliaria:** CRUD completo de propiedades y propietarios, con control de multimedia y documentos legales.
- **Relación con Clientes (Embudo de Ventas):** Seguimiento de prospectos (*leads*) en un pipeline tipo Kanban, historial de interacciones y línea de tiempo (timeline).
- **Herramientas de Marketing y Ventas:** Generación dinámica de brochures en PDF, cartas de comisión y publicación integrada en redes sociales (API de Meta).
- **Agenda Inteligente:** Agendamiento de citas para visitas y registro de reportes de visitas.
- **Portal Público:** Plataforma web en donde clientes pueden explorar inventario y registrar preferencias.
- **Automatización y Notificaciones:** Correos transaccionales automatizados, notificaciones push/in-app y asignación inteligente.

Fuera de alcance queda el desarrollo de sistemas contables o ERPs fiscales complejos integrados directamente.

### 1.3 Definiciones, acrónimos y abreviaturas
*   **CRM (Customer Relationship Management):** Sistema de gestión de las relaciones con clientes.
*   **2FA (Two-Factor Authentication):** Sistema de autenticación en dos pasos.
*   **RBAC (Role-Based Access Control):** Control de acceso estructurado a través de roles definidos.
*   **Tenant:** Instancia aislada o entidad "Empresa" dentro de un modelo multiempresa.
*   **Upline / Downline:** Jerarquía ascendente (supervisores) y descendente (subordinados) del personal de ventas.
*   **Brochure:** Documento o folleto comercial generado dinámicamente con la información de la propiedad.
*   **Lead:** Prospecto interesado.

### 1.4 Referencias
*   `Analisis_y_Diseno.md` (Documento de Arquitectura, UML y Factibilidad).
*   `ReqRefinado.md` (Documento de refinamiento de las épicas e historias de usuario).
*   `Requerimientos.md` (Documentación base inicial de expectativas del sistema).

### 1.5 Visión general
El documento se estructura siguiendo el estándar IEEE 830. La sección 2 ofrece una perspectiva general del CRM, sus usuarios y restricciones. La sección 3 detalla exhaustivamente las especificaciones funcionales y no funcionales, modelado de datos y arquitectónico necesarios para el desarrollo de la aplicación.

---

## 2. Descripción general

### 2.1 Perspectiva del producto
El CRM Inmobiliario será una aplicación web tipo SPA (Single Page Application) construida modularmente para su integración con bases de datos relacionales robustas (PostgreSQL) y servicios en la nube (AWS/S3/Cloudflare), así como integraciones de terceros (Meta, Google Maps/Mapbox, DocuSign, SendGrid). El software está diseñado tanto para el uso interno de la organización (Agentes y Administradores) como para el acceso de clientes externos (a través del portal público).

### 2.2 Funciones del producto
1. **Administración Multiempresa y Seguridad:** Aislamiento de datos (Tenant RLS), autenticación 2FA, RBAC, auditoría inmutable, y recuperación de cuenta.
2. **Catálogo y Expediente:** Registro de propiedades, gestión de dueños, control de documentación legal y gestión de estados (Nuevo, Disponible, Reservado, Vendido/Rentado, Cancelado, Inactivo).
3. **Motor de Embudo de Ventas:** Kanban de negociación de trámites (Interesado, Negociación, Cierre), validación de concurrencia de ofertas, cálculo automático de comisiones.
4. **Agendamiento:** Sincronización de calendario y alertas automáticas post-visita.
5. **Comunicación Multicanal:** Generación de PDFs para WhatsApp/Email, sincronización de redes sociales.
6. **Portal Cliente Público:** Buscador de inmuebles con filtros avanzados, creación de cuenta y preferencias.
7. **Inteligencia de Negocios (BI):** Dashboards gerenciales de rendimiento y alertas de propiedades estancadas.

### 2.3 Características de los usuarios
| Actor | Nivel de Habilidad Técnica | Privilegios y Funciones |
| :--- | :--- | :--- |
| **Administrador** | Alto | Acceso completo. Configura tenants, roles, reglas, visualiza métricas y la auditoría completa del sistema. |
| **Agente Senior** | Medio | Gestiona trámites y propiedades. Supervisa a un equipo inferior (*downline*). Registra ofertas competitivas. |
| **Agente Junior** | Básico - Medio | Gestiona únicamente su propio portafolio y los clientes a su cargo. Sin subordinados. |
| **Cliente** | Básico | Usuario final que busca propiedades en el portal público, marca favoritos y hace seguimiento de su interés. |

### 2.4 Restricciones
*   **Regulaciones Locales / Privacidad:** Manejo estricto de documentos confidenciales (DPI, NIT). Implementación de tracking respetuoso con las normativas (RGPD u homólogas si aplican).
*   **Limitaciones de Hardware/Plataforma:** Los archivos multimedia tienen límite duro (imágenes máx. 10MB; videos máx. 200MB). Limite de 500 registros por importación masiva.
*   **Dependencia de APIs Externas:** Sujeto a cuotas, políticas y Rate Limits impuestos por Meta (Graph API), Mapbox y servicios de Email transaccional.

### 2.5 Suposiciones y dependencias
*   Los agentes contarán con dispositivos móviles inteligentes para usar el autenticador (Google Authenticator) y acceder a la plataforma.
*   La integración continua y el entorno de la nube proveen los SLAs definidos (99.5% uptime).

---

## 3. Requisitos específicos

### 3.1 Interfaces externas
1.  **Interfaces de Usuario (UI):** Interfaces modernas construidas en React 18+ garantizando accesibilidad (WCAG 2.1 AA) y responsividad (móvil y escritorio de 4K).
2.  **Interfaces de Hardware:** Uso de GPS/Geolocalización a través de la API de navegador/móvil. Uso de cámara para subida inmediata de fotografías y escaneo de QR (2FA).
3.  **Interfaces de Software:**
    *   Integración con **SendGrid / SMTP** para envíos transaccionales.
    *   Integración con **Meta Graph API** para publicar en Facebook / Instagram.
    *   Integración con **AWS S3 / Cloudflare R2** para carga y entrega de recursos multimedia estáticos (imágenes y PDFs).
    *   Integración con **Google Maps API / Mapbox** para mapas interactivos y Points of Interest.
4.  **Interfaces de Comunicación:** Uso de WebSockets para notificaciones In-App y eventos en tiempo real. RESTful APIs para la comunicación frontend/backend.

### 3.2 Requisitos funcionales

#### 3.2.1 Módulo de Seguridad y Autenticación (Auth)
*   **RF-1.1:** El sistema validará identidad con email, contraseña y obligatorio 2FA vía TOTP.
*   **RF-1.2:** Bloqueos automáticos temporales de cuenta ante intentos fallidos consecutivos (15 min a 3 fallos, 1h a 6, Admin a 9).
*   **RF-1.3:** Control de sesiones concurrentes (máx 2 simultáneas), expiración por inactividad (30 min) y política de cambio de contraseña obligatoria cada 90 días.
*   **RF-1.4:** Acceso controlado estrictamente por roles jerárquicos (RBAC).

#### 3.2.2 Módulo de Auditoría
*   **RF-2.1:** Registro inmutable de cada acción (CREATE, READ, UPDATE, DELETE). Incluyendo IP, `tenant_id`, payload de cambio (json diff) y usuario responsable.

#### 3.2.3 Módulo de Gestión de Propiedades y Propietarios
*   **RF-3.1:** CRUD de propietarios de bienes raíces.
*   **RF-3.2:** Alta de propiedades con información estructurada (Casa, Departamento, Venta, Renta) e integración de galería de imágenes con drag & drop.
*   **RF-3.3:** La propiedad cambia automáticamente de "Nuevo" a "Disponible" a los 7 días.
*   **RF-3.4:** Generación programática de *Brochure* PDF en base a plantillas de marca configurables (logo y colores), incluyendo métricas de tracking.

#### 3.2.4 Motor de Embudo de Ventas (Máquina de Estados)
*   **RF-4.1:** Los clientes inician estado "Interesado".
*   **RF-4.2:** Cuando un cliente realiza oferta, su estado pasa a "Negociación" y el de la propiedad a "Reservada", pausando todos los demás interesados automáticamente.
*   **RF-4.3:** Sólo un Agente Senior puede introducir una "Oferta Competitiva" concurrente si ya existe una negociación.

#### 3.2.5 Módulo de Tareas, Citas y Notificaciones
*   **RF-5.1:** Centro unificado de notificaciones con opciones para alertas In-app, Correo, o Push.
*   **RF-5.2:** Agendamiento de citas previniendo conflictos en el horario laboral del agente y generando invitaciones .ics.
*   **RF-5.3:** Creación obligatoria de formulario de reporte de visita 2 horas después del cierre de la cita.
*   **RF-5.4:** Timeline cronológica de cada interacción (notas, emails, mensajes) adjunta a cada trámite.

#### 3.2.6 Portal Cliente Público
*   **RF-6.1:** Búsqueda abierta del catálogo de inmuebles en estado 'Nuevo' o 'Disponible' con filtros avanzados y visualización tipo mapa o grilla.
*   **RF-6.2:** Registro de clientes y almacenamiento persistente de preferencias de búsqueda en su perfil.

### 3.3 Requisitos de rendimiento
*   **Tiempos de respuesta:** Las transacciones API CRUD no superarán los 500 ms en percentil 95 (P95).
*   **Carga de portal:** First Contentful Paint inferior a 3 segundos (LCP < 2s).
*   **Generación de PDF:** El renderizado backend para Brochure/Carta de comisión no excederá los 10 segundos.
*   **Soporte de concurrencia:** El sistema soportará por `tenant` un mínimo de 50 usuarios internos activos recurrentes y miles de visitas en el portal público vía CDN.

### 3.4 Restricciones de diseño
*   Arquitectura regida por esquema Multitenancy mediante `tenant_id` obligatorio y PostgreSQL Row-Level Security.
*   Implementación de colas asíncronas de trabajo (ej. BullMQ/Redis) para el manejo de envío masivo de notificaciones, correos y reportes PDF pesados para no bloquear el Event Loop.

### 3.5 Atributos de calidad del sistema
*   **Escalabilidad:** Separación modular en microservicios/APIs (Auth, Properties, Clients). Escalabilidad horizontal en base de datos e infraestructura en la nube contenerizada.
*   **Confiabilidad:** Retención y copias de seguridad cada 24h, RPO de 24 horas y RTO de 4 horas para recuperación de desastres.
*   **Seguridad:** Encriptación en tránsito con TLS 1.2+ constante y AES-256 en reposo (DPI, Secretos).
*   **Mantenibilidad:** Logging estructurado centralizado (Winston+JSON) para auditorías eficaces, Sentry para tracking de errores, diseño de código con un mínimo de 70% de test coverage para lógica core.

### 3.6 Otros requisitos
*   **Soporte de Localización (i18n):** Base orientada a español (Guatemala) preparada estructuralmente para múltiples monedas y zonas horarias, configurables por Tenant.
*   **Importación Masiva:** Sistema deberá poder procesar y parsear planillas de Excel (.xlsx / .csv) validando la integridad de hasta 500 registros por archivo.

---

## 4. Apéndices

### 4.1 Máquina de estados - Entidad: Propiedad
*   `Nuevo` -> Pasa automáticamente a Disponible a los 7 días (o a Cancelado/Reservado).
*   `Disponible` -> Entra en trámite formal, pasa a Reservado.
*   `Reservado` -> Pasa a Vendido o Rentado si el trámite se cierra. Regresa a Disponible si fracasa la negociación.
*   `Vendido / Rentado` -> Estado de fin de éxito de ciclo de vida.
*   `Cancelado / Inactivo` -> Propiedad retirada.

### 4.2 Matriz RACI / Permisos (Extracto)
*   Agente Junior: Visualiza Upline (Lectura), Edita su inventario exclusivo.
*   Agente Senior: Edita su inventario y el inventario de su Downline.
*   Administrador: Acceso a CRUD completo y a la información de la empresa (Tenant) completa.

---
*Fin de la Especificación de Requisitos*
