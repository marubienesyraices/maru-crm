# GestPro CRM Inmobiliario — Módulos del Sistema

> **Versión:** 1.0  
> **Fecha:** 13 de mayo de 2026  
> **Sistema:** GestPro CRM Inmobiliario  
> **Arquitectura:** Monorepo (NestJS + React + Next.js + React Native)

---

## Módulos Principales

1. Autenticación y Seguridad
2. Multitenancy y Control de Acceso (RBAC)
3. Auditoría
4. Gestión de Propiedades
5. Propietarios y Expediente Legal
6. Portal Público
7. Gestión de Clientes
8. Embudo de Ventas (Pipeline)
9. Interacciones y Comunicaciones
10. Agenda y Visitas
11. Marketing y Redes Sociales
12. Business Intelligence y Reportes
13. Notificaciones
14. Integraciones Externas
15. App Móvil
16. Herramientas Transversales

---

## Stakeholders

| # | Stakeholder | Rol en el sistema |
|:--|:------------|:------------------|
| 1 | **Super Admin** | Operador de la plataforma SaaS; administra tenants y configuración global |
| 2 | **Gerente de Agencia** | Admin del tenant; gestiona agentes, reportes y configuración de la empresa |
| 3 | **Agente Senior** | Gestiona propiedades, clientes y pipeline; supervisa agentes junior |
| 4 | **Agente Junior** | Opera propiedades y clientes bajo supervisión; visibilidad limitada |
| 5 | **Cliente** | Usuario del portal público; busca propiedades y agenda visitas |
| 6 | **Equipo de Desarrollo** | Construye, mantiene y despliega el sistema |
| 7 | **Dueño de Empresa PYME** | Propietario de la agencia inmobiliaria; define requerimientos de negocio y aprueba entregables |
| 8 | **QA / Tester** | Valida la calidad funcional y de seguridad de cada módulo |

---

## Matriz RACI

**R** = Responsible · **A** = Accountable · **C** = Consulted · **I** = Informed

| Tarea | Super Admin | Gerente | Ag. Senior | Ag. Junior | Cliente | Dueño PYME | Dev | QA |
|:------|:-----------:|:-------:|:----------:|:----------:|:-------:|:----------:|:---:|:--:|
| Análisis de Requisitos | C | C | C | I | C | A | R | I |
| Diseño del Sistema | I | C | I | — | — | C | A | C |
| Desarrollo de Software | I | I | — | — | — | I | A | C |
| Pruebas del Sistema | I | I | I | — | — | I | R | A |
| Documentación Técnica | I | I | — | — | — | I | A | C |
| Validación de Usuario | I | C | R | R | R | A | C | C |
| Presentación Final | C | C | I | — | — | A | R | I |
| Implementación | A | C | I | — | — | C | R | C |
| Capacitación de Usuario | I | A | R | R | C | C | C | I |
| Soporte Post-Entrega | A | C | I | I | I | C | R | C |
| Control de Calidad | I | I | I | — | — | C | C | A |
| Evaluación Final | C | C | C | I | C | A | R | C |

---

## b. Mapa de Poder-Interés

Clasifica a los stakeholders según su nivel de **poder** (capacidad de influir en el proyecto) e **interés** (grado de afectación por el resultado).

```
PODER
  Alto │ Gerente de Agencia   │ Dueño de Empresa PYME
       │ Super Admin          │
       │─────────────────────────────────────────────
  Bajo │ Agente Junior        │ Agente Senior
       │ QA / Tester          │ Cliente
       │ Equipo de Desarrollo │
       └──────────────────────┴──────────────────────
              Interés Bajo         Interés Alto
```

| Stakeholder | Poder | Interés | Cuadrante | Estrategia |
|:------------|:-----:|:-------:|:----------|:-----------|
| Dueño de Empresa PYME | Alto | Alto | **Gestionar de cerca** | Involucrar en decisiones clave, validaciones y aprobaciones de entregables |
| Gerente de Agencia | Alto | Alto | **Gestionar de cerca** | Reuniones frecuentes, reportes de avance, validación de requisitos funcionales |
| Super Admin | Alto | Bajo | **Mantener satisfecho** | Informar sobre cambios de infraestructura y seguridad; no saturar con detalles |
| Agente Senior | Bajo | Alto | **Mantener informado** | Consultar en validaciones de usuario; incluir en pruebas de aceptación |
| Cliente | Bajo | Alto | **Mantener informado** | Recoger feedback sobre portal público y flujo de visitas; encuestas de satisfacción |
| Equipo de Desarrollo | Bajo | Bajo | **Monitorear** | Comunicar cambios de alcance; asegurar claridad en requerimientos técnicos |
| Agente Junior | Bajo | Bajo | **Monitorear** | Informar sobre cambios en su flujo de trabajo; capacitar en nuevas funcionalidades |
| QA / Tester | Bajo | Bajo | **Monitorear** | Proveer criterios de aceptación claros; revisar resultados de pruebas |

---

## Casos de Uso

| No. | Nombre del Caso de Uso |
|:----|:-----------------------|
| HU-01.01 | Gestión de Empresas (Tenants) |
| HU-02.01 | Autenticación con 2FA y Bloqueo Progresivo |
| HU-02.02 | Recuperación de Cuenta |
| HU-02.03 | Onboarding de Primer Acceso |
| HU-03.01 | Auditoría Inmutable de Acciones |
| HU-04.01 | Jerarquía Organizacional y RBAC |
| HU-05.01 | CRUD de Propiedades y Ciclo de Vida |
| HU-05.02 | Carga de Multimedia y Geolocalización |
| HU-05.03 | Gestión de Propietarios y Expediente Legal |
| HU-05.04 | Generación y Distribución de Brochure PDF |
| HU-06.01 | Portal Público con Búsqueda Avanzada |
| HU-06.02 | Registro de Cliente y Alertas de Matching |
| HU-07.01 | Inicio de Trámite y Vista Kanban |
| HU-07.02 | Máquina de Estados del Embudo de Ventas |
| HU-08.01 | Timeline de Interacciones con Clientes |
| HU-08.02 | Tareas Automáticas y Tracking de Email |
| HU-09.01 | Agendamiento de Visitas con Invitación .ics |
| HU-09.02 | Reprogramación y Reporte Post-Visita |
| HU-10.01 | Publicación Automática en Redes Sociales |
| HU-10.02 | Campañas de Email con Plantillas |
| HU-10.03 | Chatbot de Captación de Leads |
| HU-11.01 | Dashboard de Métricas de Propiedades |
| HU-11.02 | Reportes de Desempeño de Agentes |
| HU-11.03 | Ranking Gamificado de Agentes |
| HU-12.01 | Sindicación a Portales Externos |
| HU-12.02 | Firma Digital y Videollamadas |
| HU-12.03 | App Móvil con Push Notifications |
| HU-13.01 | Centro de Notificaciones In-App |
| HU-13.02 | Búsqueda Global Federada (Ctrl+K) |
| HU-13.03 | Importación Masiva de Datos (Excel/CSV) |

