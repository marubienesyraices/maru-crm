# Planes de Funcionalidad — Análisis e Implementación

## Resumen de planes

| Plan       | Usuarios | Propiedades | Correo | Campañas email | Portal público | Sitio propio | Integraciones |
|------------|----------|-------------|--------|----------------|----------------|--------------|---------------|
| Free       | 1        | 5           | No     | No             | No             | No           | No            |
| Basic      | 3        | 25          | Sí     | No             | Sí             | No           | No            |
| Pro        | 5        | 100         | Sí     | Sí             | Sí             | Sí           | No            |
| Enterprise | 25       | 500         | Sí     | Sí             | Sí             | Sí           | Sí            |

---

## Estado actual — Qué ya está implementado

| Restricción | Estado | Dónde |
|-------------|--------|-------|
| Límite de usuarios | ✅ Implementado | `UsersService.create()` compara contra `tenant.limite_usuarios` |
| Límite de propiedades | ✅ Implementado | `PropiedadesService.create()` compara contra `tenant.limite_propiedades` |
| Enum `Plan` en Prisma | ⚠️ Incompleto | Solo tiene `FREE`, `PRO`, `ENTERPRISE` — falta `BASIC` |
| Valores por defecto de límites al crear tenant | ⚠️ Incorrecto | Hardcodeados en 10 usuarios / 100 propiedades sin considerar el plan elegido |
| Correo transaccional (FREE bloqueado) | ❌ No implementado | `EmailService` no verifica plan |
| Campañas email (solo PRO/ENTERPRISE) | ❌ No implementado | `CampanasController` no tiene guardia de plan |
| Portal público (solo BASIC/PRO/ENTERPRISE) | ❌ No implementado | `ConfigPortalController` no verifica plan |
| Sitio propio — dominio/subdominio (solo PRO/ENTERPRISE) | ❌ No implementado | `ConfigPortalService.update()` no restringe campos |
| Integraciones (solo ENTERPRISE) | ❌ No implementado | `ConfigIntegracionesController` no tiene guardia de plan |
| Sidebar frontend filtrado por plan | ❌ No implementado | Solo filtra por rol, no por plan |

---

## Detalle por funcionalidad

---

### 1. Límite de usuarios y propiedades

**Qué hace:** Limita cuántos usuarios activos y propiedades puede tener una empresa.

**Estado:** Los límites ya se validan al crear usuarios y propiedades. El problema es que al crear un tenant se guardan valores hardcodeados (10 / 100), en lugar de los valores del plan elegido.

**Qué falta:**

**Backend — `api/src/modules/tenants/tenants.service.ts`:**
Cuando se crea un tenant, derivar los límites automáticamente del plan seleccionado:

```typescript
const PLAN_LIMITS = {
  FREE:       { usuarios: 1,  propiedades: 5   },
  BASIC:      { usuarios: 3,  propiedades: 25  },
  PRO:        { usuarios: 5,  propiedades: 100 },
  ENTERPRISE: { usuarios: 25, propiedades: 500 },
};
```

Si el SUPER_ADMIN no especifica límites manualmente, deben aplicarse los del plan. Si los especifica manualmente (campo `limiteUsuarios` / `limitePropiedades` en el DTO), se respeta el valor personalizado.

También aplicar la misma lógica al **cambiar de plan**: si un tenant cambia de PRO a BASIC, sus límites deberían actualizarse automáticamente (a menos que ya tengan valores personalizados menores).

---

### 2. Enum `BASIC` faltante en Prisma

**Qué hace:** El plan BASIC aparece en la UI y los DTOs pero no está definido en el enum `Plan` de Prisma/PostgreSQL.

**Estado:** Actualmente si se guarda un tenant con `plan: 'BASIC'`, Prisma lanza un error en runtime.

**Qué falta:**

**`api/prisma/schema.prisma`:**
```prisma
enum Plan {
  FREE
  BASIC      // ← agregar
  PRO
  ENTERPRISE
}
```

Luego ejecutar `npx prisma migrate dev --name add_basic_plan`.

---

### 3. Correo transaccional (FREE = sin email)

**Qué hace:** Los tenants FREE no deben recibir ni enviar ningún correo electrónico (ni activación de usuarios, ni recordatorios de visitas, ni alertas de leads inactivos, ni notificaciones de documentos).

