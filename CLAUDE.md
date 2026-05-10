# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS CRM for real estate agencies (Guatemala). npm workspaces monorepo with four packages: `api` (NestJS), `web` (React/Vite), `portal` (Next.js 14 SSR), and `shared` (TypeScript types/enums).

## Commands

All commands run from the repo root unless noted.

### Development
```bash
docker compose up -d   # PostgreSQL 16 + Redis 7 (required first)
npm run dev:api        # API on port 3000
npm run dev:web        # CRM frontend on port 5173
npm run dev:portal     # Public portal on port 3001
```

### Database (run from `api/`)
```bash
npm run db:migrate    # Apply pending Prisma migrations
npm run db:seed       # Seed SUPER_ADMIN + demo tenant
npm run db:studio     # Prisma Studio GUI
```

**After migrations, manually apply RLS policies in order:**
1. `api/prisma/sql/rls_policies/migration.sql` — Fase 1 tables
2. `api/prisma/sql/rls_policies/migration_v2.sql` — Fase 2–12 tables

Prisma cannot manage these RLS policies. New tables added via migration also need a policy in `migration_v2.sql`.

### Testing
```bash
npm run test                                                      # All API tests
cd api && npx jest src/modules/visitas/__tests__/visitas.service.spec.ts  # Single file
cd api && npx jest --watch                                        # Watch mode
cd api && npx jest --coverage                                     # Coverage report
```

Tests live in `api/src/modules/<module>/__tests__/` and `api/src/__tests__/security/`.

### Build & Lint
```bash
npm run build:api
npm run build:web
npm run build:portal
npm run lint          # ESLint on api + web
```

### Environment
Copy `.env.example` to `.env` at repo root. `api` reads it via `ConfigModule.forRoot({ envFilePath: '../.env' })`. `web` reads `VITE_*` vars. `portal` reads `NEXT_PUBLIC_*` vars.

## Architecture

### Multi-tenancy via PostgreSQL RLS
Every table with `tenant_id` has a Row-Level Security policy enforced at the DB level. `TenantMiddleware` (`api/src/common/middleware/tenant.middleware.ts`) runs on every request and executes `SET app.tenant_id = '<uuid>'` before any query. SUPER_ADMIN also sets `app.bypass_rls = 'true'` to access cross-tenant data. Unauthenticated routes bypass RLS so login/onboarding can find users across tenants.

### Authentication Flow
1. `POST /api/auth/login` → if TOTP enabled, returns `{ requires2FA: true, tempToken }`, otherwise returns tokens directly
2. `POST /api/auth/verify-2fa` → returns `{ accessToken, refreshToken }`

Access tokens expire in 15 min; refresh tokens last 7 days, stored in the `sessions` table (max 2 concurrent). The frontend (`web/src/stores/authStore.ts`) stores tokens in `localStorage` and reads the JWT payload via `parseJwt()` on page load.

**JWT payload shape** (from `JwtStrategy.validate()`): `{ sub, tenantId, email, rol }` — all camelCase. Controllers access this as `req.user.tenantId` or via `@CurrentUser()` which returns the same object. Using `user.tenant_id` (snake_case) in a controller is a bug.

### Role Hierarchy & Guards
`SUPER_ADMIN > ADMIN > SENIOR > JUNIOR`

- `JwtAuthGuard` — validates JWT, attaches user to `req.user`
- `RolesGuard` — checks `@Roles(...)` decorator against `req.user.rol`
- `VisibilityGuard` — injects `req.visibleUserIds`: JUNIOR → self only; SENIOR → self + recursive downline; ADMIN/SUPER_ADMIN → all

### Global Audit Interceptor
`AuditInterceptor` (`api/src/common/interceptors/audit.interceptor.ts`) is registered globally and auto-logs all POST/PUT/PATCH/DELETE to `audit_logs`. Opt out with `@SkipAudit()`. The `maru_app` DB role has UPDATE/DELETE revoked on `audit_logs` — the table is intentionally immutable.

### State Machines
Enforced via `TRANSICIONES_VALIDAS` maps in the respective services; invalid transitions throw `BadRequestException`.

- **Property:** `BORRADOR → DISPONIBLE → RESERVADA / EN_NEGOCIACION → VENDIDA / RENTADA`
- **Pipeline:** `NUEVO → CONTACTADO → INTERESADO → EN_NEGOCIACION → GANADO / PERDIDO` (PERDIDO can reopen to NUEVO)

