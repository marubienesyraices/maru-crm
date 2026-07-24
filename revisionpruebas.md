# Revisión de Pruebas — GestProp CRM

> Fecha de revisión: 24-jul-2026 · Alcance: `api/` (unitarias + seguridad OWASP), `web/` (Cypress E2E), `infra/k6/` (carga), `portal/` y `mobile/` (ausencia de pruebas).
> Metodología: no solo se leyó el código de las pruebas — se ejecutó la suite completa localmente, se inspeccionó el reporte de cobertura archivo por archivo, y se revisaron las últimas ejecuciones reales de GitHub Actions (`gh run view`) para confirmar qué pasa y qué falla en CI de verdad, no solo en local.

---

## Resumen ejecutivo

| Señal | Estado |
|:------|:-------|
| Lint & Build (CI) | ✅ Verde (arreglado en sesión anterior) |
| **Unit Tests (CI real)** | ✅ **Corregido** (P0, ver abajo) — validado localmente con Postgres+Redis reales, 529/529 |
| **E2E Cypress (CI real)** | ✅ **Corregido** (P0, ver abajo) — API confirmada arrancando y respondiendo `/api/health` |
| Unit Tests (local, con `.env` completo) | ✅ 530/530 (529 + 1 test nuevo del P1) |
| Cobertura de líneas (API) | 69.9% (umbral configurado: 65%) |
| Cobertura de funciones (API) | 48.5% — la más débil de las 4 métricas |
| E2E Cypress | 6 suites / ~29 casos, todos "smoke tests" superficiales |
| Suite OWASP — credenciales y aserciones vacías | ✅ **Corregido** (P1, ver abajo) |
| Pruebas de carga k6 | ✅ Credenciales corregidas (P1) — sigue sin integrarse en CI |
| Unit tests en `web/` (componentes/hooks) | **0** |
| Tests automatizados en `portal/` y `mobile/` | **0** |

**El hallazgo más importante de esta revisión no está en la cobertura, está en que el pipeline de CI real (GitHub Actions) lleva rato en rojo por una sola causa raíz que nadie había notado porque el job de Lint fallaba primero y ocultaba todo lo que venía después.** Ver Hallazgo #1.

---

## Hallazgo #1 (crítico) — CI real rota: falta `MASTER_ENCRYPTION_KEY`

**Confirmado ejecutando `gh run view` sobre la corrida más reciente (`30060398408`, commit `bed9156`):**

```
Lint & Build     ✓  1m44s
E2E Tests        ✗  2m26s   (falla en "Wait for services")
Unit Tests       ✗  1m3s    (falla en "Run API Tests")
```

### Causa raíz (una sola, para ambos jobs)

`EncryptionService` (`api/src/common/encryption/encryption.service.ts:13-21`) exige `MASTER_ENCRYPTION_KEY` (64 chars hex) y **lanza `InternalServerErrorException` en el constructor** si falta:

```ts
const raw = config.get<string>('MASTER_ENCRYPTION_KEY');
if (!raw || raw.length !== 64) {
  throw new InternalServerErrorException('MASTER_ENCRYPTION_KEY must be a 64-char hex string...');
}
```