**Impacto en codebase:** `EmailService` (`api/src/modules/email/email.service.ts`) es llamado desde:
- `UsersService.create()` — email de bienvenida/activación
- `TenantsScheduler.expireTrials()` — (no envía email, no aplica)
- `VisitasScheduler` — recordatorios de visitas a clientes
- `PipelineScheduler` — alertas de inactividad
- `DocumentosScheduler` — alertas de documentos vencidos

**Qué falta:**

**Backend — `api/src/modules/email/email.service.ts`:**
Agregar método de verificación de plan antes de enviar:

```typescript
async canSendEmail(tenantId: string): Promise<boolean> {
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  return tenant?.plan !== 'FREE';
}
```

Llamar este método en `sendTransactionalEmail()` y `sendClientEmail()` antes de procesar.

Alternativa más eficiente: agregar el plan al objeto tenant cacheado en Redis (si existe caché de tenant), o simplemente hacer el check inline en cada servicio que use email.

---

### 4. Campañas email (solo PRO y ENTERPRISE)

**Qué hace:** El módulo de campañas de email (plantillas, campañas, envíos masivos) solo debe estar disponible para PRO y ENTERPRISE.

**Impacto:** Bloquear acceso a:
- `GET/POST/PUT/DELETE /api/campanas/*` — backend
- `/campanas` — ruta frontend
- Ítem "Campañas" en el sidebar

**Qué falta:**

**Backend — nuevo guardia de plan:**
Crear `api/src/common/guards/plan.guard.ts`:

```typescript
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const planes = this.reflector.get<string[]>('planes', context.getHandler())
                ?? this.reflector.get<string[]>('planes', context.getClass());
    if (!planes?.length) return true;

    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId;
    if (!tenantId) return false;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });
    return planes.includes(tenant?.plan ?? '');
  }
}
```

Crear decorador `@Plans('PRO', 'ENTERPRISE')` y aplicarlo en `CampanasController`.

**Frontend — `web/src/components/AppLayout.tsx`:**
El sidebar necesita conocer el plan del tenant. Opciones:
- Añadir `plan` al estado de autenticación (fetch de `/api/tenants/mi-tenant` al login)
- O llamar el endpoint una vez al montar AppLayout y guardarlo en estado local

Luego filtrar el ítem "Campañas" para solo mostrarlo si `plan === 'PRO' || plan === 'ENTERPRISE'`.

**Frontend — `web/src/App.tsx`:**
Agregar componente `PlanRoute` que redirige a una página "Plan insuficiente" si el usuario intenta navegar directamente a `/campanas` sin el plan correcto.

---

### 5. Portal público (solo BASIC, PRO y ENTERPRISE)

**Qué hace:** Tenants FREE no tienen portal público. El portal de propiedades (`/portal`, `/portal/:id`) muestra las propiedades de un tenant al público general. Para FREE, este portal no debe existir.

**Impacto:** Bloquear acceso a:
- `GET /api/config-portal` (edición de config del portal) — backend
- El portal público en Next.js (`portal/`) ya tiene `portal_activo` que puede usarse
- Ítem "Mi Portal" y "Portal público" en el sidebar

**Qué falta:**

**Backend — `api/src/modules/config-portal/config-portal.service.ts`:**
En el método de actualización de configuración del portal, verificar que el plan sea BASIC o superior. Para FREE, devolver error.

En el endpoint público que resuelve por dominio/subdominio (`getByHost`), si `tenant.plan === 'FREE'`, retornar 404 o `{ portal_activo: false }`.

**Frontend — `portal/` (Next.js):**
En la página de detalle de propiedad y el listado, verificar `portal_activo` y `plan`. Si el tenant tiene plan FREE, mostrar página de "Portal no disponible".

**Frontend — `web/src/components/AppLayout.tsx`:**
Ocultar "Mi Portal" y "Portal público" en el sidebar cuando `plan === 'FREE'`.

---

### 6. Sitio propio — subdominio y dominio personalizado (solo PRO y ENTERPRISE)

**Qué hace:** PRO y ENTERPRISE pueden configurar un subdominio propio (ej. `miinmobiliaria.gestprop.net`) y un dominio personalizado (ej. `www.miinmobiliaria.com`). BASIC solo tiene el portal bajo el dominio genérico de GestPro.

**Impacto:** Bloquear los campos `subdominio` y `dominio_personalizado` del formulario de config portal.