---

## Estilo Arquitectónico

### Estilo elegido: Arquitectura Modular en Capas (Layered Modular Architecture)

El sistema adopta una **arquitectura modular en capas** implementada sobre NestJS, con elementos tomados de **Clean Architecture** y patrones de **arquitectura orientada a eventos** para los flujos asincrónos.

### Capas del sistema

| Capa | Responsabilidad | Implementación |
|:-----|:----------------|:---------------|
| **Presentación** | Interfaz de usuario, renderizado y estado cliente | React + Vite (CRM Web), Next.js 14 SSR (Portal), React Native (App) |
| **API / Controladores** | Enrutamiento HTTP, validación de entrada, autenticación | NestJS Controllers + Guards + Interceptors |
| **Lógica de Negocio** | Reglas de dominio, máquinas de estado, cálculos | NestJS Services (PipelineService, PropiedadesService, etc.) |
| **Infraestructura** | Persistencia, caché, almacenamiento, emails | PrismaService, RedisService, StorageService, EmailService |
| **Dominio compartido** | Tipos, enums e interfaces comunes | Paquete `@gestpro/shared` (TypeScript puro) |

### Patrones arquitectónicos aplicados

| Patrón | Uso concreto en el sistema |
|:-------|:--------------------------|
| **Módulos NestJS** | Cada dominio de negocio es un módulo autocontenido con su propio Controller, Service y DTOs |
| **Multitenancy con RLS** | Aislamiento de datos a nivel de base de datos mediante PostgreSQL Row-Level Security; `TenantMiddleware` inyecta el `tenant_id` en cada request |
| **RBAC jerárquico** | `RolesGuard` + `VisibilityGuard` controlan acceso y visibilidad según la jerarquía SUPER_ADMIN → ADMIN → SENIOR → JUNIOR |
| **Máquinas de estado** | `TRANSICIONES_VALIDAS` en PipelineService y PropiedadesService garantizan transiciones de estado válidas a nivel de código |
| **Procesamiento asíncrono (Event-Driven)** | BullMQ + Redis desacopla operaciones lentas (generación de PDFs, publicaciones en redes) del ciclo request-response |
| **CQRS ligero** | Separación implícita entre operaciones de lectura (consultas Prisma con vistas materializadas para BI) y escritura (transacciones atómicas con `$transaction`) |
| **Auditoría inmutable** | `AuditInterceptor` registra automáticamente todas las mutaciones; el rol de BD `gestpro_app` tiene revocado UPDATE/DELETE sobre `audit_logs` |
| **ISR (Incremental Static Regeneration)** | El portal Next.js revalida el catálogo cada 60 s y el detalle cada 120 s, combinando rendimiento estático con datos frescos |

### Justificación de la elección

**¿Por qué no microservicios?**
El equipo es pequeño (agencia PYME) y el sistema no tiene dominios con cargas independientes que justifiquen la complejidad operacional de microservicios (deploys separados, service mesh, comunicación inter-servicio). Un monorepo modular ofrece la misma separación de responsabilidades con menor overhead.

**¿Por qué no Hexagonal / Ports & Adapters puro?**
NestJS ya impone una estructura de inyección de dependencias que logra el mismo desacoplamiento de forma más pragmática. Introducir puertos y adaptadores explícitos añadiría capas de abstracción sin beneficio real para el tamaño del proyecto.

**¿Por qué esta arquitectura?**
- **Escalabilidad incremental:** los módulos NestJS pueden extraerse como microservicios en el futuro si el negocio crece.
- **Seguridad por diseño:** RLS a nivel de BD garantiza aislamiento de datos incluso ante errores en capa de aplicación.
- **Desacoplamiento selectivo:** solo los procesos lentos (brochures, posts sociales) se desacoplan vía BullMQ; el resto permanece síncrono para simplicidad.
- **Mantenibilidad:** la separación en módulos por dominio permite que distintos desarrolladores trabajen en paralelo sin conflictos.

---

## 2.2 Stack Tecnológico Seleccionado

### Frontend — CRM Web

| Tecnología | Versión | Licencia | Rol |
|:-----------|:-------:|:--------:|:----|
| React | 19.2.5 | MIT | Librería de UI |
| Vite | 8.0.9 | MIT | Bundler y dev server |
| TypeScript | 6.0.2 | Apache-2.0 | Tipado estático |
| TanStack Query | 5.99.2 | MIT | Server-state y caché de datos |
| Zustand | 5.0.12 | MIT | Estado global del cliente |
| React Router DOM | 7.14.2 | MIT | Enrutamiento SPA |
| Mapbox GL JS | 3.23.0 | Mapbox ToS | Mapas y geolocalización |
| dnd-kit | 6.3.1 | MIT | Drag-and-drop (Kanban) |

### Frontend — Portal Público (SSR)

| Tecnología | Versión | Licencia | Rol |
|:-----------|:-------:|:--------:|:----|
| Next.js | 14.2.29 | MIT | Framework SSR/ISR |
| React | 18.x | MIT | Librería de UI |
| TypeScript | 5.x | Apache-2.0 | Tipado estático |

### Mobile

| Tecnología | Versión | Licencia | Rol |
|:-----------|:-------:|:--------:|:----|
| React Native | 0.81.5 | MIT | Framework móvil cross-platform |
| Expo | 54.0.0 | MIT | Toolchain y SDK nativo |
| Expo Router | 6.0.23 | MIT | Enrutamiento basado en archivos |
| Expo Notifications | 0.32.17 | MIT | Push notifications |
| Zustand | 5.0.0 | MIT | Estado global |

### Backend

| Tecnología | Versión | Licencia | Rol |
|:-----------|:-------:|:--------:|:----|
| NestJS | 11.0.1 | MIT | Framework backend (DI, módulos, guards) |
| TypeScript | 5.x | Apache-2.0 | Tipado estático |
| Prisma ORM | 7.8.0 | Apache-2.0 | ORM y migraciones |
| BullMQ | 5.76.5 | MIT | Colas de trabajo asíncronas |
| Passport JWT | 4.0.1 | MIT | Autenticación JWT |
| bcrypt | 6.0.0 | MIT | Hash de contraseñas |
| otplib | 13.4.0 | MIT | TOTP (2FA) |
| PDFKit | 0.18.0 | MIT | Generación de brochures PDF |
| sharp | 0.34.5 | Apache-2.0 | Procesamiento y compresión de imágenes |
| Resend | 6.12.2 | MIT | Envío transaccional de emails |
| AWS SDK S3 | 3.1040.0 | Apache-2.0 | Cliente para Cloudflare R2 |

### Base de Datos e Infraestructura de Datos

| Tecnología | Versión | Licencia | Rol |
|:-----------|:-------:|:--------:|:----|
| PostgreSQL | 16 | PostgreSQL License | Base de datos principal con RLS |
| Redis | 7 | BSD-3-Clause | Caché BI + colas BullMQ |
| Cloudflare R2 | — | Propietario (free tier) | Almacenamiento de objetos (imágenes, PDFs) |