`.github/workflows/ci.yml` **nunca define esta variable**, ni en el job `test` ni en el job `e2e` — a diferencia de `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, que sí están. `.env.example` documenta la variable como requerida desde que se introdujo el cifrado de credenciales de integraciones (commit `884413b`, *feat: multi-tenant portal config, per-tenant credentials...*).

**Efecto en el job `test` (Unit Tests):**
```
FAIL src/__tests__/security/owasp.security.spec.ts (6.256 s)
InternalServerErrorException: MASTER_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)...
Test Suites: 1 failed, 37 passed, 38 total
Tests:       20 failed, 509 passed, 529 total
```
Solo la suite OWASP falla (es la única que hace `Test.createTestingModule({ imports: [AppModule] })` y arranca la app completa; el resto de specs mockean `PrismaService`/dependencias y nunca instancian `EncryptionService`).

**Efecto en el job `e2e` (Cypress):**
```
Start API (background)  → nest start --watch  (crashea al resolver EncryptionModule)
Wait for services        → Error: Timed out waiting for: http://localhost:3000/api/health
```
La API nunca boota, `wait-on` agota el timeout de 60s, Cypress nunca llega a ejecutarse.

### ¿Desde cuándo?

Se revisaron corridas históricas: **todas las ejecuciones de CI desde al menos el 18-jul-2026 están en rojo.** Antes de esta sesión, el job `Lint & Build` fallaba primero (por los ~1500 errores de tipado que se corrigieron en las sesiones anteriores) y, como `test`/`e2e` dependen de `needs: lint-build`, **nunca llegaban a ejecutarse** — por eso este problema nunca se vio. Al arreglar el lint en esta sesión, el pipeline avanzó y expuso una rotura que ya existía, oculta, desde que se agregó el módulo de cifrado.

### Fix aplicado ✅

Se agregó `MASTER_ENCRYPTION_KEY` (64 hex chars fijos, no es un secreto real — solo necesita pasar la validación de formato) al `env:` de los jobs `test` y `e2e` en `.github/workflows/ci.yml`.

Al investigar el fix se descubrió que **no bastaba con la variable**: el job `test` nunca tuvo Postgres/Redis (a diferencia de `e2e`), así que aunque `EncryptionService` dejara de fallar, `owasp.security.spec.ts` habría chocado a continuación con `PrismaService` («DATABASE_APP_URL or DATABASE_URL environment variable is required» — mismo patrón de constructor que lanza síncronamente). Por eso el job `test` ahora también levanta `postgres:16-alpine` + `redis:7-alpine` como *services*, corre `prisma migrate deploy` + el seed, y pasa `DATABASE_URL`/`REDIS_URL`/`JWT_*`/`MASTER_ENCRYPTION_KEY` al paso `Run API Tests` — el mismo patrón que ya usaba el job `e2e`.

**Validado localmente** (no solo leído) creando un rol+DB Postgres aislados (`gestprop_test`/`gestprop_crm_test`) dentro del contenedor de desarrollo existente, replicando exactamente las variables de entorno que quedaron en `ci.yml`, y corriendo:
- `npx jest src/__tests__/security/owasp.security.spec.ts` → 20/20 passed (antes: 20/20 failed).
- Suite completa `npx jest --ci --coverage` → 38/38 suites, 529/529 tests.
- `npx nest start` con las variables del job `e2e` → la API arrancó y `GET /api/health` respondió `{"status":"ok"}` (antes: la API crasheaba al resolver `EncryptionModule` y `wait-on` agotaba el timeout de 60s).

La base de datos y el rol de prueba temporales se eliminaron después de validar; no se tocó la base de datos de desarrollo real.

---

## Hallazgo #2 (alto) — La suite OWASP tiene pruebas que nunca prueban nada

Independiente del Hallazgo #1 (que hace fallar la suite entera), **incluso si `MASTER_ENCRYPTION_KEY` se arregla, 4 de los ~20 casos de `owasp.security.spec.ts` seguirían sin validar nada real**, por un problema de datos de prueba:

```ts
const ADMIN_CREDENTIALS = { email: 'admin@demo.com', password: 'Admin1234!' };
```

Este usuario **no existe** en el seed real (`prisma/seed.ts` crea `admin@gestprop.net` / `Admin@2026Desa`). Se verificó de forma empírica instrumentando el test: `loginAs()` devuelve `token = undefined`.

Los 4 tests que dependen de `loginAs()` tienen el patrón:
```ts
const token = await loginAs(app);
if (!token) return; // Skip if login fails in test env
```
Es decir, **si el login falla, el test termina sin ninguna aserción y Jest lo reporta como "passed"**. Esto aplica a:
- `A01 — should reject IDOR — accessing other tenant resources via path manipulation` (nunca prueba IDOR)
- `A02 — should not return password hash in user responses` (nunca verifica que el hash no se filtre)
- `A03 — should sanitize SQL injection attempts in search query` (nunca prueba los payloads SQL)
- `A03 — should handle NoSQL-like injection in request body` (nunca prueba el payload)

Es decir, la mitad de las categorías OWASP marcadas como "✅ Completo" en `estadoproyecto.md` (A01 IDOR, A02 exposición de hash) en realidad **no se están verificando en absoluto** — el CI las reporta en verde por diseño accidental (skip silencioso), no porque la protección se haya comprobado.

**Bonus — un test que no prueba lo que dice su nombre:**
```ts
it('should block account after 5 failed login attempts', async () => {
  const firstRes = await request(app.getHttpServer()).post('/api/auth/login').send(badCreds);
  expect([401, 400]).toContain(firstRes.status);
});
```
Solo hace **un** intento de login y verifica que devuelva 401/400 — nunca verifica el bloqueo tras 5 intentos que el nombre promete. Al investigar el fix se encontró que **el mecanismo real no es "5 intentos"**: `handleFailedLogin()` en `auth.service.ts` (línea ~571) bloquea la cuenta progresivamente — 3 intentos fallidos → 15 min, 6 → 1 hora, 9 → indefinido (requiere desbloqueo manual de un admin). Es un bloqueo **por cuenta** (campos `intentos_login`/`bloqueado_hasta` en `users`), distinto del `ThrottlerGuard` por IP que protege el endpoint `/api/auth/login` (20 intentos/15min en producción, 200 en no-producción — ver `auth.controller.ts`). Ninguno de los dos mecanismos reales tenía una prueba que los verificara.

### Fix aplicado ✅
1. `ADMIN_CREDENTIALS` ahora usa `admin@gestprop.net` / `Admin@2026Desa` (el admin real del seed).
2. Los 4 `if (!token) return;` ahora lanzan `throw new Error(...)` con un mensaje diagnóstico — un login fallido rompe el test en vez de silenciarlo.
3. El test de "bloqueo" se reescribió para verificar el mecanismo **real**: 3 intentos fallidos contra una cuenta seed dedicada (`pedro.junior@gestprop.net`, no la usada por `ADMIN_CREDENTIALS`, para no bloquear la cuenta que usan los otros tests) devuelven 401, y el 4to intento devuelve 403 (bloqueada). Se dejó como test separado y explícito que el *primer* intento contra un email inexistente no dispara el throttle (sigue siendo 401/400, no 429).

**Validado localmente** con la misma metodología del Hallazgo #1 (DB Postgres aislada y recién sembrada, para que el bloqueo del test no interfiera con corridas anteriores): suite completa `owasp.security.spec.ts` → 21/21 passed; suite completa del API → 530/530 passed.

---

## Hallazgo #3 (medio) — Pruebas de carga k6 rotas por el mismo tipo de problema

`infra/k6/auth.js` y `infra/k6/pipeline.js` usan las mismas credenciales inexistentes:
```js
JSON.stringify({ email: 'admin@demo.com', password: 'Admin1234!' })
```
En `pipeline.js`, el flujo es:
```js
export function setup() { return { token: getToken() }; }  // getToken() devuelve null si login falla
export default function ({ token }) {
  if (!token) { sleep(1); return; }  // toda iteración duerme y sale — nunca golpea /api/pipeline, /api/clientes, /api/notificaciones
  ...
}
```
Es decir, **estos scripts nunca han probado carga real** contra los endpoints que dicen probar — solo miden cuánto tarda un login que siempre falla. `portal-publico.js` no requiere login y probablemente sí funciona (no se verificó credenciales ahí).

Además, **k6 no está integrado en ningún workflow de CI** (`grep k6 .github/workflows/*.yml` no devuelve nada) — son scripts de ejecución manual (`k6 run infra/k6/auth.js`), así que este problema pudo pasar desapercibido fácilmente.

### Fix aplicado ✅
Se corrigieron las credenciales en `auth.js` y `pipeline.js` (`admin@gestprop.net` / `Admin@2026Desa`). `portal-publico.js` no necesitaba cambios (no requiere login). Se validó la sintaxis con `node --check` (no hay `k6` instalado localmente para correrlos de verdad).

Sigue pendiente (no es parte de este fix): k6 no está integrado en CI — considerar agregar un job manual (`workflow_dispatch`) que los ejecute contra un ambiente de staging.

---

## Cobertura de pruebas unitarias (API) — detalle

Ejecutado localmente con `.env` completo: **529/529 tests, 38 suites, 0 fallos.**

```
Statements   : 69.59% ( 4146/5957 )
Branches     : 57.35% ( 2137/3726 )
Functions    : 48.54% (  433/892  )   ← la métrica más débil, con margen
Lines        : 69.94% ( 3723/5323 )
```

El umbral configurado en `api/package.json` (`coverageThreshold`) es 65% statements/lines, 50% branches, 45% functions — el proyecto pasa el umbral, pero por poco margen en `functions` y `branches`.

### Patrón estructural: solo los `*.service.ts` tienen pruebas dedicadas

Se comparó cada `*.service.ts` / `*.controller.ts` / `*.scheduler.ts` / `*.processor.ts` / `*.guard.ts` contra la existencia de un spec con su mismo nombre en `__tests__/`:

| Tipo de archivo | Con spec propio | Sin spec propio |
|:-----------------|:---:|:---:|
| `*.service.ts` | 34 | 4 (`email-triggers`, `notificacion-preferencias`, `config-sistema`, `pdf-render`) |
| `*.controller.ts` | 0 | ~30 |
| `*.scheduler.ts` | 1 (`documentos.scheduler`) | 5 (`pipeline`, `propiedades`, `visitas`, `audit-archive`, `tenants`) |
| `*.processor.ts` | 0 | 2 (`brochure.processor`, `meta.processor`) |
| `*.guard.ts` | 3 (`plan`, `roles`, `visibility`) | 2 (`jwt-auth`, `cliente-jwt`) |

**Ningún controller tiene un spec unitario propio.** La cobertura que sí aparece en algunos controllers (60-90% en `propiedades.controller.ts`, `clientes.controller.ts`, etc.) no viene de pruebas de sus reglas de negocio — viene indirectamente de que `owasp.security.spec.ts` levanta la `AppModule` completa y hace ~10 peticiones HTTP contra un puñado de rutas (`/api/propiedades`, `/api/users`, `/api/search`, `/api/health`, `/api/audit`). Por eso el **function coverage** de los controllers es tan bajo (8-33%) pese a un statement coverage aparentemente decente: se ejecuta la ruta feliz de 1-2 endpoints, el resto de métodos (crear, actualizar, borrar, transiciones de estado) nunca se llama desde ninguna prueba.

### Archivos con menor cobertura (statements)

| Archivo | Stmt | Branch | Func | Nota |
|:--------|-----:|-------:|-----:|:-----|
| `modules/brochure/brochure.service.ts` | 14% | 13% | 37% | Genera PDFs — lógica central sin cubrir |
| `modules/pipeline/pipeline.scheduler.ts` | 17% | 13% | 8% | Cron de inactividad de leads — sin spec propio |
| `modules/documentos/carta-comision.controller.ts` | 23% | 15% | 17% | |
| `modules/documentos/pdf-render.service.ts` | 25% | 0% | 14% | |
| `modules/propiedades/propiedades.scheduler.ts` | 26% | 20% | 13% | Cron de auto-publicación/estancamiento — sin spec propio |
| `modules/upload/upload.controller.ts` | 27% | 18% | 8% | |
| `modules/config-sistema/config-sistema.service.ts` | 33% | 26% | 17% | **Módulo entero sin ningún test** (ver abajo) |
| `common/decorators/current-user.decorator.ts` | 33% | 0% | 0% | |
| `modules/portal/cliente-jwt.guard.ts` | 33% | 38% | 50% | Guard de autenticación del portal de clientes — riesgo si falla |
| `modules/visitas/visitas.scheduler.ts` | 36% | 59% | 20% | |
| `modules/email/email.service.ts` | 40% | 34% | 46% | |
| `modules/users/users.service.ts` | 40% | 34% | 47% | |
| `modules/tenants/tenants.service.ts` | 41% | 43% | 40% | |

### Módulo completo sin ninguna prueba: `config-sistema`

`api/src/modules/config-sistema/` (controller + service + dto) es el **único módulo de los 32 en `src/modules/` sin ningún directorio `__tests__/`**. Gestiona la configuración global de Resend/email del sistema (usada como fallback de todos los tenants) — es infraestructura sensible sin ninguna cobertura.

### `main.ts` / `instrument.ts` en 0%
Es normal y esperable — son el bootstrap y la inicialización de Sentry, no se testean unitariamente en ningún proyecto NestJS típico. No es un hallazgo, se menciona solo para que no distraiga al leer la tabla completa de cobertura.

---

## Pruebas E2E (Cypress) — 6 suites, cobertura superficial

```
01-auth.cy.ts             9 casos
02-propiedades.cy.ts      5 casos
03-pipeline.cy.ts         3 casos
04-agenda.cy.ts           3 casos
05-clientes.cy.ts         5 casos
06-busqueda-global.cy.ts  4 casos
                         ────────
                         29 casos
```

Todos son **smoke tests de navegación** ("muestra el listado", "navega al formulario", "crea un registro vía API y aparece en el listado"). Ninguno verifica:

- **Reglas de negocio de la máquina de estados** — Pipeline solo verifica que las columnas y tarjetas se muestren, no que `NUEVO → CONTACTADO → ... → GANADO/PERDIDO` funcione, ni el modal de CIERRE con documentos obligatorios, ni que mover a `EN_NEGOCIACION` reserve la propiedad.
- **Permisos por rol (RBAC)** — ningún test verifica que un JUNIOR no vea clientes de otros agentes, que un SENIOR sí vea su downline, o que rutas de ADMIN estén bloqueadas para roles menores.
- **Multi-tenancy / RLS** desde el navegador (dos tenants, un usuario no debería ver datos del otro).
- Módulos completos sin ningún E2E: **Portal público, BI/Ranking, Campañas de email, Meta, Sindicación, Firma Digital, Videollamadas, Admin (usuarios/tenants/organigrama), Auditoría, Import CSV, todas las páginas de Settings, Tareas, Horarios, 2FA, onboarding.**

No es necesariamente un problema — 29 smoke tests que corren en cada push tienen valor real (detectan rupturas de build/routing/render), pero **no reemplazan pruebas de reglas de negocio**, que hoy solo viven (parcialmente) en los specs de `*.service.ts` del API.

---

## Ausencia total de pruebas: `web/`, `portal/`, `mobile/`

- **`web/`**: cero tests unitarios de componentes, hooks (`usePropiedades`, `usePipeline`, `useVisitas`, etc.) o stores (`authStore`). Toda la lógica de mutaciones optimistas, invalidación de queries, y transformación de datos en los ~20 hooks de `web/src/hooks/` no tiene ninguna prueba automatizada fuera de los smoke tests de Cypress.
- **`portal/`** (Next.js, público): 0 tests. Es la superficie que ve cualquier visitante no autenticado — registro de clientes, chatbot de leads, verificación de email, Mi Cuenta con Google OAuth — sin ninguna prueba.
- **`mobile/`** (Expo): 0 tests. Login 2FA, modo offline con caché, push notifications — sin ninguna prueba.

---

## Deuda menor de pruebas (housekeeping)

- **`api/test/app.e2e-spec.ts`** es el boilerplate por defecto que genera `nest new` (prueba que `GET /` devuelva `"Hello World!"`). Esta ruta no existe en la app real (todo vive bajo `/api/*`), así que si alguien corriera `npm run test:e2e` hoy, fallaría. No se ejecuta en CI ni en ningún script de desarrollo — es código muerto que puede eliminarse o actualizarse.
- Advertencias de lint pendientes (no bloquean CI, 4 en total): `no-unsafe-argument` en `import.service.ts:336,353` y `sindicacion.service.ts:449,450` — parámetros `any` pasados a funciones tipadas. Bajo riesgo, cosmético.

---

## Recomendaciones priorizadas

### P0 — Desbloquear CI ✅ Aplicado
1. ~~Agregar `MASTER_ENCRYPTION_KEY`...~~ — Hecho. Además se agregaron los *services* `postgres`/`redis`, migración y seed al job `test` (no los tenía). Validado localmente y **confirmado en la corrida real de GitHub Actions** (run `30061947586`, commit `9390512`): `Lint & Build` ✓ 1m39s, `E2E Tests (Cypress)` ✓ 2m19s, `Unit Tests` ✓ 1m37s — los tres jobs en verde por primera vez desde al menos el 18-jul-2026.

### P1 — Cerrar huecos de falsa confianza en seguridad ✅ Aplicado
2. ~~Corregir credenciales en `owasp.security.spec.ts`~~ — Hecho, ahora usa `admin@gestprop.net`/`Admin@2026Desa` (real del seed).
3. ~~Cambiar los 4 `if (!token) return;`~~ — Hecho, ahora lanzan `Error` con mensaje diagnóstico.
4. ~~Reescribir el test de "bloqueo tras 5 intentos"~~ — Hecho, pero el mecanismo real resultó ser distinto al asumido (ver Hallazgo #2 actualizado): 3 intentos → 15min, no 5. El test nuevo verifica el mecanismo real contra una cuenta seed dedicada.
5. ~~Corregir credenciales stale en `infra/k6/auth.js` y `infra/k6/pipeline.js`~~ — Hecho.

Validado: suite completa del API 530/530 en una DB Postgres aislada recién sembrada (misma metodología del P0). Pendiente: confirmar en la corrida real de CI tras el push.

### P2 — Cerrar huecos de cobertura de mayor riesgo de negocio
6. Agregar specs a los schedulers (`pipeline.scheduler`, `propiedades.scheduler`, `visitas.scheduler`) — corren desatendidos en producción y hoy casi no tienen cobertura.
7. Agregar spec a `config-sistema.service.ts` (único módulo sin ninguna prueba).
8. Agregar spec a `brochure.service.ts` y `pdf-render.service.ts` (14-25% de cobertura en lógica que genera documentos legales/comerciales).
9. Expandir Cypress con al menos: transición completa del pipeline (incluyendo modal CIERRE), y un caso de RBAC (JUNIOR no debería ver clientes ajenos).

### P3 — Inversión estructural (a más largo plazo)
10. Introducir Vitest + Testing Library en `web/` para los hooks de datos y componentes con lógica no trivial.
11. Smoke tests mínimos en `portal/` (registro de cliente, verificación de email) dado que es superficie pública.
12. Eliminar `api/test/app.e2e-spec.ts` (código muerto) o convertirlo en un smoke test real de `/api/health`.
13. Automatizar k6 como job manual (`workflow_dispatch`) en CI una vez corregidas las credenciales.
