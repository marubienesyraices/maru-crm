# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant SaaS CRM for real estate agencies (Guatemala). Built as an npm workspaces monorepo with three packages: `api` (NestJS), `web` (React/Vite), and `shared` (TypeScript types/enums shared between both).

## Commands

All commands run from the repo root unless noted.

### Development
```bash
# Start infrastructure (PostgreSQL 16 + Redis 7)
docker compose up -d

# Start API (port 3000)
npm run dev:api

# Start web (port 5173)
npm run dev:web
```

### Database (run from `api/`)
```bash
npm run db:migrate    # Apply pending Prisma migrations
npm run db:seed       # Seed initial data (SUPER_ADMIN + demo tenant)
npm run db:studio     # Open Prisma Studio GUI
```

**Important:** After running Prisma migrations for the first time, manually apply `api/prisma/sql/rls_policies/migration.sql` to set up PostgreSQL Row-Level Security policies. Prisma cannot manage these.

### Testing
```bash
# All API tests
npm run test

# Single test file
cd api && npx jest src/modules/auth/__tests__/auth.service.spec.ts

# Watch mode
cd api && npx jest --watch

# With coverage
cd api && npx jest --coverage
```

### Build & Lint
```bash
npm run build:api
npm run build:web
npm run lint          # Runs lint in both api and web
```

### Environment
Copy `.env.example` to `.env` at repo root. Both `api` and `web` read from there (`api` via `ConfigModule.forRoot({ envFilePath: '../.env' })`).

## Architecture

### Multi-tenancy via PostgreSQL RLS
Every table with a `tenant_id` column has a Row-Level Security policy. The `TenantMiddleware` runs on every request and sets `SET app.tenant_id = '<uuid>'` as a PostgreSQL session variable before any query executes. SUPER_ADMIN bypasses this with `SET app.bypass_rls = 'true'`. Unauthenticated routes (login, onboarding) also bypass RLS to allow cross-tenant user lookups.

### Authentication Flow
Two-step login: `POST /api/auth/login` (email+password) → if TOTP enabled, returns `{ requires2FA: true, tempToken }` → `POST /api/auth/verify-2fa`. On success, returns `{ accessToken, refreshToken }`. Access tokens expire in 15 minutes; refresh tokens last 7 days and are stored in the `sessions` table (max 2 concurrent sessions per user). The frontend stores both tokens in `localStorage` and parses the JWT payload directly via `parseJwt()` in `authStore.ts`.

### Role Hierarchy
`SUPER_ADMIN > ADMIN > SENIOR > JUNIOR`. Guards:
- `JwtAuthGuard`: validates JWT on all protected routes
- `RolesGuard`: checks `@Roles(...)` decorator against `user.rol`
- `VisibilityGuard`: injects `req.visibleUserIds` — JUNIOR sees only self, SENIOR sees self + full recursive downline, ADMIN/SUPER_ADMIN see all

### Global Audit Interceptor
`AuditInterceptor` is registered globally and auto-logs all mutating requests (POST/PUT/PATCH/DELETE) to `audit_logs`. Sensitive fields are redacted. Routes can opt out with `@SkipAudit()`. `audit_logs` is immutable by design — the `maru_app` DB role has `UPDATE`/`DELETE` revoked.

### State Machines
Both `PropiedadesService` and `PipelineService` enforce state transitions via a `TRANSICIONES_VALIDAS` map. Attempts to skip states or go backwards throw `BadRequestException`.

- **Property states:** `BORRADOR → DISPONIBLE → RESERVADA / EN_NEGOCIACION → VENDIDA / RENTADA`
- **Pipeline states:** `NUEVO → CONTACTADO → INTERESADO → EN_NEGOCIACION → GANADO / PERDIDO`

### Shared Package
`@maru/shared` (`shared/src/index.ts`) exports enums (`Rol`, `EstadoUsuario`, `Plan`, etc.) and DTOs used by both `api` and `web`. It is consumed directly as TypeScript source (no build step).

### Frontend State
- **Auth**: Zustand store (`authStore.ts`) — persists to `localStorage`, initializes by parsing the stored JWT on page load
- **API calls**: raw `fetch` via `apiRequest()` in `web/src/lib/api.ts` (hardcoded to `http://localhost:3000`)
- **No global data cache** yet — TanStack Query is installed but each page fetches independently

### File Uploads
`UploadModule` handles multipart uploads (multer) and saves files to `api/uploads/`. They are served statically at `/uploads/*` via `ServeStaticModule`. Property images and documents reference these URLs in the DB.
