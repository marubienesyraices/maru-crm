# Barrido de Pruebas — GestProp CRM

> Fecha: 24-jul-2026 · Alcance: `api/` (unitarias + e2e), `web/` (Vitest + Cypress E2E), `portal/` (Vitest), `mobile/` (ausencia de pruebas), y confirmación en CI real (GitHub Actions).
> Metodología: se ejecutaron todas las suites de verdad (no solo se leyó el código) contra una base de datos Postgres aislada y recién sembrada (`gestprop_test`/`gestprop_crm_test`, creada y eliminada en esta misma sesión — la base de datos de desarrollo real nunca se usa para correr pruebas), se midió cobertura real con los reportes de Jest/Vitest, y se confirmó el estado de la corrida más reciente de CI real vía `gh run view`.

---

## Resumen ejecutivo

| Suite | Resultado | Cobertura |
|:------|:----------|:----------|
| **API — unitarias** (`api/`, Jest) | ✅ **594/594** passed, 43 suites | Stmts **77.34%** · Branch **63.25%** · Func **55.26%** · Lines **77.95%** |
| **API — smoke E2E** (`app.e2e-spec.ts`) | ✅ **1/1** passed | — (arranca la app completa, no mide líneas) |
| **Web — unitarias** (`web/`, Vitest) | ✅ **11/11** passed, 3 archivos | Stmts **1.02%** (48/4688) — solo los 3 archivos con test propio |
| **Portal — unitarias** (`portal/`, Vitest) | ✅ **6/6** passed, 2 archivos | Stmts **12.61%** (54/428) |
| **E2E Cypress** (`web/cypress/`) | ✅ **22/22** passed, 8 specs | — (smoke tests de navegación, no miden líneas) |
| **Mobile** (`mobile/`, Expo) | — | **0 tests** — sin alcance en este barrido |
| **Lint** (`api`, `web`) | ✅ Limpio (4 warnings cosméticos en `api`, 0 en `web`) | |
| **Lint** (`portal`, `next lint`) | ❌ Roto **localmente** (pre-existente, no relacionado con pruebas) | |
| **Build** (`api`, `web`, `portal`) | ✅ Los 3 compilan limpio | |
| **CI real** (GitHub Actions, run `30108992846`) | ✅ Verde — Lint & Build, E2E Tests, Unit Tests | `k6 Load Tests` correctamente en espera (solo `workflow_dispatch`) |

**Total de pruebas automatizadas ejecutadas en este barrido: 634** (594 API unit + 1 API e2e + 11 web + 6 portal + 22 Cypress + 0 mobile — se cuentan por separado porque corren con runners y propósitos distintos).

---

## 1. API (`api/`) — pruebas unitarias

Ejecutado con `npx jest --ci --coverage` contra la DB aislada:

```
Test Suites: 43 passed, 43 total
Tests:       594 passed, 594 total
Snapshots:   0 total
```

### Cobertura global

| Métrica | % | Umbral configurado (`coverageThreshold`) |
|:--------|--:|:---:|
| Statements | 77.34% | 65% ✅ |
| Branches | 63.25% | 50% ✅ |
| Functions | 55.26% | 45% ✅ |
| Lines | 77.95% | 65% ✅ |

Todas las métricas superan el umbral configurado, con más margen que en el barrido anterior (72-78% ahora vs 69-78% antes) — resultado esperado tras los specs de schedulers/config-sistema/brochure/pdf-render agregados en la ronda P2.

### Cobertura por módulo (agregada, statements/branch/func/lines)

Módulos por debajo del 70% de statements — los de mayor riesgo relativo, ordenados de menor a mayor:

| Módulo | Stmt | Branch | Func | Lines | Nota |
|:-------|-----:|-------:|-----:|------:|:-----|
| `modules/email` | 48.4% | 36.4% | 42.1% | 46.8% | Fire-and-forget, sin `RESEND_API_KEY` en tests |
| `modules/documentos` | 51.1% | 27.7% | 54.2% | 49.8% | |
| `modules/upload` | 50% | 24.1% | 26.7% | 50% | Multipart, difícil de testear unitariamente |
| `modules/users` | 53.5% | 42.0% | 32.7% | 54.1% | |
| `modules/tenants` | 58.9% | 46.4% | 22.2% | 57.5% | Gestión de tenants, solo SUPER_ADMIN |
| `modules/propiedades` | 62.6% | 42.9% | 27.7% | 68.0% | El módulo de mayor volumen de negocio — vale la pena revisar en una próxima ronda |
| `src` (bootstrap: `main.ts`, `instrument.ts`) | 64.2% | 27.3% | 66.7% | 63.3% | Normal — `main.ts`/`instrument.ts` no se testean unitariamente en ningún proyecto Nest típico |
| `common/encryption` | 53.1% | 50% | 20% | 46.4% | Cifrado de credenciales de integraciones — sensible, vale la pena revisar |
| `modules/visitas` | 70.8% | 48.4% | 45.2% | 70.3% | |