### Cloud / Infrastructure-as-Code

| Tecnología | Versión | Licencia | Rol |
|:-----------|:-------:|:--------:|:----|
| Docker | 26.x | Apache-2.0 | Contenedores para todos los servicios |
| Docker Compose | 2.x | Apache-2.0 | Orquestación local y producción en VPS |
| Nginx | 1.27.x | BSD-2-Clause | Reverse proxy, SSL termination, SPA fallback |
| Cloudflare (CDN + WAF) | — | Propietario (free tier) | DDoS, caché de activos estáticos, DNS |

---

### Justificación técnica y tabla de trade-offs

#### Backend: NestJS vs. alternativas

| Criterio | NestJS ✅ | Express puro | Fastify | Hapi |
|:---------|:---------:|:------------:|:-------:|:----:|
| Estructura modular out-of-the-box | ✅ | ❌ | Parcial | Parcial |
| Inyección de dependencias nativa | ✅ | ❌ | ❌ | ✅ |
| Soporte TypeScript first-class | ✅ | Parcial | Parcial | Parcial |
| Decoradores para guards/interceptors | ✅ | ❌ | ❌ | ❌ |
| Ecosistema (Swagger, BullMQ, Passport) | ✅ | Manual | Manual | Limitado |
| Curva de aprendizaje | Media | Baja | Baja | Alta |

**Decisión:** NestJS impone una arquitectura que facilita el mantenimiento a largo plazo, reduce la deuda técnica en equipos pequeños y tiene integración nativa con todos los módulos utilizados (BullMQ, JWT, Swagger, Prisma).

#### Frontend CRM: React SPA vs. alternativas

| Criterio | React + Vite ✅ | Angular | Vue 3 | SvelteKit |
|:---------|:--------------:|:-------:|:-----:|:---------:|
| Ecosistema y comunidad | ✅ Enorme | ✅ Grande | ✅ Grande | ❌ Menor |
| Rendimiento dev server | ✅ Vite HMR | ❌ Lento | ✅ | ✅ |
| Curva de aprendizaje | Media | Alta | Baja | Baja |
| Librerías UI disponibles | ✅ Amplio | ✅ | ✅ | Limitado |
| SEO (SPA) | ❌ No aplica (CRM interno) | — | — | ✅ |

**Decisión:** El CRM es una aplicación interna de gestión; SEO no es relevante. React + Vite ofrece el mejor equilibrio entre velocidad de desarrollo y ecosistema disponible.

#### Portal Público: Next.js vs. alternativas

| Criterio | Next.js 14 SSR ✅ | Gatsby | Remix | Astro |
|:---------|:----------------:|:------:|:-----:|:-----:|
| SSR + ISR nativo | ✅ | ❌ | ✅ | Parcial |
| App Router (RSC) | ✅ | ❌ | ❌ | ❌ |
| SEO out-of-the-box | ✅ | ✅ | ✅ | ✅ |
| Reutilizar componentes React | ✅ | ✅ | ✅ | Parcial |
| Ecosistema y soporte Vercel | ✅ | Parcial | Parcial | Parcial |

**Decisión:** El portal es público y debe indexar bien en buscadores. Next.js 14 con ISR permite catálogos de propiedades actualizados sin rebuild completo.

#### Base de datos: PostgreSQL vs. alternativas

| Criterio | PostgreSQL 16 ✅ | MySQL 8 | MongoDB | Supabase |
|:---------|:---------------:|:-------:|:-------:|:--------:|
| Row-Level Security nativa | ✅ | ❌ | ❌ | ✅ (usa PG) |
| Transacciones ACID | ✅ | ✅ | Parcial | ✅ |
| PostGIS (geolocalización) | ✅ | ❌ | ❌ | ✅ |
| Soporte JSON + relacional | ✅ | Parcial | ✅ | ✅ |
| Open Source / sin vendor lock-in | ✅ | ✅ | ✅ | Parcial |

**Decisión:** El multitenancy por RLS es un requisito de seguridad central; solo PostgreSQL lo ofrece nativamente de forma robusta. PostGIS cubre además las búsquedas geográficas de propiedades.

---

## 2.3 Cronograma de Implementación

**Duración total:** 30 semanas · 15 sprints × 2 semanas · **Metodología:** Scrum · **Total:** 227 SP

| Fase / Actividad | HUs | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 | S13 | S14 | S15 |
|:-----------------|:----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:---:|:---:|:---:|:---:|:---:|
| **F1 — Infraestructura y Seguridad** | **57 SP** | | | | | | | | | | | | | | | |
| Scaffolding · BD · Multitenancy · RLS | HU-01.01 | ▓ | | | | | | | | | | | | | | |
| Autenticación · 2FA · Bloqueo progresivo | HU-02.01 | ▓ | | | | | | | | | | | | | | |
| Recuperación de cuenta · Onboarding | HU-02.02 · HU-02.03 | | ▓ | | | | | | | | | | | | | |
| Auditoría inmutable · RBAC · Jerarquía | HU-03.01 · HU-04.01 | | ▓ | | | | | | | | | | | | | |
| **F2 — Propiedades, Clientes y Portal** | **52 SP** | | | | | | | | | | | | | | | |
| CRUD Propiedades · Multimedia · Mapas | HU-05.01 · HU-05.02 | | | ▓ | | | | | | | | | | | | |
| Propietarios · Expediente legal · Brochure PDF | HU-05.03 · HU-05.04 | | | | ▓ | | | | | | | | | | | |
| Portal SSR · Clientes · Notificaciones in-app | HU-06.01 · HU-06.02 · HU-13.01 | | | | | ▓ | | | | | | | | | | |
| **F3 — Embudo, Interacciones y Agenda** | **57 SP** | | | | | | | | | | | | | | | |
| Embudo de ventas · Vista Kanban · Comisiones | HU-07.01 · HU-07.02 | | | | | | ▓ | | | | | | | | | |
| Interacciones · Tracking email · Búsqueda global | HU-08.01 · HU-08.02 · HU-13.02 | | | | | | | ▓ | | | | | | | | |
| Agenda · Visitas · Importación masiva CSV | HU-09.01 · HU-09.02 · HU-13.03 | | | | | | | | ▓ | | | | | | | |
| **F4 — Marketing, BI y Automatización** | **40 SP** | | | | | | | | | | | | | | | |
| Redes sociales · Chatbot captación de leads | HU-10.01 · HU-10.02 · HU-10.03 | | | | | | | | | ▓ | | | | | | |
| Dashboards BI · Reportes exportables · Ranking | HU-11.01 · HU-11.02 · HU-11.03 | | | | | | | | | | ▓ | | | | | |
| Optimización · UX · Accesibilidad · Docs API | — | | | | | | | | | | | ▓ | | | | |
| **F5 — Integraciones, App Móvil y Go-Live** | **21+ SP** | | | | | | | | | | | | | | | |
| Sindicación portales · Firma digital · Zoom | HU-12.01 · HU-12.02 | | | | | | | | | | | | ▓ | | | |
| App Móvil (React Native · Expo) · Push | HU-12.03 | | | | | | | | | | | | | ▓ | | |
| QA integral · Pentest · Pruebas de carga · UAT | — | | | | | | | | | | | | | | ▓ | |
| Migración de datos · Deploy prod · Capacitación | — | | | | | | | | | | | | | | | ▓ |
| **CI/CD · Tests · Monitoreo (continuo)** | — | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ |

`▓` = sprint activo (2 semanas) &nbsp;&nbsp;·&nbsp;&nbsp; Cada sprint S*n* = 2 semanas &nbsp;&nbsp;·&nbsp;&nbsp; `—` = tarea transversal sin HU asignada

---

## 2.4 Hardware Mínimo y Recomendado

Los valores se derivan de los contenedores definidos en `docker-compose.prod.yml` (PostgreSQL 16, Redis 7 con límite 256 MB, API NestJS, Nginx) y del comportamiento observado en pruebas de carga con el stack completo.

---

### Requerimientos Mínimos

> **Perfil:** 1 tenant · 1–5 agentes · hasta 100 propiedades · tráfico bajo.

| Recurso | Especificación mínima |
|:--------|:----------------------|
| CPU | 2 vCPU (x86-64 o ARM64) |
| RAM | 4 GB |
| Disco | 40 GB SSD |
| Ancho de banda | 100 Mbps |
| Sistema operativo | Ubuntu 22.04 LTS o Debian 12 |
| Docker Engine | 26+ |
| Docker Compose | v2 |
| PostgreSQL | 16 (contenedor Alpine) |
| Redis | 7 (contenedor Alpine, `maxmemory 256mb`) |
| Node.js (API) | 20 LTS |

> ⚠️ Con 4 GB de RAM se recomienda habilitar **2 GB de swap** como colchón ante picos de generación de PDFs y brochures.

---

### Requerimientos Recomendados

> **Perfil:** 2–5 tenants · 5–25 agentes por tenant · hasta 500 propiedades · tráfico moderado.

| Recurso | Especificación recomendada |
|:--------|:---------------------------|
| CPU | 4 vCPU (x86-64) |
| RAM | 8 GB |
| Disco OS | 40 GB SSD (sistema + Docker) |
| Disco datos | 100 GB SSD NVMe (volúmenes `pgdata` + `uploads` en disco separado) |
| Ancho de banda | 500 Mbps |
| Sistema operativo | Ubuntu 22.04 LTS |
| Docker Engine | 26+ |
| Docker Compose | v2 |
| PostgreSQL | 16 — `shared_buffers` 2 GB |
| Redis | 7 — `maxmemory 512mb` |
| Node.js (API) | 20 LTS |
| Backups | Snapshot diario; retención mínima 30 días |
| Monitoreo | Sentry DSN + Uptime check (recomendado UptimeRobot) |

> ✅ Con 8 GB de RAM el sistema opera cómodamente. PostgreSQL puede aprovechar 2 GB de `shared_buffers` y Redis su límite sin presión de memoria sobre los workers de BullMQ.

---

### Costos estimados en Google Cloud

Precios de referencia región **us-central1** (Iowa). Los precios en otras regiones varían ±15 %.

#### Escenario Mínimo (equivalente a 2 vCPU / 4 GB RAM)

| Servicio GCP | Producto | Specs | Costo aprox./mes |
|:-------------|:---------|:------|:----------------:|
| Compute Engine | e2-medium | 2 vCPU / 4 GB RAM | ~$27 |
| Persistent Disk | SSD Boot | 40 GB | ~$7 |
| Cloud SQL for PostgreSQL | db-f1-micro | 1 vCPU / 0.6 GB (desarrollo) | ~$10 |
| Memorystore for Redis | Basic 1 GB | Instancia regional | ~$35 |
| Cloud Storage | Standard | 50 GB (uploads + backups) | ~$1 |
| Cloud CDN + Networking | Egress 10 GB/mes | — | ~$1 |
| **Total estimado mínimo** | | | **~$81/mes** |

> 💡 El costo de Memorystore eleva el total; como alternativa económica usar **Upstash Redis** (~$0–5/mes) con la API en GCP, reduciendo el total a ~$46/mes.

#### Escenario Recomendado (equivalente a 4 vCPU / 8 GB RAM)

| Servicio GCP | Producto | Specs | Costo aprox./mes |
|:-------------|:---------|:------|:----------------:|
| Compute Engine | e2-standard-2 | 2 vCPU / 8 GB RAM | ~$49 |
| Persistent Disk | SSD Boot | 40 GB | ~$7 |
| Persistent Disk | SSD Datos | 100 GB (volumen separado) | ~$17 |
| Cloud SQL for PostgreSQL | db-g1-small | 1 vCPU / 1.7 GB | ~$26 |
| Memorystore for Redis | Basic 1 GB | Instancia regional | ~$35 |
| Cloud Storage | Standard | 100 GB (uploads + backups) | ~$2 |
| Cloud Armor (WAF básico) | Pay-as-you-go | — | ~$5 |
| Cloud CDN + Networking | Egress 30 GB/mes | — | ~$3 |
| **Total estimado recomendado** | | | **~$144/mes** |

#### Escenario Cloud Nativo (servicios administrados GCP — máxima disponibilidad)

| Servicio GCP | Producto | Specs | Costo aprox./mes |
|:-------------|:---------|:------|:----------------:|
| Cloud Run | API NestJS | 2 vCPU / 4 GB, auto-scale | ~$30–60 |
| Cloud SQL for PostgreSQL | db-n1-standard-2 | 2 vCPU / 7.5 GB, HA | ~$150 |
| Memorystore for Redis | Standard 5 GB | Alta disponibilidad | ~$175 |
| Firebase Hosting | CRM + Portal | CDN global, SSL automático | ~$0–25 |
| Cloud Storage | Standard | 200 GB | ~$4 |
| Cloud Armor | Standard | DDoS + WAF | ~$15 |
| Cloud Monitoring | Workspace | Logs + Alertas | ~$10 |
| **Total estimado cloud nativo** | | | **~$384–439/mes** |

---

### Comparativa rápida de opciones

| Opción | CPU / RAM | Costo/mes aprox. | Mejor para |
|:-------|:---------:|:----------------:|:-----------|
| VPS Hetzner CX22 (mínimo) | 2 vCPU / 4 GB | ~€4.5 (~$5) | Desarrollo / demo |
| VPS Hetzner CX32 (recomendado) | 4 vCPU / 8 GB | ~€8.5 (~$9) | Producción PYME |
| GCP e2-medium + Cloud SQL | 2 vCPU / 4 GB | ~$46–81 | Startup con soporte GCP |
| GCP e2-standard-2 + Cloud SQL | 2 vCPU / 8 GB | ~$144 | Agencia mediana en GCP |
| GCP Cloud Run + HA SQL | Auto-scale | ~$384–440 | SaaS multi-tenant en escala |
| Cloud administrado (Railway + Neon) | Managed | $5–66 | Prototipo / early SaaS |

