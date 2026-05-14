# Guía de Publicación en Línea

Guía completa para llevar el proyecto de desarrollo local a producción: dominio, DNS, correos corporativos, hosting y despliegue de los tres servicios.

> **Sistema:** GestPro CRM (anteriormente "Maru CRM") — renombrado en la 5ta entrega.

---

## Registro de cambios recientes

### v5 — mayo 2026

| Área | Cambio |
|------|--------|
| **Marca** | Sistema renombrado a **GestPro**; logo integrado en CRM y portal |
| **Portal** | Página 404 personalizada (`not-found.tsx`); colores de tema configurables por tenant; `sitemap.xml` y `robots.txt` automáticos |
| **Módulo Meta** | Publicación automática de propiedades en Facebook e Instagram vía Meta Graph API; cola BullMQ propia |
| **Módulo Sindicación** | Publicación en portales externos (Encuentra24, MercadoLibre) |
| **Módulo Firma Digital** | Integración DocuSign para firma de contratos desde el CRM |
| **Módulo Videollamadas** | Integración Zoom Server-to-Server para visitas con meet link automático |
| **WhatsApp Business** | Envío de mensajes vía Cloud API (fallback a enlace wa.me si no se configura) |
| **Brochure PDF** | Galería ampliada a 8+ fotos; nuevo diseño de carta de comisión |
| **BI / Dashboard** | Índices de rendimiento en base de datos; nuevas métricas |
| **Migraciones nuevas** | `reporte_visita`, `meta_publicaciones`, `bi_indexes`, `sindicacion_firma_zoom`, `color_fondo_alterno`, `portal_theme_colors` |
| **RLS** | `migration_v2.sql` cubre tablas Fase 2–12; obligatoria en producción |
| **Tests de seguridad** | Suite OWASP Top 10 (`api/src/__tests__/security/owasp.security.spec.ts`) |
| **Variables de entorno** | Nuevas vars para Meta, WhatsApp, DocuSign, Zoom, Sentry, Sindicación, Mapbox server-side |

---

## Visión general de la arquitectura final

```
Internet
   │
   ▼
Cloudflare (DNS + CDN + SSL gratuito)
   │
   ├── www.maruinmobiliaria.com  →  Portal público Next.js   (Vercel)
   ├── crm.maruinmobiliaria.com  →  CRM React               (Cloudflare Pages)
   └── api.maruinmobiliaria.com  →  API NestJS              (Railway)
           │
           ├── PostgreSQL  →  Neon.tech
           └── Redis       →  Upstash
```

---

## PASO 1 — Registrar el dominio