Módulos con cobertura ejemplar (100% o cerca): `search` (100%), `common/decorators`, `common/filters`, `common/middleware` (100%), `config-sistema` (96.9%), `firma-digital` (95.3%), `videollamadas` (95.7%), `storage` (95.3%), `catalogo-planes` (95.7%), `config-portal` (95%).

**Patrón estructural sin cambios respecto al barrido anterior**: ningún `*.controller.ts` tiene spec unitario propio — la cobertura de controllers viene indirectamente de `owasp.security.spec.ts` (arranca la app completa y golpea un puñado de rutas reales). No es un hallazgo nuevo, ya estaba documentado; se confirma que sigue igual.

---

## 2. API (`api/`) — smoke E2E

`npm run test:e2e` (jest-e2e.json, arranca la `AppModule` completa vía `Test.createTestingModule`):

```
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

Verifica `GET /api/health` → `200` con `{ status: 'ok', ts: <ISO string> }`.

---

## 3. Web (`web/`) — pruebas unitarias (Vitest)

```
Test Files  3 passed (3)
     Tests  11 passed (11)
```

| Archivo | Qué cubre |
|:--------|:----------|
| `lib/__tests__/api.spec.ts` | Interceptor de refresh de `apiRequest()`: reintento tras 401, exclusión de endpoints de auth, logout si el refresh falla, deduplicación de refreshes concurrentes |
| `hooks/__tests__/usePipeline.spec.tsx` | `useMovePipeline()` — optimistic update antes de la respuesta del servidor + rollback si la transición es rechazada |
| `components/__tests__/ProtectedRoute.spec.tsx` | El único guard de rutas de la app: redirige a `/login` sin sesión o con token corrupto, renderiza children con sesión válida |

### Cobertura

```
Statements   : 1.02% ( 48/4688 )
Branches     : 0.89% ( 37/4153 )
Functions    : 0.74% ( 12/1614 )
Lines        : 1.08% ( 43/3972 )
```

Este número bajo es **esperado, no un problema nuevo**: hasta esta sesión `web/` tenía 0 tests en absoluto (`revisionpruebas.md` anterior lo señalaba como Hallazgo). Los 3 archivos con test propio (`lib/api.ts`, `hooks/usePipeline.ts`, `components/ProtectedRoute.tsx`) están cubiertos al 62-100%; el resto de `web/src` (~20 hooks, ~30 páginas, ~10 componentes, `authStore.ts`) sigue sin ninguna prueba automatizada — es la base de partida documentada en P3.10, no una regresión.

Se instaló `@vitest/coverage-v8` y se configuró `test.coverage.include: ['src/**/*.{ts,tsx}']` en `vite.config.ts` para que el reporte mida contra **todo** `src/`, no solo los archivos tocados por algún test (de lo contrario el % reportado habría sido engañosamente alto, ~80%, al ignorar todo lo no instrumentado).

---

## 4. Portal (`portal/`) — pruebas unitarias (Vitest)

```
Test Files  2 passed (2)
     Tests  6 passed (6)
```

| Archivo | Qué cubre |
|:--------|:----------|
| `components/__tests__/RegistroInteresForm.spec.tsx` | Formulario público de registro de interés (`POST /api/public/registro`): abrir/cerrar, envío exitoso con el body correcto, mensaje de error del backend |
| `app/verificar/__tests__/VerificarClient.spec.tsx` | Verificación de email (`POST /api/public/verificar-email`): sin token no llama al API, token válido confirma y muestra el nombre, token inválido/expirado muestra el error |

### Cobertura

```
Statements   : 12.61% ( 54/428 )
Branches     : 11.53% ( 36/312 )
Functions    : 6.97% ( 9/129 )
Lines        : 14.04% ( 50/356 )
```

Dos advertencias no fatales durante la recolección de cobertura: `politica-privacidad/page.tsx` y `mi-cuenta/verify/page.tsx` (Server Components de Next) no pudieron ser parseados por el remapper de `@vitest/coverage-v8` (usa `rolldown`, que no soporta cierta sintaxis de RSC de Next 16 aislada de su pipeline) — se excluyen automáticamente del reporte con un warning, no rompen la corrida. Es una limitación conocida de medir cobertura de componentes de servidor con herramientas pensadas para Vite/SPA, no un bug de las pruebas.

---

## 5. E2E Cypress (`web/cypress/`)

**Corridas por primera vez en esta sesión contra la app real (API + Vite dev server) en la DB aislada**, en vez de solo confirmarse por lectura de código + CI:

```
✔  01-auth.cy.ts                    5/5
✔  02-propiedades.cy.ts             4/4
✔  03-pipeline.cy.ts                2/2
✔  04-agenda.cy.ts                  2/2
✔  05-clientes.cy.ts                3/3
✔  06-busqueda-global.cy.ts         3/3
✔  07-pipeline-transiciones.cy.ts   1/1
✔  08-rbac-clientes.cy.ts           2/2
   ────────────────────────────────
   All specs passed!               22/22   (32s)