---

### Almacenamiento: cálculo de crecimiento

| Concepto | Tamaño estimado | Período |
|:---------|:---------------:|:-------:|
| Imagen de propiedad comprimida (max 2000px, q82) | ~300 KB | por imagen |
| Brochure PDF generado | ~1.5 MB | por descarga guardada |
| Registro de auditoría (`audit_logs`) | ~1 KB | por acción |
| Base de datos completa (100 propiedades, 5 tenants) | ~500 MB | total |
| Uploads (100 propiedades × 5 imágenes promedio) | ~150 MB | total |
| **Crecimiento estimado mensual (agencia activa)** | **~500 MB** | por mes |

> Para instalaciones on-premise se recomienda montar el volumen `uploads` en disco separado del SO y configurar snapshots automáticos del volumen `pgdata` con retención de 30 días.

---

## 2.5 Análisis de Riesgos Técnicos y Plan de Mitigación

Tabla de riesgos técnicos del sistema bajo metodología **FMEA** (Failure Mode and Effects Analysis).  
El **Nivel de Riesgo** se calcula como: $\text{NR} = \text{Probabilidad} \times \text{Impacto}$, usando escala 1–3 (Bajo=1, Medio=2, Alto=3).

**Leyenda:** 🔴 Crítico (NR ≥ 6) · 🟡 Moderado (NR 3–5) · 🟢 Bajo (NR ≤ 2)

---

### Riesgos de Seguridad y Acceso

| ID | Modo de Fallo | Efecto | Prob. | Impacto | NR | Nivel | Plan de Mitigación |
|:---|:-------------|:-------|:-----:|:-------:|:--:|:-----:|:-------------------|
| R-01 | Fuga de datos entre tenants por error en RLS | Un agente accede a propiedades de otra empresa | Baja (1) | Alto (3) | 3 | 🟡 | Políticas RLS en BD + test suite OWASP (`owasp.security.spec.ts`); nunca exponer conexión sin `SET app.tenant_id`; revisión semestral de políticas |
| R-02 | Robo de JWT por XSS en el CRM | Sesión secuestrada; acceso no autorizado | Media (2) | Alto (3) | 6 | 🔴 | `httpOnly` cookies como alternativa en producción; CSP headers vía Nginx; tokens de corta duración (15 min) + refresh rotation |
| R-03 | Fuerza bruta en endpoint de login | Cuenta bloqueada o credenciales comprometidas | Alta (3) | Medio (2) | 6 | 🔴 | Bloqueo progresivo implementado en `AuthService`; Throttler Guard (rate limiting); IP ban tras N intentos fallidos |
| R-04 | `MASTER_ENCRYPTION_KEY` expuesta en repositorio | Datos sensibles en BD descifrados | Baja (1) | Alto (3) | 3 | 🟡 | Variables de entorno nunca en git (`.gitignore`); uso de secrets manager en producción (Railway Secrets / GCP Secret Manager) |
| R-05 | Bypass de autorización RBAC | Agente Junior accede a endpoints de Admin | Baja (1) | Alto (3) | 3 | 🟡 | `RolesGuard` + `VisibilityGuard` en todos los endpoints; tests de autorización en CI |

---

### Riesgos de Infraestructura y Disponibilidad

| ID | Modo de Fallo | Efecto | Prob. | Impacto | NR | Nivel | Plan de Mitigación |
|:---|:-------------|:-------|:-----:|:-------:|:--:|:-----:|:-------------------|
| R-06 | Caída del servidor PostgreSQL | Sistema completamente inoperativo | Media (2) | Alto (3) | 6 | 🔴 | Backups diarios automatizados; réplica de lectura en producción; health check Docker (`pg_isready`); alertas Uptime Robot |
| R-07 | Redis no disponible | Cola BullMQ detenida; caché BI perdida | Media (2) | Medio (2) | 4 | 🟡 | `maxmemory-policy allkeys-lru` evita OOM; servicios degradan gracefully sin caché; health check en `docker-compose.prod.yml` |
| R-08 | Disco lleno en servidor on-premise | Corrupción de BD o fallo en uploads | Media (2) | Alto (3) | 6 | 🔴 | Alertas de uso de disco al 80 %; volumen de datos separado del SO; cálculo de crecimiento documentado (§2.4); rotación de backups |
| R-09 | Fallo en Cloudflare R2 / almacenamiento externo | Imágenes y PDFs inaccesibles | Baja (1) | Medio (2) | 2 | 🟢 | `StorageService` con fallback a disco local; SLA 99.9 % de R2; URLs almacenadas en BD permiten migración de backend |
| R-10 | Agotamiento de memoria en NestJS (memory leak) | API no responde; workers BullMQ muertos | Baja (1) | Alto (3) | 3 | 🟡 | `restart: unless-stopped` en Docker; monitoreo Sentry con alertas de memoria; pruebas de carga con k6 (`infra/k6/`) |

---

### Riesgos de Integraciones Externas

| ID | Modo de Fallo | Efecto | Prob. | Impacto | NR | Nivel | Plan de Mitigación |
|:---|:-------------|:-------|:-----:|:-------:|:--:|:-----:|:-------------------|
| R-11 | Resend (email) no disponible o clave inválida | Emails transaccionales no enviados (2FA, alertas, confirmaciones) | Media (2) | Medio (2) | 4 | 🟡 | `EmailService` falla silencioso (fire-and-forget); flujos críticos (2FA) tienen timeout; revisar logs de Resend dashboard |
| R-12 | Meta Graph API cambia versión o revoca token | Publicaciones automáticas en Facebook/Instagram se detienen | Alta (3) | Bajo (1) | 3 | 🟡 | Cola BullMQ con reintentos (`attempts: 3`); módulo Meta es opcional; monitoreo de webhooks Meta |
| R-13 | DocuSign API depreca endpoint | Flujo de firma digital falla | Baja (1) | Medio (2) | 2 | 🟢 | Integración aislada en `FirmaService`; fallback a firma manual; alertas por email DocuSign antes de deprecaciones |
| R-14 | Zoom Server-to-Server token expirado | No se crean meeting links en visitas | Media (2) | Bajo (1) | 2 | 🟢 | Token se refresca automáticamente antes de cada llamada; visitas pueden completarse sin Zoom link |
| R-15 | Mapbox token inválido o límite excedido | Mapa de propiedades no carga; geocodificación falla | Media (2) | Bajo (1) | 2 | 🟢 | Token separado para server-side y browser; monitoreo de uso en dashboard Mapbox; fallback a input manual de coordenadas |

---

### Riesgos de Datos y Migraciones

