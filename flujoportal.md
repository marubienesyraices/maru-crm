# Flujo del Portal Público

## ¿Qué es el portal público?

Es una aplicación Next.js 14 (SSR) separada del CRM que permite a los visitantes explorar las propiedades disponibles de una inmobiliaria. Vive en el paquete `portal/` del monorepo y consume rutas públicas del API (`/api/public/*`) sin autenticación.

---

## ¿Cómo sabe el portal de qué empresa mostrar propiedades?

El portal lee el **hostname** del request HTTP y lo envía al API para resolver el tenant correspondiente.

### Orden de resolución del tenant

```
Hostname del request (ej: propiedades.inmobiliaria.gt)
    ↓
GET /api/public/portal-config?host=propiedades.inmobiliaria.gt
    ↓
ConfigPortalService.findByDomain()
    │
    ├─ 1. Busca coincidencia exacta en config_portal.dominio_personalizado
    │      Ej: "propiedades.inmobiliaria.gt" → tenant A
    │
    ├─ 2. Busca por subdominio (primer label del hostname)
    │      Ej: "mipropiedades.tudominio.com" → extrae "mipropiedades" → tenant B
    │
    ├─ 3. Usa la variable de entorno PORTAL_TENANT_ID (si está definida)
    │      Ej: PORTAL_TENANT_ID=uuid-del-tenant → tenant C
    │
    └─ 4. Toma el primer tenant activo de la DB (fallback de desarrollo)
```

> **Importante:** Si ninguna de las primeras tres opciones coincide, el portal muestra el primer tenant registrado. Esto puede causar que se vean propiedades de un tenant no deseado.

---

## ¿Por qué se ven todas las propiedades?

En `api/src/modules/portal/portal.service.ts` el filtro de tenant es condicional:

```typescript
const where: any = { estado: 'DISPONIBLE' };
if (TENANT_ID) where.tenant_id = TENANT_ID;
```

Si `PORTAL_TENANT_ID` **no está definido** en el `.env` y no hay dominio/subdominio configurado en `config_portal`, no se aplica el filtro y se devuelven propiedades de **todos los tenants**.

---

## Flujo de datos completo

```
Usuario accede al portal (ej: propiedades.maru.gt)
    ↓
[Next.js App Router — SSR]
portal/app/layout.tsx
    ↓
getPortalConfig() lee el header Host
    │   ├─ Caché Redis: 5 minutos
    │   └─ ISR Next.js: revalida cada 5 minutos
    ↓
GET /api/public/portal-config?host=propiedades.maru.gt
    ↓
[API — sin autenticación, bypass RLS]
Devuelve: tenant_id, nombre_empresa, logo_url, whatsapp,
          colores, descripción, tiene_portal (del catálogo de planes)
    ↓
Si tiene_portal = false → muestra pantalla "Portal no disponible"
Si tiene_portal = true  → continúa al render
    ↓
portal/app/page.tsx
    ↓
getPropiedades(filtros desde searchParams)
    │   └─ ISR Next.js: revalida cada 60 segundos
    ↓
GET /api/public/propiedades?tipo=CASA&gestion=VENTA&page=1&limit=12
    ↓
[API — sin autenticación]
PortalService.findPublicProperties()
    ├─ WHERE estado = 'DISPONIBLE'
    ├─ WHERE tenant_id = PORTAL_TENANT_ID  (solo si está configurado)
    ├─ Filtros opcionales: tipo, gestion, departamento, habitaciones, precio
    ├─ Búsqueda full-text: título, código, descripción, zona
    └─ Paginación: limit=12, offset por página
    ↓
Next.js renderiza PropertyCard × N + paginación
```

---

## Configuración correcta del portal

### Opción A — Variable de entorno (un solo tenant)

La más simple. En el archivo `.env`:

```env
PORTAL_TENANT_ID=uuid-del-tenant-aqui
```

Todas las visitas al portal verán propiedades de ese tenant sin importar el hostname.

### Opción B — Dominio/subdominio por tenant (multi-tenant)

Cada empresa configura su propio acceso desde el CRM:

- **CRM → Configuración → Mi Portal** → campo Subdominio o Dominio personalizado
- Requiere que el plan tenga `tiene_sitio_propio = true`
- El portal resuelve automáticamente qué tenant mostrar según el hostname

Ejemplos:
| Hostname de acceso | Config en DB | Tenant mostrado |
|--------------------|--------------|-----------------|
| `maru.gestprop.net` | subdominio = `maru` | Maru Bienes y Raíces |
| `propiedades.maru.gt` | dominio_personalizado = `propiedades.maru.gt` | Maru Bienes y Raíces |

---

## Seguridad y caché

| Aspecto | Detalle |
|---------|---------|
| Autenticación | Ninguna — rutas completamente públicas |
| RLS (Row Level Security) | Bypass explícito en config-portal; no aplica en propiedades públicas |
| Propiedades visibles | Solo `estado = DISPONIBLE` |
| Caché config tenant | Redis 5 min + ISR Next.js 5 min |
| Caché propiedades | ISR Next.js 60 segundos |
| Plan requerido | `tiene_portal = true` en el catálogo de planes del tenant |

---

## Archivos clave

| Archivo | Responsabilidad |
|---------|----------------|
| `portal/app/layout.tsx` | Resuelve config del tenant, gate de plan |
| `portal/app/page.tsx` | Página principal, lista propiedades con filtros |
| `portal/lib/portal-config.ts` | Obtiene y cachea la config del tenant por hostname |
| `portal/lib/api.ts` | Llamadas al API público desde Next.js |
| `api/src/modules/portal/portal.service.ts` | Lógica de propiedades públicas, filtro por tenant |
| `api/src/modules/portal/portal.controller.ts` | Rutas públicas `/api/public/*` |
| `api/src/modules/config-portal/config-portal.service.ts` | Resolución del tenant por dominio/subdominio |