```

**Nota importante — corrección de una nota anterior**: sesiones previas de este barrido asumían que Cypress estaba roto en este entorno Windows (`npx cypress verify` fallaba con `bad option: --smoke-test`). La causa real es que este shell tiene `ELECTRON_RUN_AS_NODE=1` seteado globalmente, lo que hace que el binario de Cypress (basado en Electron) arranque como Node puro. Con `env -u ELECTRON_RUN_AS_NODE` antes de cualquier invocación de Cypress, **funciona perfectamente** — ya estaba documentado en memoria (`project_electron_run_as_node_cypress`) de una sesión anterior; este barrido lo reconfirma de punta a punta corriendo la suite completa, no solo `cypress verify`.

---

## 6. Mobile (`mobile/`)

**0 tests.** Sin cambios respecto al barrido anterior — fuera de alcance de esta tarea (no se agregó tooling de testing a Expo/React Native en esta sesión).

---

## 7. Lint

- **`api/`**: limpio — 4 warnings cosméticos preexistentes (`@typescript-eslint/no-unsafe-argument` en `import.service.ts` y `sindicacion.service.ts`), 0 errores.
- **`web/`**: limpio. Se corrigió un hallazgo menor de este barrido: correr `vitest run --coverage` genera `web/coverage/` (reporte HTML), y ESLint no lo ignoraba — lint reportaba 3 warnings sobre archivos generados (`coverage/block-navigation.js`, etc.). Se agregó `coverage` a `globalIgnores` en `eslint.config.js`, igual que ya se ignoraba `dist`.
- **`portal/`**: `npm run lint` (`next lint`) **falla en este entorno** con `Invalid project directory provided, no such directory: ...\portal\lint`. Confirmado con `git stash` que el problema existe igual en `master` sin ninguno de los cambios de esta sesión — es una incompatibilidad de la actualización a Next.js 16 con este entorno Windows local, no algo introducido por las pruebas. Sigue sin arreglarse (fuera de alcance de un barrido de pruebas).

---

## 8. Build

`npm run build:api`, `npm run build:web`, `npm run build:portal` — los tres compilan limpio (incluye el type-check de `tsc -b` / `next build`).

Se encontró y corrigió un error de tipos introducido por la config de cobertura agregada en este barrido: la opción `coverage.all: true` no existe en el tipo `CoverageOptions` de la versión de Vitest instalada (`^4.1.10`) — se agregó por costumbre de versiones anteriores de Vitest, donde era necesaria para incluir archivos sin cobertura en el reporte. En esta versión el reporte ya incluye todos los archivos que matchean `coverage.include` por defecto (se confirmó que el reporte no cambia al quitar `all: true`), así que se eliminó la opción de `web/vite.config.ts` y `portal/vitest.config.ts` — el error solo aparecía en `tsc -b`/`next build` (que sí type-chequean `vite.config.ts`/`vitest.config.ts`), no al correr `vitest run` directamente.

---

## 9. Confirmación en CI real (GitHub Actions)

Corrida más reciente en `master` al momento de este barrido — run [`30108992846`](https://github.com/marubienesyraices/maru-crm/actions/runs/30108992846), commit `9f60c65` (el mismo commit que agregó Vitest a `web/`/`portal/`, el smoke test de `/api/health`, y el job manual de k6):

```
✓ Lint & Build            2m4s
✓ E2E Tests (Cypress)     3m24s
✓ Unit Tests              2m27s
- k6 Load Tests           0s   (correctamente en espera — solo corre con workflow_dispatch)
```

Los tres jobs automáticos en verde. El job `k6` no corrió porque está gateado a disparo manual, tal como se diseñó — no es una falla.

Anotaciones no bloqueantes: GitHub avisa que `actions/checkout@v4` / `actions/setup-node@v4` corren forzados en Node 24 porque targetean Node 20 (deprecado por GitHub, no por este repo) — housekeeping menor, no afecta el resultado de las pruebas.

---

## Conclusión

Todas las suites de pruebas del sistema (API unitarias, API smoke e2e, Web unitarias, Portal unitarias, Cypress E2E) pasan al 100% localmente contra una base de datos aislada y recién sembrada, y el estado se replica en la corrida más reciente de CI real. La cobertura de `api/` (77.3% statements) es sólida y por encima del umbral configurado; `web/` (1.02%) y `portal/` (12.6%) reflejan honestamente que la inversión en pruebas ahí recién comenzó esta sesión (antes era 0% en ambos) — quedan como la brecha más grande del sistema, junto con `mobile/` (0%), para una próxima ronda de trabajo si se decide seguir invirtiendo en esa dirección.