| ID | Modo de Fallo | Efecto | Prob. | Impacto | NR | Nivel | Plan de Mitigación |
|:---|:-------------|:-------|:-----:|:-------:|:--:|:-----:|:-------------------|
| R-16 | Migración Prisma falla en producción | BD en estado inconsistente; sistema inoperativo | Baja (1) | Alto (3) | 3 | 🟡 | Ejecutar `prisma migrate deploy` en staging primero; backup completo antes de cada migración; rollback documentado |
| R-17 | RLS policies no aplicadas en tabla nueva | Datos de tenant visibles para otros tenants | Media (2) | Alto (3) | 6 | 🔴 | Checklist de despliegue incluye aplicar `migration_v2.sql`; test de aislamiento por tenant en CI; revisión de PR obligatoria |
| R-18 | Corrupción de datos en importación CSV masiva | Propiedades/clientes con datos inválidos en BD | Media (2) | Medio (2) | 4 | 🟡 | Validación de DTO con `class-validator` antes de inserción; transacciones atómicas en `$transaction`; log de filas rechazadas |
| R-19 | Pérdida de `audit_logs` por error de administrador | Trazabilidad comprometida en auditoría | Baja (1) | Alto (3) | 3 | 🟡 | Rol `gestpro_app` sin permiso DELETE/UPDATE sobre `audit_logs` (inmutabilidad a nivel de BD); backup independiente de tabla |

---

### Riesgos de Rendimiento y Escalabilidad

| ID | Modo de Fallo | Efecto | Prob. | Impacto | NR | Nivel | Plan de Mitigación |
|:---|:-------------|:-------|:-----:|:-------:|:--:|:-----:|:-------------------|
| R-20 | Consultas BI sin índices degradan con volumen | Dashboard lento (>5 s) con >1 000 propiedades | Media (2) | Medio (2) | 4 | 🟡 | Índices `bi_indexes` en migración; caché Redis 15 min en `BiService`; invalidación automática en cambios de estado |
| R-21 | Generación de PDF bloquea el event loop | API no responde durante brochure | Baja (1) | Medio (2) | 2 | 🟢 | `BrochureProcessor` en worker BullMQ separado; polling de estado por `jobId`; timeout de job configurado |
| R-22 | Crecimiento descontrolado de `audit_logs` | Consultas lentas; disco lleno | Media (2) | Medio (2) | 4 | 🟡 | Índices sobre `tenant_id + created_at`; política de retención (archivar registros >1 año); particionado por fecha en producción |
| R-23 | App móvil sin conexión a la API | Usuario no puede operar desde el campo | Alta (3) | Medio (2) | 6 | 🔴 | Caché local con `AsyncStorage` (`cacheOrFetch`); modo offline degradado (solo lectura desde caché); sincronización al recuperar conexión |

---

### Resumen de Riesgos Críticos

| # | Riesgo | NR | Acción inmediata requerida |
|:--|:-------|:--:|:--------------------------|
| R-03 | Fuerza bruta en login | 6 🔴 | Verificar Throttler Guard activo en producción |
| R-06 | Caída de PostgreSQL | 6 🔴 | Configurar backup automatizado y réplica |
| R-08 | Disco lleno on-premise | 6 🔴 | Configurar alerta al 80 % de uso de disco |
| R-17 | RLS no aplicada en tabla nueva | 6 🔴 | Agregar checklist de RLS en proceso de PR/deploy |
| R-23 | App móvil sin conexión | 6 🔴 | Validar cobertura de caché local antes de lanzamiento |
| R-02 | Robo de JWT por XSS | 6 🔴 | Revisar CSP headers y política de almacenamiento de tokens |

---

## 2.6 Costos de Desarrollo

Estimación de costos de recurso humano para **4 meses de desarrollo** (≈ 17 semanas laborales a 40 h/semana).

> Tasas de referencia para mercado guatemalteco (desarrollo de software a medida). Conversión: 1 USD ≈ 7.70 GTQ.

| Rol | Dedicación | Semanas | Total horas | Tarifa / hora (USD) | Tarifa / hora (GTQ) | Costo total (USD) | Costo total (GTQ) |
|:----|:----------:|:-------:|:-----------:|:-------------------:|:-------------------:|:-----------------:|:-----------------:|
| Supervisor / Arquitecto | 20 h/sem | 17 | 340 h | $25 | Q193 | $8 500 | Q65 500 |
| Desarrollador Full-Stack | 40 h/sem | 17 | 680 h | $15 | Q116 | $10 200 | Q78 500 |
| **Subtotal** | | | **1 020 h** | | | **$18 700** | **Q144 000** |
| Contingencia (10 %) | | | | | | $1 870 | Q14 400 |
| **Total estimado** | | | | | | **$20 570** | **Q158 400** |

### Supuestos

| # | Supuesto |
|:--|:---------|
| 1 | Mes laboral = 4.25 semanas · 4 meses = 17 semanas · semana = 40 h para el desarrollador, 20 h para el supervisor |
| 2 | El supervisor cubre arquitectura, revisión de código, gestión de sprints y comunicación con el cliente |
| 3 | El desarrollador cubre backend (NestJS + Prisma), frontend (React + Next.js), pruebas e integraciones |
| 4 | No incluye licencias de software (stack 100 % open-source / free tier), infraestructura ni costos indirectos |
| 5 | Contingencia del 10 % cubre cambios de alcance menores, depuración imprevista y ajustes de UX |

---

## 2.7 Costos de Mantenimiento y Soporte (Años 1–5)

Proyección post-lanzamiento con **1 desarrollador de soporte a 3 h/semana** (156 h/año · $15/h) más costos operativos fijos. Conversión referencial: 1 USD ≈ 7.70 GTQ.

| Rubro | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
|:------|------:|------:|------:|------:|------:|
| Desarrollador de soporte (3 h/sem · 156 h/año · $15/h) | $2 340 | $2 340 | $2 340 | $2 340 | $2 340 |
| Infraestructura (VPS Hetzner + dominio SSL) | $130 | $130 | $220 | $220 | $400 |
| Servicios de terceros (Resend, Mapbox, Sentry) | $300 | $600 | $720 | $1 200 | $1 200 |
| Actualizaciones de seguridad / dependencias | $500 | $300 | $300 | $300 | $300 |
| Contingencia (10 %) | $327 | $337 | $358 | $406 | $424 |
| **Total año (USD)** | **$3 597** | **$3 707** | **$3 938** | **$4 466** | **$4 664** |
| **Total año (GTQ)** | **Q27 697** | **Q28 544** | **Q30 323** | **Q34 388** | **Q35 913** |
| **Acumulado (USD)** | $3 597 | $7 304 | $11 242 | $15 708 | **$20 372** |

> La infraestructura sube en año 3 (upgrade de VPS por crecimiento de tenants) y en año 5 (segundo servidor o tier superior). Los servicios de terceros escalan conforme el volumen de emails y mapas supera los free tiers.

---

## 3. Plan de Negocio

### 3.1 Modelo de Monetización

