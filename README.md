# GestPro CRM

CRM inmobiliario multi-tenant SaaS para agencias de bienes raíces en Guatemala. Monorepo con cuatro paquetes: `api` (NestJS), `web` (React/Vite), `portal` (Next.js 14 SSR) y `shared` (tipos TypeScript compartidos).

## Tabla de contenidos

- [Requisitos previos](#requisitos-previos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Configuración inicial](#configuración-inicial)
- [Instalación y puesta en marcha](#instalación-y-puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Comandos disponibles](#comandos-disponibles)
- [Arquitectura](#arquitectura)
- [Módulos del API](#módulos-del-api)
- [Flujo de autenticación](#flujo-de-autenticación)
- [Jerarquía de roles](#jerarquía-de-roles)
- [Máquinas de estado](#máquinas-de-estado)
- [Pruebas](#pruebas)
- [Despliegue en producción](#despliegue-en-producción)

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 20.x          |
| npm         | 10.x          |
| Docker + Docker Compose | cualquier versión reciente |
| PostgreSQL (via Docker) | 16 |
| Redis (via Docker) | 7 |

---

## Estructura del proyecto

```
gestpro-crm/
├── api/          # Backend NestJS (puerto 3000)
│   ├── prisma/   # Esquema, migraciones y seed
│   ├── src/
│   │   └── modules/   # auth, propiedades, clientes, pipeline, …
│   └── uploads/  # Archivos subidos (servidos en /uploads/*)
├── web/          # Frontend React + Vite (puerto 5173)
│   └── src/
│       ├── components/
│       ├── pages/
│       └── lib/api.ts
├── portal/       # Portal público de propiedades (puerto 5174)
├── shared/       # Enums y tipos TypeScript compartidos
│   └── src/index.ts
├── docker-compose.yml
├── .env.example
└── package.json  # Workspace raíz
```

---

## Configuración inicial

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd gestpro-crm
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores. Ver la sección [Variables de entorno](#variables-de-entorno) para el detalle de cada variable.

### 4. Levantar la infraestructura

```bash
docker compose up -d
```

Esto inicia PostgreSQL 16 (puerto 5432) y Redis 7 (puerto 6379).

### 5. Ejecutar migraciones y seed

```bash
# Desde api/
cd api
npm run db:migrate
npm run db:seed
```

El seed crea un usuario `SUPER_ADMIN` y un tenant de demo. Las credenciales se imprimen en consola al finalizar.

### 6. Aplicar políticas RLS (obligatorio)

Prisma no puede gestionar políticas de Row-Level Security. Tras la primera migración, aplica manualmente:

```bash
# Con psql o cualquier cliente SQL
psql $DATABASE_URL -f api/prisma/sql/rls_policies/migration.sql
```

---

## Instalación y puesta en marcha

Desde la raíz del monorepo, en terminales separadas:

```bash
# Terminal 1 — API (http://localhost:3000)
npm run dev:api

# Terminal 2 — Web (http://localhost:5173)
npm run dev:web

# Terminal 3 — Portal público (http://localhost:5174)  [opcional]
npm run dev:portal
```

La documentación Swagger del API queda disponible en `http://localhost:3000/api/docs`.

---

## Variables de entorno

Todas las variables se definen en un único `.env` en la raíz. El API las lee via `ConfigModule` (`envFilePath: '../.env'`); Vite expone las que tienen prefijo `VITE_` al navegador.

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `JWT_ACCESS_SECRET` | Sí | Secreto para tokens de acceso (mín. 32 chars) |
| `JWT_REFRESH_SECRET` | Sí | Secreto para refresh tokens (mín. 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | Sí | Expiración del access token (ej. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Sí | Expiración del refresh token (ej. `7d`) |
| `REDIS_HOST` | Sí | Host de Redis |
| `REDIS_PORT` | Sí | Puerto de Redis (default `6379`) |
| `PORT` | Sí | Puerto del servidor API (default `3000`) |
| `NODE_ENV` | Sí | `development` \| `production` |
| `FRONTEND_URL` | Sí | URL del frontend (CORS) |
| `VITE_API_URL` | Sí | URL del API consumida por el frontend |
| `APP_URL` | Sí | URL pública del servidor (tracking de emails) |
| `R2_ACCOUNT_ID` | No | Cloudflare R2 — si está vacío, usa disco local |
| `R2_ACCESS_KEY_ID` | No | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | No | Cloudflare R2 |
| `R2_BUCKET` | No | Cloudflare R2 |
| `R2_PUBLIC_URL` | No | URL pública del bucket R2 |
| `RESEND_API_KEY` | No | API key de Resend para emails |
| `EMAIL_FROM` | No | Remitente de emails (ej. `GestPro CRM <no-reply@...>`) |
| `VITE_MAPBOX_TOKEN` | No | Token Mapbox expuesto al navegador |
| `MAPBOX_TOKEN` | No | Token Mapbox solo servidor (auto-geocodificación) |
| `PORTAL_TENANT_ID` | No | UUID del tenant cuyas propiedades muestra el portal público |

---

## Comandos disponibles

Todos se ejecutan desde la raíz del monorepo salvo indicación.

### Desarrollo

```bash
npm run dev:api      # API en modo watch (puerto 3000)
npm run dev:web      # Web en modo watch (puerto 5173)
npm run dev:portal   # Portal público en modo watch (puerto 5174)
```

### Base de datos (ejecutar desde `api/`)

```bash
npm run db:migrate   # Aplica migraciones pendientes
npm run db:seed      # Crea SUPER_ADMIN y tenant demo
npm run db:studio    # Abre Prisma Studio en http://localhost:5555
```

### Build

```bash
npm run build:api    # Compila NestJS → dist/
npm run build:web    # Compila React → web/dist/
npm run build:portal # Compila portal → portal/dist/
```

### Lint

```bash
npm run lint         # Ejecuta ESLint en api y web
```

### Pruebas

```bash
npm run test                          # Todos los tests del API
cd api && npx jest --watch            # Modo watch
cd api && npx jest --coverage         # Con cobertura
cd api && npx jest src/modules/auth/__tests__/auth.service.spec.ts  # Archivo específico
```

---

## Arquitectura

### Multi-tenancy con PostgreSQL RLS

Cada tabla con columna `tenant_id` tiene una política de Row-Level Security. El `TenantMiddleware` ejecuta `SET app.tenant_id = '<uuid>'` como variable de sesión PostgreSQL antes de cualquier consulta. `SUPER_ADMIN` lo omite con `SET app.bypass_rls = 'true'`. Las rutas no autenticadas (login, onboarding) también omiten RLS para permitir búsquedas cross-tenant.

### Paquete compartido

`@gestpro/shared` exporta enums (`Rol`, `EstadoUsuario`, `Plan`, `EstadoPropiedad`, etc.) y DTOs usados tanto por el API como por el frontend. Se consume directamente como TypeScript fuente, sin paso de compilación.

### Almacenamiento de archivos

`UploadModule` gestiona subidas multipart (multer). Por defecto guarda en `api/uploads/` y los sirve en `/uploads/*` via `ServeStaticModule`. Si se configuran las variables `R2_*`, usa Cloudflare R2 en su lugar.

### Estado del frontend

- **Auth**: store Zustand (`authStore.ts`) persistido en `localStorage`, inicializado parseando el JWT almacenado.
- **API calls**: `apiRequest()` en `web/src/lib/api.ts` con refresco automático de token.
- **Cache**: TanStack Query instalado; cada página fetcha de forma independiente.

### Auditoría

`AuditInterceptor` registrado globalmente auto-loguea todas las solicitudes mutantes (POST/PUT/PATCH/DELETE) en `audit_logs`. Los campos sensibles son redactados. Las rutas pueden excluirse con `@SkipAudit()`. El registro de auditoría es inmutable — el rol de BD `gestpro_app` tiene `UPDATE`/`DELETE` revocados.

---

## Módulos del API

| Módulo | Descripción |
|--------|-------------|
| `auth` | Login, 2FA (TOTP), refresh token, logout |
| `users` | Gestión de usuarios del tenant |
| `tenants` | Configuración del tenant (SUPER_ADMIN) |
| `propiedades` | CRUD de propiedades con máquina de estados |
| `propietarios` | Registro de propietarios de inmuebles |
| `clientes` | CRM de leads con preferencias de búsqueda |
| `pipeline` | Kanban de negociaciones cliente-propiedad |
| `interacciones` | Historial de llamadas, visitas, mensajes |
| `visitas` | Agendamiento de visitas con reporte posterior |
| `documentos` | Documentos legales de propiedades (con alertas de vencimiento) |
| `brochure` | Generación asíncrona de brochures PDF (BullMQ) |
| `upload` | Subida de imágenes y archivos |
| `search` | Búsqueda global cross-entidad |
| `import` | Importación masiva de propiedades/clientes vía Excel |
| `notificaciones` | Notificaciones in-app |
| `email` | Envío de emails via Resend |
| `campanas` | Campañas de email marketing con plantillas |
| `bi` | Métricas y reportes de Business Intelligence |
| `portal` | API pública del portal de propiedades |
| `audit` | Consulta del log de auditoría |
| `storage` | Abstracción disco local / Cloudflare R2 |

---

## Flujo de autenticación

```
POST /api/auth/login  (email + password)
        │
        ├─ 2FA desactivado ──→  { accessToken, refreshToken }
        │
        └─ 2FA activado ──→  { requires2FA: true, tempToken }
                                        │
                              POST /api/auth/verify-2fa  (código TOTP)
                                        │
                                        └──→  { accessToken, refreshToken }
```

- **Access token**: expira en 15 min, validado en cada request por `JwtAuthGuard`.
- **Refresh token**: expira en 7 días, almacenado en tabla `sessions` (máx. 2 sesiones concurrentes por usuario).
- El frontend almacena ambos tokens en `localStorage` y los renueva automáticamente.

---

## Jerarquía de roles

```
SUPER_ADMIN > ADMIN > SENIOR > JUNIOR
```

| Rol | Alcance de visibilidad |
|-----|------------------------|
| `JUNIOR` | Solo se ve a sí mismo |
| `SENIOR` | Sí mismo + toda su línea descendente recursiva |
| `ADMIN` | Todos los usuarios del tenant |
| `SUPER_ADMIN` | Todos los tenants (omite RLS) |

Guards en uso: `JwtAuthGuard`, `RolesGuard` (`@Roles(...)`), `VisibilityGuard` (inyecta `req.visibleUserIds`).

---

## Máquinas de estado

### Propiedades

```
BORRADOR → DISPONIBLE → RESERVADA      → VENDIDA
                      → EN_NEGOCIACION → RENTADA
                      → SUSPENDIDA
```

### Pipeline (negociaciones)

```
NUEVO → CONTACTADO → INTERESADO → EN_NEGOCIACION → GANADO
                                                 → PERDIDO
```

Los intentos de saltar estados o retroceder lanzan `BadRequestException`.

---

## Pruebas

El proyecto incluye pruebas unitarias para todos los servicios principales utilizando Jest con mocks de Prisma.

```bash
# Desde la raíz
npm run test

# Con cobertura detallada
cd api && npx jest --coverage

# Un módulo específico
cd api && npx jest src/modules/pipeline
```

Cobertura de módulos con tests: `auth`, `users`, `tenants`, `propiedades`, `propietarios`, `clientes`, `pipeline`, `interacciones`, `visitas`, `notificaciones`, `email`, `audit`.

---

## Despliegue en producción

1. Construir los artefactos:
   ```bash
   npm run build:api
   npm run build:web
   ```

2. Ejecutar migraciones en la BD de producción:
   ```bash
   cd api && npx prisma migrate deploy
   ```

3. Aplicar políticas RLS:
   ```bash
   psql $DATABASE_URL -f api/prisma/sql/rls_policies/migration.sql
   ```

4. Iniciar el servidor:
   ```bash
   cd api && node dist/main.js
   ```

5. Servir el frontend compilado (`web/dist/`) con un servidor estático (Nginx, Caddy, etc.) o un CDN.

> Para almacenamiento de archivos en producción se recomienda configurar Cloudflare R2 via las variables `R2_*` en lugar de usar disco local.