**Dónde comprar:** [Namecheap](https://namecheap.com) (recomendado) o [GoDaddy](https://godaddy.com).

1. Buscar `maruinmobiliaria.com` (o el nombre definitivo).
2. Comprar el dominio — costo aproximado **$10–15 USD/año** para `.com`.
3. En la configuración del dominio en Namecheap: buscar la opción **Nameservers** y seleccionar **Custom DNS**. Dejar esto pendiente — se configurará en el Paso 2.

> **Alternativa .gt:** los dominios `.com.gt` se registran a través del NIC Guatemala en [nic.gt](https://www.nic.gt) — requiere documentación de empresa y cuesta alrededor de Q200/año.

---

## PASO 2 — Configurar Cloudflare (DNS + SSL + CDN)

Cloudflare actúa como capa intermedia entre el dominio y los servidores. Aporta SSL gratuito, protección DDoS y CDN sin costo adicional.

1. Crear cuenta gratuita en [cloudflare.com](https://cloudflare.com).
2. Ir a **Add a Site** → escribir el dominio (`maruinmobiliaria.com`) → elegir plan **Free**.
3. Cloudflare escaneará los DNS actuales y mostrará los registros existentes. Hacer clic en **Continue**.
4. Cloudflare mostrará **dos nameservers** propios (ejemplo: `ada.ns.cloudflare.com` y `bob.ns.cloudflare.com`).
5. Volver a Namecheap → **Domain** → **Nameservers** → pegar los dos nameservers de Cloudflare → guardar.
6. Esperar entre 5 minutos y 24 horas hasta que Cloudflare confirme la activación por email.

### Configuración SSL en Cloudflare

Una vez activado el dominio:

- Ir a **SSL/TLS** → modo **Full (strict)**.
- Ir a **SSL/TLS** → **Edge Certificates** → activar **Always Use HTTPS** y **Automatic HTTPS Rewrites**.

---

## PASO 3 — Correos corporativos con el dominio

### Opción A — Google Workspace (recomendado)

Permite tener `nombre@maruinmobiliaria.com` usando Gmail. Costo: **$6 USD/usuario/mes**.

1. Ir a [workspace.google.com](https://workspace.google.com) → **Comenzar**.
2. Ingresar el dominio (`maruinmobiliaria.com`) → seguir el asistente.
3. Crear el primer usuario administrador (ej: `admin@maruinmobiliaria.com`).
4. Google pedirá verificar la propiedad del dominio con un registro TXT. Ir a Cloudflare → **DNS** → **Add Record**:

   | Tipo | Nombre | Contenido |
   |------|--------|-----------|
   | TXT | @ | `google-site-verification=xxxxxxxxxxxxxxx` |

5. Una vez verificado, Google mostrará los registros **MX** a agregar. En Cloudflare → **DNS** → agregar cada uno:

   | Tipo | Nombre | Contenido | Prioridad |
   |------|--------|-----------|-----------|
   | MX | @ | `ASPMX.L.GOOGLE.COM` | 1 |
   | MX | @ | `ALT1.ASPMX.L.GOOGLE.COM` | 5 |
   | MX | @ | `ALT2.ASPMX.L.GOOGLE.COM` | 5 |
   | MX | @ | `ALT3.ASPMX.L.GOOGLE.COM` | 10 |
   | MX | @ | `ALT4.ASPMX.L.GOOGLE.COM` | 10 |

6. Ir a [admin.google.com](https://admin.google.com) → **Usuarios** → crear los buzones:
   - `info@maruinmobiliaria.com` — contacto público
   - `ventas@maruinmobiliaria.com` — equipo comercial
   - `noreply@maruinmobiliaria.com` — para envíos automáticos (alias, sin buzón real)

### Opción B — Zoho Mail (gratuito hasta 5 usuarios)

1. Ir a [zoho.com/mail](https://www.zoho.com/mail/) → plan **Free** (hasta 5 cuentas de 5 GB).
2. Añadir el dominio y seguir el asistente de verificación (similar al de Google).
3. Agregar los registros MX que Zoho indique en Cloudflare.

---

## PASO 4 — Registros DNS de autenticación de correo

Estos registros evitan que los emails del sistema sean marcados como spam. Son obligatorios para Resend (el servicio de emails del CRM).

### SPF — quién puede enviar emails en nombre del dominio

En Cloudflare → **DNS** → **Add Record**:

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| TXT | @ | `v=spf1 include:_spf.google.com include:amazonses.com include:resend.com ~all` |

> Ajustar el `include:` según los servicios reales usados (Google Workspace + Resend es la combinación más común en este proyecto).

### DKIM — firma digital de emails (Resend)

Al verificar el dominio en [resend.com](https://resend.com) → **Domains** → el sistema mostrará tres registros CNAME a agregar. Ejemplo:

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| CNAME | `resend._domainkey` | `p.resend.com` |
| CNAME | `em1._domainkey` | `p.resend.com` |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@maruinmobiliaria.com` |

> Resend muestra los valores exactos al verificar el dominio — copiarlos tal cual.

### DMARC — política contra suplantación

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:info@maruinmobiliaria.com` |

---

## PASO 5 — Base de datos PostgreSQL en Neon

1. Crear cuenta en [neon.tech](https://neon.tech) → **New Project** → nombre `maru-crm` → región más cercana (ej: `us-east-1` o `us-east-2`).
2. En el proyecto creado → **Connection Details** → copiar la **Connection String** (tiene la forma `postgresql://usuario:password@host/db?sslmode=require`).
3. Guardar esta URL — se usará como `DATABASE_URL` en producción.
4. En el **SQL Editor** de Neon, ejecutar en orden:
   ```sql
   -- Paso 1: roles, permisos y RLS Fase 1
   -- Pegar contenido de: api/prisma/sql/rls_policies/migration.sql

   -- Paso 2: RLS Fase 2–12 (todas las tablas nuevas incluidas)
   -- Pegar contenido de: api/prisma/sql/rls_policies/migration_v2.sql
   ```

   > `migration_v2.sql` cubre las tablas añadidas en la 4ta y 5ta entrega: `reporte_visita`, `meta_publicaciones`, `sindicacion`, `firma_digital`, `videollamadas`, `brochure_descargas`, entre otras. Siempre usar la versión más reciente del archivo.

5. Cambiar la contraseña del rol `maru_app` inmediatamente:
   ```sql
   ALTER ROLE maru_app PASSWORD 'contraseña-segura-aqui';
   ```

---

## PASO 6 — Redis en Upstash

1. Crear cuenta en [upstash.com](https://upstash.com) → **Create Database**.
2. Nombre: `maru-crm-redis` → región: `us-east-1` → tipo: **Regional** → plan **Free**.
3. En la base de datos creada → pestaña **Details** → copiar:
   - **Endpoint** → será el `REDIS_HOST`
   - **Port** → `6379`
   - **Password** → no se usa en `REDIS_HOST`/`REDIS_PORT` directamente; Upstash puede requerir usar la URL completa `rediss://default:password@host:port`. En ese caso, modificar `redis.service.ts` para leer `REDIS_URL` en lugar de host/puerto separados.

---

## PASO 7 — Desplegar la API NestJS en Railway

Railway ejecuta el Dockerfile existente sin configuración extra.

1. Crear cuenta en [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Conectar el repositorio de GitHub y seleccionar la rama `master`.
3. Railway detecta el Dockerfile de la API. Configurar el **Root Directory** como `/` (raíz del monorepo).
4. En **Settings** → **Build** → verificar que usa `api/Dockerfile`.
5. En **Variables** → agregar todas las variables de producción:

   ```env
   # ── Core ──────────────────────────────────────────────
   NODE_ENV=production
   DATABASE_URL=postgresql://...neon.tech/...?sslmode=require
   REDIS_HOST=tu-endpoint.upstash.io
   REDIS_PORT=6379
   JWT_ACCESS_SECRET=secreto-32-chars-generado
   JWT_REFRESH_SECRET=secreto-32-chars-generado
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   PORT=3000
   FRONTEND_URL=https://crm.maruinmobiliaria.com
   PORTAL_URL=https://www.maruinmobiliaria.com
   APP_URL=https://api.maruinmobiliaria.com

   # ── Email (Resend) ────────────────────────────────────
   RESEND_API_KEY=re_...
   EMAIL_FROM=GestPro CRM <noreply@maruinmobiliaria.com>

   # ── Almacenamiento (Cloudflare R2) ───────────────────
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=maru-crm-files
   R2_PUBLIC_URL=https://...r2.cloudflarestorage.com

   # ── Mapbox ────────────────────────────────────────────
   MAPBOX_TOKEN=pk.eyJ1...          # geocodificación server-side
   VITE_MAPBOX_TOKEN=pk.eyJ1...     # mapa en el browser

   # ── Google Maps (geocodificación en formulario) ──────
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

   # ── WhatsApp Business Cloud API (opcional) ───────────
   WHATSAPP_API_TOKEN=EAAxxxxxxxx
   WHATSAPP_PHONE_NUMBER_ID=123456789012345

   # ── Meta Graph API — Facebook / Instagram (opcional) ─
   META_PAGE_ACCESS_TOKEN=EAAxxxxxxxx
   META_PAGE_ID=123456789012345
   META_IG_USER_ID=987654321098765

   # ── Sindicación portales externos (opcional) ─────────
   ENCUENTRA24_API_KEY=...
   ENCUENTRA24_API_URL=https://api.encuentra24.com/v1
   ML_ACCESS_TOKEN=APP_USR-...

   # ── DocuSign — firma digital (opcional) ──────────────
   DOCUSIGN_INTEGRATION_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   DOCUSIGN_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   DOCUSIGN_ACCOUNT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   DOCUSIGN_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   DOCUSIGN_RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
   DOCUSIGN_BASE_URL=https://www.docusign.net/restapi   # producción

   # ── Zoom — videollamadas (opcional) ──────────────────
   ZOOM_ACCOUNT_ID=xxxxxxxxxx
   ZOOM_CLIENT_ID=xxxxxxxxxx
   ZOOM_CLIENT_SECRET=xxxxxxxxxxxxxxxxxx

   # ── Sentry — monitoreo de errores (opcional) ─────────
   SENTRY_DSN=https://xxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXX
   ```

   > **Integraciones opcionales:** las variables de Meta, WhatsApp, DocuSign, Zoom y Sindicación pueden dejarse vacías para deshabilitar esas funcionalidades. El sistema opera normalmente sin ellas.

6. En **Settings** → **Networking** → **Add Custom Domain** → escribir `api.maruinmobiliaria.com`.
7. Railway mostrará un registro CNAME. En Cloudflare → **DNS** → agregar:

   | Tipo | Nombre | Contenido | Proxy |
   |------|--------|-----------|-------|
   | CNAME | `api` | `tu-proyecto.railway.app` | Desactivado (nube gris) |

   > El proxy de Cloudflare debe estar **desactivado** (nube gris) para la API, ya que Railway gestiona su propio SSL.

8. Una vez desplegado, ejecutar las migraciones de Prisma desde la consola de Railway:
   ```bash
   npx prisma migrate deploy
   npx ts-node prisma/seed.ts   # solo la primera vez
   ```

---

## PASO 8 — Desplegar el Portal Next.js en Vercel

Vercel es el hosting oficial de Next.js y ofrece plan gratuito generoso.

1. Crear cuenta en [vercel.com](https://vercel.com) con la misma cuenta de GitHub.
2. **New Project** → importar el repositorio → en **Root Directory** escribir `portal`.
3. Vercel detecta automáticamente que es Next.js.
4. En **Environment Variables** agregar:

   ```env
   NEXT_PUBLIC_API_URL=https://api.maruinmobiliaria.com
   NEXT_PUBLIC_COMPANY_NAME=GestPro
   NEXT_PUBLIC_COMPANY_EMAIL=info@maruinmobiliaria.com
   NEXT_PUBLIC_WHATSAPP=50212345678
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
   NEXT_PUBLIC_SITE_URL=https://www.maruinmobiliaria.com   # usado en sitemap.xml y robots.txt
   PORTAL_TENANT_ID=                                        # UUID del tenant a mostrar; vacío = primer tenant
   ```

5. Hacer clic en **Deploy**.
6. Cuando termine → **Settings** → **Domains** → agregar `www.maruinmobiliaria.com`.
7. Vercel mostrará el registro DNS a agregar. En Cloudflare → **DNS**:

   | Tipo | Nombre | Contenido | Proxy |
   |------|--------|-----------|-------|
   | CNAME | `www` | `cname.vercel-dns.com` | Desactivado (nube gris) |

---

## PASO 9 — Desplegar el CRM React en Cloudflare Pages

El CRM React es un sitio estático (Vite + Nginx en Docker). Cloudflare Pages lo sirve gratis con CDN global.

1. En Cloudflare → **Pages** → **Create a project** → **Connect to Git** → seleccionar el repositorio.
2. Configurar el build:

   | Campo | Valor |
   |-------|-------|
   | Build command | `npm run build:web` |
   | Build output directory | `web/dist` |
   | Root directory | `/` |
   | Node.js version | `20` |

3. En **Environment variables** (production) agregar:

   ```env
   VITE_API_URL=https://api.maruinmobiliaria.com
   VITE_MAPBOX_TOKEN=pk.eyJ1...
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
   VITE_SENTRY_DSN=https://xxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXX
   ```

4. Hacer clic en **Save and Deploy**.
5. Cuando termine → **Custom domains** → agregar `crm.maruinmobiliaria.com`.
6. Cloudflare Pages configura el DNS automáticamente al estar en la misma cuenta.

---

## PASO 10 — Registros DNS finales en Cloudflare

Al terminar todos los pasos, la configuración de DNS en Cloudflare debe verse así:

| Tipo | Nombre | Contenido | Proxy | Para qué |
|------|--------|-----------|-------|----------|
| A | `@` | `76.76.21.21` *(IP de Vercel)* | ✗ | Raíz del dominio |
| CNAME | `www` | `cname.vercel-dns.com` | ✗ | Portal público |
| CNAME | `crm` | *(auto, Cloudflare Pages)* | ✓ | CRM interno |
| CNAME | `api` | `tu-app.railway.app` | ✗ | API NestJS |
| MX | `@` | `ASPMX.L.GOOGLE.COM` | — | Email principal |
| MX | `@` | `ALT1.ASPMX.L.GOOGLE.COM` | — | Email backup |
| TXT | `@` | `v=spf1 include:_spf.google.com include:resend.com ~all` | — | SPF anti-spam |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:info@...` | — | DMARC |
| CNAME | `resend._domainkey` | `p.resend.com` | — | DKIM Resend |
| TXT | `@` | `google-site-verification=xxx` | — | Verificación Google |

---

## PASO 11 — Seed inicial y primer acceso

1. Ejecutar el seed en Railway (consola del servicio API):
   ```bash
   npx ts-node prisma/seed.ts
   ```
   Esto crea el tenant SUPER_ADMIN y un usuario demo con credenciales iniciales.

2. Acceder al CRM en `https://crm.maruinmobiliaria.com`.
3. Iniciar sesión con las credenciales del seed.
4. Ir a **Configuración** → cambiar email y contraseña del super admin.
5. Crear el primer tenant (empresa inmobiliaria) y el primer usuario ADMIN.

---

## Costos estimados mensuales

### Servicios base (obligatorios)

| Servicio | Plan | Costo USD/mes |
|----------|------|---------------|
| Dominio `.com` | — | ~$1 |
| Cloudflare DNS + CDN | Free | $0 |
| Cloudflare Pages (CRM web) | Free | $0 |
| Vercel (portal Next.js) | Hobby | $0 |
| Railway (API NestJS) | Starter | $5–20 |
| Neon PostgreSQL | Free / Launch | $0–19 |
| Upstash Redis | Free / Pay-as-you-go | $0–5 |
| Cloudflare R2 (10 GB) | — | $0–1.5 |
| Resend emails (3 000/mes) | Free | $0 |
| Google Workspace (2 usuarios) | Starter | $12 |
| **Subtotal base** | | **$18–58** |

### Integraciones opcionales

| Servicio | Plan | Costo USD/mes |
|----------|------|---------------|
| Sentry (monitoreo errores) | Developer | $0–26 |
| Zoom (videollamadas) | Basic gratuito | $0–15 |
| DocuSign (firma digital) | Personal | $0–10/sobre |
| Meta Ads API (publicación FB/IG) | Sin costo de API | $0 |
| Encuentra24 (sindicación) | Por acuerdo | variable |
| MercadoLibre (sindicación) | Por acuerdo | variable |
| Mapbox | Free 50 000 req/mes | $0–50 |
| **Total estimado con opcionales** | | **$18–159+** |

---

## Lista de verificación final

Antes de considerar el despliegue completo:

### Infraestructura y acceso
- [ ] Dominio registrado y apuntando a Cloudflare
- [ ] SSL en modo Full (strict) en Cloudflare
- [ ] Registros MX configurados y emails probados
- [ ] SPF, DKIM y DMARC configurados (verificar en [mail-tester.com](https://mail-tester.com))

### Servicios desplegados
- [ ] API desplegada y respondiendo en `https://api.maruinmobiliaria.com/health`
- [ ] Portal desplegado y cargando propiedades en `https://www.maruinmobiliaria.com`
- [ ] CRM desplegado y login funciona en `https://crm.maruinmobiliaria.com`
- [ ] `sitemap.xml` accesible en `https://www.maruinmobiliaria.com/sitemap.xml`
- [ ] `robots.txt` accesible en `https://www.maruinmobiliaria.com/robots.txt`
- [ ] Página 404 personalizada funcionando en el portal

### Base de datos
- [ ] Variables de entorno de producción completas (sin valores de desarrollo)
- [ ] Migraciones de Prisma aplicadas (`npx prisma migrate deploy` en Railway)
- [ ] RLS policies aplicadas en Neon (`migration.sql` y `migration_v2.sql` en ese orden)
- [ ] Contraseña del rol `maru_app` cambiada en producción
- [ ] Seed ejecutado y credenciales del super admin cambiadas

### Almacenamiento y email
- [ ] Dominio verificado en Resend y emails de prueba recibidos sin ir a spam
- [ ] R2 configurado y subida de imágenes probada
- [ ] Brochure PDF generado correctamente con galería de imágenes

### Integraciones opcionales (marcar las que apliquen)
- [ ] **Mapbox** — mapa y geocodificación funcionando en formulario de propiedad
- [ ] **WhatsApp Business** — mensajes enviados desde el módulo de visitas
- [ ] **Meta (Facebook/Instagram)** — publicación de propiedad de prueba exitosa
- [ ] **Sindicación** — propiedad sincronizada en Encuentra24 o MercadoLibre
- [ ] **DocuSign** — sobre de prueba enviado y firmado correctamente
- [ ] **Zoom** — link de videollamada generado al crear visita con tipo Zoom
- [ ] **Sentry** — error de prueba aparece en el dashboard de Sentry