GestPro opera como **SaaS multi-tenant** con licencias mensuales por agencia (tenant). Cada agencia inmobiliaria paga una cuota fija según el plan elegido; a mayor plan, acceso a más módulos y mayor límite de agentes. No hay costo por instalación ni por actualización de software: el cliente siempre usa la versión más reciente en la nube.

| Elemento | Detalle |
|:---------|:--------|
| Tipo de cobro | Suscripción mensual recurrente (MRR) |
| Ciclo de facturación | Mensual o anual (descuento 15 % en anual) |
| Moneda | Quetzales (GTQ) con equivalencia en USD |
| Método de pago | Tarjeta de crédito/débito, transferencia bancaria |
| Prueba gratuita | 14 días sin tarjeta en plan Profesional |
| Cancelación | Sin permanencia mínima; datos exportables al dar de baja |

---

### 3.2 Mercado Objetivo

**Segmento primario:** Agencias inmobiliarias PYME en Guatemala con 1 a 25 agentes que hoy gestionan operaciones con Excel, WhatsApp y correo electrónico.

| Característica | Descripción |
|:---------------|:------------|
| Tamaño de empresa | 1–25 agentes de ventas/renta |
| Geografía inicial | Guatemala (Ciudad de Guatemala, Quetzaltenango, Escuintla) |
| Expansión año 2–3 | Honduras, El Salvador, Costa Rica |
| Dolor principal | Sin trazabilidad de clientes ni pipeline; pérdida de leads; propiedades sin visibilidad online |
| Presupuesto tecnológico | Q300–Q2 000/mes (dispuestos a pagar si hay ROI claro) |

---

### 3.3 Planes y Precios

| | **Starter** | **Profesional** | **Empresarial** |
|:--|:-----------:|:---------------:|:---------------:|
| **Precio / mes** | **Q 350** (~$45) | **Q 800** (~$104) | **Q 1 600** (~$208) |
| **Agentes incluidos** | 2 | 5 | 15 |
| Agentes adicionales | Q 120/agente | Q 120/agente | Q 100/agente |
| Propiedades activas | 50 | 200 | Ilimitadas |

#### Funcionalidades por plan

| Módulo / Funcionalidad | Starter | Profesional | Empresarial |
|:-----------------------|:-------:|:-----------:|:-----------:|
| Gestión de propiedades y portal público | ✅ | ✅ | ✅ |
| Gestión de clientes | ✅ | ✅ | ✅ |
| Pipeline / Embudo de ventas (Kanban) | ✅ | ✅ | ✅ |
| Agenda y visitas | ✅ | ✅ | ✅ |
| Notificaciones in-app y email básico | ✅ | ✅ | ✅ |
| Auditoría de acciones | ✅ | ✅ | ✅ |
| Dashboard BI | Básico | Completo | Completo |
| Brochures PDF automáticos | ❌ | ✅ | ✅ |
| Campañas de email con plantillas | ❌ | ✅ | ✅ |
| App móvil (iOS + Android) | ❌ | ✅ | ✅ |
| Firma digital (DocuSign) | ❌ | ✅ | ✅ |
| Videollamadas integradas (Zoom) | ❌ | ✅ | ✅ |
| Importación masiva de datos (CSV) | ❌ | ✅ | ✅ |
| **Publicación automática en RRSS** (Facebook, Instagram) | ❌ | ❌ | ✅ |
| **Chatbot de captación de leads** | ❌ | ❌ | ✅ |
| **Sindicación a portales externos** | ❌ | ❌ | ✅ |
| Soporte | Email | Email + Chat | Prioritario 24 h |

---

### 3.4 Proyección de Ingresos (Años 1–3)

> Escenario conservador. Asume crecimiento orgánico por referidos y marketing digital básico.

| Métrica | Año 1 | Año 2 | Año 3 |
|:--------|------:|------:|------:|
| Clientes Starter | 3 | 6 | 10 |
| Clientes Profesional | 3 | 8 | 15 |
| Clientes Empresarial | 1 | 3 | 7 |
| **Total clientes** | **7** | **17** | **32** |
| MRR (GTQ) | Q4 450 | Q11 600 | Q23 600 |
| **Ingreso anual (GTQ)** | **Q53 400** | **Q139 200** | **Q283 200** |
| **Ingreso anual (USD)** | **~$6 900** | **~$18 100** | **~$36 800** |

> A partir del año 2 el ingreso anual supera el costo de mantenimiento (§2.7 ~$3 700/año), alcanzando el punto de equilibrio operativo. El desarrollo inicial (~$20 570, §2.6) se recupera antes del mes 30 en el escenario base.

#### Punto de equilibrio mensual

$$\text{Clientes para equilibrio} = \left\lceil \frac{\text{Costo operativo mensual}}{\text{Ticket promedio}} \right\rceil = \left\lceil \frac{\$308}{\ \$80} \right\rceil = 4 \text{ clientes}$$

> Costo operativo mensual = $3 707/12 ≈ $308. Ticket promedio ponderado estimado ≈ $80/mes.

---

### 3.5 Estrategia de Adquisición de Clientes

| Canal | Táctica | Horizonte |
|:------|:--------|:---------:|
| **Prueba gratuita 14 días** | Onboarding asistido sin tarjeta en plan Profesional; correos de activación automáticos | Desde lanzamiento |
| **Referidos** | Descuento del 10 % por mes a clientes que refieran una agencia que convierta | Mes 3+ |
| **Asociaciones del sector** | Acuerdo con cámaras inmobiliarias de Guatemala para demo grupal | Mes 2–6 |
| **Contenido y SEO** | Blog sobre gestión inmobiliaria PYME; posicionamiento en "CRM inmobiliario Guatemala" | Mes 4+ |
| **Demo personalizada** | Llamada de 30 min + cuenta sandbox con datos de prueba precargados | Desde lanzamiento |
| **Expansión centroamericana** | Replicar modelo en Honduras/El Salvador con agente local de ventas | Año 2–3 |

---

## 3.6 Análisis de Rentabilidad a Un Año

### Costo operativo mensual de referencia

El costo de mantenimiento del Año 1 es **$3,597/año** → **~$308/mes** a cubrir con ingresos de suscripciones.

### Punto de equilibrio: solo 4 clientes

$$\text{Clientes para equilibrio} = \left\lceil \frac{\$308}{\$80\text{ ticket promedio}} \right\rceil = 4 \text{ clientes}$$

Con la mezcla mínima para cubrir ese umbral:

| Plan | Precio/mes (USD) | Cantidad mínima | Ingreso mensual |
|:-----|:----------------:|:---------------:|----------------:|
| Starter | ~$45 | 1 | ~$45 |
| Profesional | ~$104 | 2 | ~$208 |
| Empresarial | ~$208 | 1 | ~$208 |
| **Total** | | **4** | **~$461** |

Con solo 4 clientes se generan **~$153/mes de utilidad** sobre costos operativos, cubriendo el punto de equilibrio desde el primer mes completo con esa cartera.