When a pipeline item moves to `EN_NEGOCIACION`, the property is atomically set to `RESERVADA` in the same `$transaction`.

### Background Jobs (BullMQ + Schedulers)
Redis is required for both BullMQ queues and BI caching.

**BullMQ worker:**
- `BrochureProcessor` — PDF generation; enqueued by `POST /api/propiedades/:id/brochure`, result polled via `GET .../brochure/jobs/:jobId`, download tracked in `brochure_descargas`

**`@Cron` schedulers:**
- `VisitasScheduler` — every 30min: notifies agents of visits ended 2h+ ago with no report filed; daily 8am: sends 24h reminder emails to clients
- `PipelineScheduler` — daily 9am: notifies agents of leads inactive beyond `ConfigSeguridad.dias_inactividad_lead`
- `DocumentosScheduler` — daily 8am: alerts on expiring/expired property documents

### Storage (Local vs Cloudflare R2)
`StorageService` (`api/src/modules/storage/`) auto-selects backend based on env vars: if `R2_BUCKET` is set, uses Cloudflare R2 via S3 SDK; otherwise writes to `api/uploads/` served statically at `/uploads/*`. Files are referenced by URL in the DB.

### Email Architecture
Two distinct flows in `EmailService`:

1. **Agent notifications** (`sendTransactionalEmail`) — for CRM users (agents, admins); includes a "Ver en CRM" CTA link tracked via pixel in `email_eventos` table (records `abierto_at`, `primer_clic_at`)
2. **Client emails** (`sendClientEmail`) — for external portal clients; portal branding, no CRM link; used for visit reminders, interest confirmations, matching alerts

Requires `RESEND_API_KEY` + `EMAIL_FROM`. Missing key causes silent no-ops (emails are fire-and-forget).

### BI Caching
`RedisService` (`api/src/redis/`) is a `@Global()` provider wrapping ioredis. `BiService` caches all dashboard queries for 15 min using key pattern `bi:<tenantId>:<type>:<params>`. Cache is invalidated automatically by `PipelineService` on state changes, or manually via `POST /api/bi/cache/flush`.

### Shared Package
`@maru/shared` (`shared/src/index.ts`) exports enums (`Rol`, `EstadoUsuario`, `Plan`, `AccionAudit`, etc.) and auth DTOs/interfaces used by both `api` and `web`. Consumed as raw TypeScript source — no build step needed.

### Frontend Data Fetching (TanStack Query)
All API calls in `web/` go through `apiRequest()` (`web/src/lib/api.ts`) which reads `VITE_API_URL` (defaults to `http://localhost:3000`). Domain hooks in `web/src/hooks/` wrap TanStack Query:

- `usePropiedades.ts` — property list/detail/stats/mutations
- `useClientes.ts` — client list/detail/matching/mutations
- `usePipeline.ts` — kanban data with optimistic updates on `useMovePipeline`
- `useVisitas.ts` — visitas CRUD + config + Zoom meeting mutations
- `useSindicacion.ts` — portal syndication per property
- `useFirma.ts` — DocuSign signature requests per property

Every mutation's `onSuccess` calls `queryClient.invalidateQueries` to keep data fresh. `useMovePipeline` uses full optimistic update with rollback on error.

QueryClient config (in `web/src/main.tsx`): `staleTime: 30s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`.

### Portal (Next.js 14)
`portal/` is a separate Next.js 14 App Router package (`@maru/portal`). It is SSR/RSC by default — components are server components unless marked `'use client'`. It fetches directly from the API using env var `NEXT_PUBLIC_API_URL`. Key env vars: `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_COMPANY_EMAIL`, `NEXT_PUBLIC_MAPBOX_TOKEN`. The `ChatbotWidget` is mounted globally in `layout.tsx` and posts leads to `POST /api/public/chatbot-lead`.

### Public API Routes (`/api/public/*`)
These routes bypass `JwtAuthGuard` and RLS (bypass mode). They handle: portal registration, email verification, client reschedule links, and chatbot lead capture. They are in `PortalModule`.

### File Upload Flow
`UploadModule` (multer, memory storage) handles multipart. `ImageService` compresses images to max 2000px JPEG quality 82 and watermarks with the tenant name. Files go to `StorageService` which decides local vs R2.