**Qué falta:**

**Backend — `api/src/modules/config-portal/config-portal.service.ts`:**
En `update()`, antes de guardar, verificar el plan:
- Si `plan === 'FREE'`: rechazar toda actualización del portal (plan no incluye portal)
- Si `plan === 'BASIC'`: aceptar la actualización pero ignorar/rechazar `subdominio` y `dominio_personalizado`
- Si `plan === 'PRO'` o `'ENTERPRISE'`: aceptar todo

**Frontend — `web/src/pages/Settings/SettingsPortalPage.tsx`:**
Ocultar o deshabilitar los campos de subdominio y dominio personalizado cuando el plan es FREE o BASIC. Mostrar un badge "Requiere plan PRO o superior" en su lugar.

---

### 7. Integraciones (solo ENTERPRISE)

**Qué hace:** El módulo de integraciones externas (Zapier, webhooks, API keys u otras conexiones de terceros) solo está disponible para ENTERPRISE.

**Impacto:** Bloquear acceso a:
- `GET/POST/PUT /api/config-integraciones` — backend
- `/settings/integraciones` — ruta frontend
- Ítem "Integraciones" en el sidebar

**Qué falta:**

**Backend — `api/src/modules/config-integraciones/config-integraciones.controller.ts`:**
Aplicar `PlanGuard` con `@Plans('ENTERPRISE')`.

**Frontend — `web/src/components/AppLayout.tsx`:**
Ocultar "Integraciones" en el sidebar cuando `plan !== 'ENTERPRISE'`. Mostrar ícono con candado y tooltip "Disponible en plan Enterprise" como alternativa para incentivar el upgrade.

---

## Mecanismo de plan en el frontend

El frontend actualmente no tiene acceso al plan del tenant. Para implementar las restricciones de UI se necesita:

**Opción recomendada — extender el store de autenticación:**

`web/src/stores/authStore.ts`:
- Agregar campo `plan: string | null` al estado
- Tras el login exitoso, llamar `GET /api/tenants/mi-tenant` (ya existe el endpoint) y guardar `plan` en el store
- Exponer `usePlan()` hook o leer `useAuthStore(s => s.plan)` en componentes

Esto permite que el sidebar, las rutas protegidas y los formularios lean el plan sin llamadas adicionales al API por cada componente.

---

## Resumen de archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `api/prisma/schema.prisma` | Agregar `BASIC` al enum `Plan` |
| `api/src/modules/tenants/tenants.service.ts` | Derivar límites automáticamente del plan al crear/actualizar |
| `api/src/common/guards/plan.guard.ts` | Crear nuevo guardia de plan (nuevo archivo) |
| `api/src/common/decorators/plans.decorator.ts` | Crear decorador `@Plans()` (nuevo archivo) |
| `api/src/modules/email/email.service.ts` | Verificar plan antes de enviar email (FREE = no email) |
| `api/src/modules/campanas/campanas.controller.ts` | Aplicar `@Plans('PRO', 'ENTERPRISE')` |
| `api/src/modules/config-portal/config-portal.service.ts` | Verificar plan en update; bloquear dominio/subdominio en FREE y BASIC |
| `api/src/modules/config-integraciones/config-integraciones.controller.ts` | Aplicar `@Plans('ENTERPRISE')` |
| `web/src/stores/authStore.ts` | Agregar campo `plan` al estado; cargarlo tras login |
| `web/src/components/AppLayout.tsx` | Filtrar sidebar por plan (Campañas, Portal, Integraciones) |
| `web/src/App.tsx` | Crear componente `PlanRoute` para rutas protegidas por plan |
| `web/src/pages/Settings/SettingsPortalPage.tsx` | Ocultar campos de dominio/subdominio en FREE y BASIC |

---

---

## 8. Catálogo de planes configurable

**Qué hace:** En lugar de tener los límites y funcionalidades de cada plan hardcodeados en el código, se almacenan en una tabla de la base de datos (`catalogo_planes`). El SUPER_ADMIN puede modificar los valores de cada plan desde la interfaz sin necesidad de hacer un deploy.

**Por qué es necesario:** Los planes y sus restricciones son una decisión de negocio, no técnica. Cambiar el límite de propiedades de PRO de 100 a 150, o habilitar campañas en BASIC, no debería requerir modificar código ni reiniciar el servidor.

### Modelo de datos