### Proyección conservadora Año 1 (escenario §3.4)

La combinación proyectada de **3 Starter + 3 Profesional + 1 Empresarial = 7 clientes** produce:

| Concepto | Año 1 |
|:---------|------:|
| Ingreso anual | ~$6,900 |
| Costo de mantenimiento | ~$3,597 |
| **Utilidad operativa neta** | **~$3,303** |

Con 7 clientes el ingreso operativo es **positivo desde el primer año**, cubriendo 1.9× los costos de mantenimiento.

---

### Proyección de ingresos a 5 años (USD)

Escenario conservador con crecimiento orgánico por referidos y expansión centroamericana a partir del año 3.

> **MRR** (Monthly Recurring Revenue): ingreso mensual recurrente garantizado por suscripciones activas. Se calcula como la suma de todos los clientes activos multiplicados por su precio mensual de plan.

La inversión de desarrollo de **$20,570** (§2.6) se amortiza en línea recta a **3 años** ($6,857/año), aplicándose como cargo en los primeros tres períodos:

$$\text{Amortización anual} = \frac{\$20{,}570}{3} \approx \$6{,}857 \text{ · Años 1–3} \qquad \$0 \text{ · Años 4–5}$$

| Métrica | Año 1 | Año 2 | Año 3 | Año 4 | Año 5 |
|:--------|------:|------:|------:|------:|------:|
| Clientes Starter ($45/mes) | 3 | 6 | 10 | 16 | 20 |
| Clientes Profesional ($104/mes) | 3 | 8 | 15 | 20 | 28 |
| Clientes Empresarial ($208/mes) | 1 | 3 | 5 | 8 | 10 |
| **Total clientes** | **7** | **17** | **30** | **44** | **58** |
| **MRR (USD)** | **~$655** | **~$1,726** | **~$3,050** | **~$4,464** | **~$5,892** |
| **Ingreso anual (USD)** | **~$7,860** | **~$20,712** | **~$36,600** | **~$53,568** | **~$70,704** |
| Costo de mantenimiento | $3,597 | $3,707 | $3,938 | $4,466 | $4,664 |
| **Utilidad operativa** | **~$4,263** | **~$17,005** | **~$32,662** | **~$49,102** | **~$66,040** |
| Amortización desarrollo | $6,857 | $6,857 | $6,857 | $0 | $0 |
| **Utilidad neta** | **−$2,594** | **~$10,148** | **~$25,805** | **~$49,102** | **~$66,040** |
| **Utilidad acumulada** | −$2,594 | **~$7,554** | **~$33,359** | **~$82,461** | **~$148,501** |

> Al cierre del **Año 2** la utilidad acumulada es positiva (+$7,554), lo que significa que la inversión de desarrollo queda totalmente absorbida dentro del segundo año de operación. Al final del **Año 5** el negocio acumula **~$148,501 de utilidad neta** después de haber descontado el costo total de desarrollo y todos los gastos de mantenimiento.

---

*Última actualización: mayo 2026*

---

## 3.7 Infraestructura GCP — Comparativa de Configuraciones

### Configuración mínima recomendada ($144/mes)

| Servicio GCP | Producto | Specs | Costo/mes |
|:-------------|:---------|:------|----------:|
| Compute Engine | e2-standard-2 | 2 vCPU / 8 GB RAM | $49 |
| Persistent Disk Boot | SSD 40 GB | — | $7 |
| Persistent Disk Datos | SSD 100 GB | Volumen separado | $17 |
| Cloud SQL for PostgreSQL | db-g1-small | 1 vCPU / 1.7 GB | $26 |
| Memorystore for Redis | Basic 1 GB | Instancia regional | $35 |
| Cloud Storage | Standard 100 GB | Uploads + backups | $2 |
| Cloud Armor WAF | Pay-as-you-go | — | $5 |
| Cloud CDN + Networking | Egress 30 GB/mes | — | $3 |
| **Total mínimo** | | | **$144/mes** |

### Configuración para operación adecuada ($354/mes)

| Servicio GCP | Producto | Specs | Costo/mes | vs Mínimo |
|:-------------|:---------|:------|----------:|----------:|
| Compute Engine | e2-standard-4 | 4 vCPU / 16 GB RAM | $98 | +$49 |
| Persistent Disk Boot | SSD 50 GB | — | $8 | +$1 |
| Persistent Disk Datos | SSD 200 GB | Volumen separado | $34 | +$17 |
| Cloud SQL for PostgreSQL | db-n1-standard-2 | 2 vCPU / 7.5 GB | $92 | +$66 |
| Memorystore for Redis | Basic 2 GB | Regional | $71 | +$36 |
| Cloud Storage | Standard 250 GB | Uploads + backups | $5 | +$3 |
| Cloud Armor WAF | Standard tier | — | $10 | +$5 |
| Cloud CDN + Networking | Egress 100 GB/mes | — | $8 | +$5 |
| Cloud Load Balancing | HTTP(S) Global | — | $18 | +$18 |
| Cloud Monitoring | Ops Suite básico | Logs + alertas | $10 | +$10 |
| **Total adecuado** | | | **$354/mes** | **+$210** |

### Justificación de upgrades

| Componente | Razón del upgrade |
|:-----------|:------------------|
| **Compute ×2** | NestJS API + React web + Next.js portal + BullMQ workers corren simultáneamente; 20–40 clientes concurrentes requieren margen de CPU/RAM |
| **Cloud SQL ×8 RAM** | Las políticas RLS (`SET app.tenant_id`) añaden overhead por query; 7.5 GB de RAM permiten un buffer pool adecuado en PostgreSQL 16 |
| **Redis 1→2 GB** | Colas BullMQ (generación de brochures PDF) + caché BI por tenant (`bi:<tenantId>:*`) crecen con el número de tenants activos |
| **Storage 100→250 GB** | Imágenes comprimidas de propiedades + brochures PDF generados + backups diarios de base de datos |
| **Load Balancer** | Permite escalar a 2 instancias sin downtime; requerido para certificados SSL gestionados en GCP |
| **Monitoring** | Alertas de CPU/RAM/conexiones DB; indispensable para mantener SLA en producción |

### Impacto en el modelo financiero

> El costo de mantenimiento anual se recalcula con la configuración adecuada: **$354/mes × 12 = $4,248/año** (vs $1,728/año en configuración mínima, diferencia de +$2,520/año).

| Escenario infra | Costo infra/mes | Costo infra/año | Clientes mínimos para cubrir solo infra |
|:----------------|----------------:|----------------:|----------------------------------------:|
| Mínimo | $144 | $1,728 | ~2 clientes Starter |
| Adecuado | $354 | $4,248 | ~4 clientes Starter |

La configuración adecuada eleva el punto de equilibrio operativo (sin amortización) de ~4 a ~5–6 clientes totales, manteniéndose alcanzable en el primer trimestre de operación según la proyección conservadora del §3.6.

---

*Última actualización: mayo 2026*