```prisma
model CatalogoPlan {
  plan                 Plan     @id
  limite_usuarios      Int
  limite_propiedades   Int
  tiene_correo         Boolean  @default(false)
  tiene_campanas       Boolean  @default(false)
  tiene_portal         Boolean  @default(false)
  tiene_sitio_propio   Boolean  @default(false)
  tiene_integraciones  Boolean  @default(false)
  updated_at           DateTime @updatedAt

  @@map("catalogo_planes")
}
```

### Valores iniciales (seed)

| Plan       | Usuarios | Propiedades | Correo | Campañas | Portal | Sitio propio | Integraciones |
|------------|----------|-------------|--------|----------|--------|--------------|---------------|
| FREE       | 1        | 5           | false  | false    | false  | false        | false         |
| BASIC      | 3        | 25          | true   | false    | true   | false        | false         |
| PRO        | 5        | 100         | true   | true     | true   | true         | false         |
| ENTERPRISE | 25       | 500         | true   | true     | true   | true         | true          |

### Backend

**Nuevo módulo:** `api/src/modules/catalogo-planes/`
- `catalogo-planes.service.ts` — `findAll()`, `findOne(plan)`, `update(plan, dto)`
- `catalogo-planes.controller.ts` — rutas solo SUPER_ADMIN: `GET /api/catalogo-planes`, `PUT /api/catalogo-planes/:plan`
- `dto.ts` — `UpdateCatalogoPlanDto` con todos los campos opcionales
- `catalogo-planes.module.ts`

**Integración con TenantsService:**
Al crear un tenant, leer los límites del catálogo en lugar de usar los valores hardcodeados:
```typescript
const config = await this.prisma.catalogoPlan.findUnique({ where: { plan: dto.plan as Plan } });
const limiteUsuarios = dto.limiteUsuarios ?? config?.limite_usuarios ?? 1;
const limitePropiedades = dto.limitePropiedades ?? config?.limite_propiedades ?? 5;
```

**Integración con PlanGuard:**
El PlanGuard puede leer de `CatalogoPlan` para determinar si una funcionalidad está habilitada para un plan dado, en lugar de tener las comparaciones de plan hardcodeadas.

### Frontend

**Nueva página:** `web/src/pages/Admin/AdminPlanesPage.tsx`
- Tabla con los 4 planes mostrando todos sus valores actuales
- Botón "Editar" por fila que abre un modal con todos los campos editables
- Toggle switches para las funcionalidades booleanas
- Inputs numéricos para los límites
- Solo accesible para SUPER_ADMIN

**Sidebar:** Agregar "Planes" al menú de SUPER_ADMIN en `AppLayout.tsx`.

**Ruta:** `web/src/App.tsx` — agregar `/admin/planes`.

### Consideraciones

- El catálogo define los **defaults** de un plan. Un tenant puede tener límites personalizados (guardados en `tenant.limite_usuarios` y `tenant.limite_propiedades`) que anulan el catálogo — útil para casos especiales acordados con el cliente.
- Cuando el SUPER_ADMIN modifica el catálogo, los tenants existentes **no se ven afectados** automáticamente (sus límites están guardados en la tabla `tenants`). Solo los nuevos tenants creados después del cambio usarán los nuevos valores del catálogo.
- Los flags booleanos (`tiene_correo`, etc.) sí se aplican dinámicamente a todos los tenants del plan porque el PlanGuard los lee del catálogo en tiempo real.

---

## Orden de implementación recomendado

1. **Agregar BASIC al enum Prisma** (prerequisito para todo lo demás — sin esto BASIC da error en runtime)
2. **Catálogo de planes** — modelo `CatalogoPlan`, migración, seed, módulo backend, página frontend SUPER_ADMIN
3. **Derivar límites del plan del catálogo** al crear tenant (reemplaza valores hardcodeados)
4. **Crear PlanGuard + @Plans decorator** (infraestructura reutilizable, lee del catálogo)
5. **Plan en el store del frontend** (habilita restricciones de UI)
6. **Integraciones** (más fácil — solo un controller y un ítem del sidebar)
7. **Campañas** (backend guard + frontend sidebar + ruta protegida)
8. **Correo FREE** (verificación en EmailService)
9. **Portal público** (más complejo — involucra Next.js portal y config de dominio)
10. **Sitio propio** (campo por campo en SettingsPortalPage)
