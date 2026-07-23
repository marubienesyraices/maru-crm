# Guía de Publicación en Línea

Guía completa para llevar el proyecto de desarrollo local a producción: dominio, DNS, correos corporativos, hosting y despliegue de los tres servicios.

> **Sistema:** GestProp CRM

---

## Registro de cambios recientes

### v5 — mayo 2026

| Área | Cambio |
|------|--------|
| **Marca** | Sistema renombrado a **GestProp**; logo y branding unificado en CRM, portal y emails |
| **Temas claro/oscuro** | Paleta de color fija a nivel de app (no por tenant); toggle persistente en CRM y portal público (localStorage) |
| **Portal** | Página 404 personalizada; toggle de tema en el header; `sitemap.xml` y `robots.txt` automáticos |
| **Módulo Meta** | Publicación automática de propiedades en Facebook e Instagram vía Meta Graph API; cola BullMQ propia |
| **Módulo Sindicación** | Publicación en portales externos (Encuentra24, MercadoLibre) |
| **Módulo Firma Digital** | Integración DocuSign para firma de contratos desde el CRM |
| **Módulo Videollamadas** | Integración Zoom Server-to-Server para visitas con meet link automático |
| **WhatsApp Business** | Envío de mensajes vía Cloud API (fallback a enlace wa.me si no se configura) |
| **Brochure PDF** | Galería ampliada a 8+ fotos; nuevo diseño de carta de comisión |
| **BI / Dashboard** | Índices de rendimiento en base de datos; nuevas métricas |
| **Migraciones nuevas** | `reporte_visita`, `meta_publicaciones`, `bi_indexes`, `sindicacion_firma_zoom`, `remove_tenant_colors` |
| **RLS** | `migration_v2.sql` cubre tablas Fase 2–12; obligatoria en producción |
| **Tests de seguridad** | Suite OWASP Top 10 (`api/src/__tests__/security/owasp.security.spec.ts`) |
| **Variables de entorno** | Nuevas vars para Meta, WhatsApp, DocuSign, Zoom, Sentry, Sindicación, Mapbox server-side, `PORTAL_URL` |

---

## Visión general de la arquitectura

### Alternativa A — Servicios gestionados (serverless)

```
Internet
   │
   ▼
Cloudflare (DNS + CDN + SSL gratuito)
   │
   ├── www.gestprop.net  →  Portal público Next.js   (Vercel)
   ├── crm.gestprop.net  →  CRM React               (Cloudflare Pages)
   └── api.gestprop.net  →  API NestJS              (Railway)
           │
           ├── PostgreSQL  →  Neon.tech
           └── Redis       →  Upstash
```

> ⚠️ **Costo estimado: $25–60 USD/mes.** Neon y Upstash se cobran por uso; bajo carga real los costos suben rápido.

### Alternativa B — VPS todo-en-uno (recomendado) ✅

```
Internet
   │
   ▼
Cloudflare (DNS + CDN + SSL gratuito)
   │
   └── *.gestprop.net  →  VPS (DigitalOcean / Hetzner)
                            │
                            ├── Nginx (reverse proxy + SSL)
                            ├── API NestJS     (Docker)
                            ├── CRM React      (Docker + nginx)
                            ├── Portal Next.js (Docker)
                            ├── PostgreSQL 16  (Docker + volumen persistente)
                            ├── Redis 7        (Docker + volumen persistente)
                            └── Backup cron    (Docker → R2)
```

> ✅ **Costo fijo: $6–12 USD/mes.** Todo corre en un solo servidor. Sin sorpresas de facturación. Ya tienes `docker-compose.prod.yml` configurado para esto.

---

## PASO 1 — Registrar el dominio

**Dónde comprar:** [Namecheap](https://namecheap.com) (recomendado) o [GoDaddy](https://godaddy.com).

1. Buscar `tudominio.com` (o el nombre definitivo).
2. Comprar el dominio — costo aproximado **$10–15 USD/año** para `.com`.
3. En la configuración del dominio en Namecheap: buscar la opción **Nameservers** y seleccionar **Custom DNS**. Dejar esto pendiente — se configurará en el Paso 2.

> **Alternativa .gt:** los dominios `.com.gt` se registran a través del NIC Guatemala en [nic.gt](https://www.nic.gt) — requiere documentación de empresa y cuesta alrededor de Q200/año.

---

## PASO 2 — Configurar Cloudflare (DNS + SSL + CDN)

Cloudflare actúa como capa intermedia entre el dominio y los servidores. Aporta SSL gratuito, protección DDoS y CDN sin costo adicional.

1. Crear cuenta gratuita en [cloudflare.com](https://cloudflare.com).
2. Ir a **Add a Site** → escribir el dominio (`tudominio.com`) → elegir plan **Free**.
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

Permite tener `nombre@tudominio.com` usando Gmail. Costo: **$6 USD/usuario/mes**.

1. Ir a [workspace.google.com](https://workspace.google.com) → **Comenzar**.
2. Ingresar el dominio (`tudominio.com`) → seguir el asistente.
3. Crear el primer usuario administrador (ej: `admin@tudominio.com`).
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
   - `info@tudominio.com` — contacto público
   - `ventas@tudominio.com` — equipo comercial
   - `noreply@tudominio.com` — para envíos automáticos (alias, sin buzón real)

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
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@tudominio.com` |

> Resend muestra los valores exactos al verificar el dominio — copiarlos tal cual.

### DMARC — política contra suplantación

| Tipo | Nombre | Contenido |
|------|--------|-----------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:info@tudominio.com` |

---

## PASO 5 — Elegir estrategia de hosting

### Alternativa A — Servicios gestionados (Neon + Upstash + Railway)

Si prefieres no administrar servidores, usar los servicios ya configurados:

1. **PostgreSQL:** Neon.tech (ya configurado) — `DATABASE_URL` en `.env`
2. **Redis:** Upstash (ya configurado) — `REDIS_URL` en `.env`
3. **API:** Railway.app — ver PASO 7-A
4. **CRM:** Cloudflare Pages — ver PASO 9
5. **Portal:** Vercel — ver PASO 8

> ⚠️ **Advertencia de costos:** Neon cobra por compute-time y Upstash por comandos. Con BullMQ y caché activos, el consumo crece rápido. **Evalúa la Alternativa B si el costo es una prioridad.**

---

### Alternativa B — VPS todo-en-uno (recomendado) ✅

Todo el sistema corre en un solo servidor usando `docker-compose.prod.yml`. PostgreSQL, Redis, API, CRM, Portal y Nginx incluidos.

#### ¿Por qué VPS?

| Aspecto | Servicios gestionados | VPS |
|---------|----------------------|-----|
| Costo mensual | $25–60+ (variable) | $6–12 (fijo) |
| PostgreSQL | Neon Free = 0.5 GB, cobro por compute | 16 GB ilimitado incluido |
| Redis | Upstash Free = 10K cmds/día | Ilimitado incluido |
| Escalabilidad | Auto-scale | Upgrade manual |
| Administración | Cero | Mínima (Docker lo simplifica) |
| Backups | Incluidos en Neon | Script cron incluido → R2 |

#### Proveedores recomendados

| Proveedor | Plan | RAM | Disco | Costo/mes |
|-----------|------|-----|-------|----------|
| **DigitalOcean** | Basic Droplet | 2 GB | 50 GB SSD | **$12** |
| **Hetzner** | CX22 | 4 GB | 40 GB | **€4.35 (~$5)** |
| **AWS Lightsail** | 2 GB | 2 GB | 60 GB SSD | **$12** |
| **Azure B1s** | Burstable | 1 GB | 30 GB | **$7.59** |

> 💡 **Recomendación:** DigitalOcean ($12/mes, 2 GB RAM) o Hetzner ($5/mes, 4 GB RAM) son las mejores opciones calidad/precio.

#### Paso 5-B.1 — Crear el VPS

**DigitalOcean (ejemplo):**

1. Crear cuenta en [digitalocean.com](https://digitalocean.com)
2. **Create Droplet** → Ubuntu 24.04 → Basic → Regular ($12/mes, 2 GB RAM)
3. Región: **NYC1** o **SFO3** (la más cercana a Guatemala)
4. Autenticación: **SSH Key** (recomendado) o password
5. Hostname: `gestprop-prod`

#### Paso 5-B.2 — Configurar el servidor

Conectarse por SSH y ejecutar:

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Certbot para SSL (si no usas Cloudflare proxy)
sudo apt install certbot -y

# Crear directorio del proyecto
mkdir -p /opt/gestprop && cd /opt/gestprop
```

#### Paso 5-B.3 — Subir el proyecto

**Opción 1 — Git clone (recomendado):**
```bash
cd /opt/gestprop
git clone https://github.com/tu-usuario/tu-repo.git .
```

**Opción 2 — SCP desde tu máquina:**
```bash
scp -r ./* root@IP_SERVIDOR:/opt/gestprop/
```

#### Paso 5-B.4 — Crear archivo `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

Contenido mínimo:

```env
# ── Base de datos (local en Docker) ──────────────────────
DB_USER=gestprop_admin
DB_PASSWORD=contraseña-segura-generada
DB_NAME=gestprop_crm

# ── Redis (local en Docker) ──────────────────────────────
REDIS_PASSWORD=otra-contraseña-segura

# ── JWT ──────────────────────────────────────────────────
JWT_ACCESS_SECRET=secreto-32-chars
JWT_REFRESH_SECRET=secreto-32-chars

# ── URLs públicas ────────────────────────────────────────
FRONTEND_URL=https://crm.gestprop.net
APP_URL=https://api.gestprop.net
PORTAL_URL=https://www.gestprop.net

# ── Cloudflare R2 ────────────────────────────────────────
R2_ACCOUNT_ID=tu-account-id
R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_BUCKET=gestprop-files
R2_PUBLIC_URL=https://cdn.gestprop.net

# ── Email (Resend) ───────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=GestProp CRM <info@gestprop.net>

# ── Encryption ───────────────────────────────────────────
MASTER_ENCRYPTION_KEY=clave-hex-64-chars

# ── Mapbox ───────────────────────────────────────────────
MAPBOX_TOKEN=pk.eyJ1...
VITE_MAPBOX_TOKEN=pk.eyJ1...

# ── Google Maps ──────────────────────────────────────────
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# ── Portal ───────────────────────────────────────────────
PORTAL_TENANT_ID=uuid-del-tenant
```

#### Paso 5-B.5 — Desplegar con Docker Compose

```bash
cd /opt/gestprop

# Construir y levantar todos los servicios
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verificar que todo está corriendo
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f api
```

#### Paso 5-B.6 — Ejecutar migraciones y seed

```bash
# Esperar a que PostgreSQL esté listo, luego:
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Seed (solo la primera vez)
docker compose -f docker-compose.prod.yml exec api npx ts-node prisma/seed.ts

# Aplicar RLS policies
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U gestprop_admin -d gestprop_crm \
  -f /path/to/migration.sql
```

#### Paso 5-B.7 — DNS en Cloudflare

Apuntar todos los subdominios al VPS:

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | `@` | `IP_DEL_VPS` | ✓ (naranja) |
| A | `www` | `IP_DEL_VPS` | ✓ (naranja) |
| A | `crm` | `IP_DEL_VPS` | ✓ (naranja) |
| A | `api` | `IP_DEL_VPS` | ✓ (naranja) |
| CNAME | `cdn` | *(R2 custom domain)* | ✓ (naranja) |

> Con Cloudflare proxy activado (nube naranja), SSL se maneja automáticamente. No necesitas Certbot.

#### Paso 5-B.8 — Actualizaciones futuras

```bash
cd /opt/gestprop
git pull origin master
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

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
   FRONTEND_URL=https://crm.tudominio.com
   PORTAL_URL=https://www.tudominio.com
   APP_URL=https://api.tudominio.com

   # ── Email (Resend) ────────────────────────────────────
   RESEND_API_KEY=re_...
   EMAIL_FROM=GestProp CRM <noreply@tudominio.com>

   # ── Almacenamiento (Cloudflare R2) ───────────────────
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=gestprop-files
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

6. En **Settings** → **Networking** → **Add Custom Domain** → escribir `api.tudominio.com`.
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
   NEXT_PUBLIC_API_URL=https://api.tudominio.com
   NEXT_PUBLIC_COMPANY_NAME=GestProp
   NEXT_PUBLIC_COMPANY_EMAIL=info@tudominio.com
   NEXT_PUBLIC_WHATSAPP=50212345678
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
   NEXT_PUBLIC_SITE_URL=https://www.tudominio.com   # usado en sitemap.xml y robots.txt
   PORTAL_TENANT_ID=                                        # UUID del tenant a mostrar; vacío = primer tenant
   ```

5. Hacer clic en **Deploy**.
6. Cuando termine → **Settings** → **Domains** → agregar `www.tudominio.com`.
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
   VITE_API_URL=https://api.tudominio.com
   VITE_MAPBOX_TOKEN=pk.eyJ1...
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
   VITE_SENTRY_DSN=https://xxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXX
   ```

4. Hacer clic en **Save and Deploy**.
5. Cuando termine → **Custom domains** → agregar `crm.tudominio.com`.
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
   Esto crea dos tenants de demo y los siguientes usuarios iniciales:

   | Rol | Email | Contraseña |
   |-----|-------|------------|
   | Super Admin | `superadmin@gestprop.net` | `SuperAdmin@2026Desa` |
   | Admin | `admin@gestprop.net` | `Admin@2026Desa` |
   | Senior | `carlos.senior@gestprop.net` | `Agent@2026Desa` |
   | Junior | `ana.junior@gestprop.net` | `Agent@2026Desa` |

2. Acceder al CRM en `https://crm.tudominio.com`.
3. Iniciar sesión con `superadmin@gestprop.net` / `SuperAdmin@2026Desa`.
4. Ir a **Configuración** → **Mi Perfil** → cambiar email y contraseña del super admin.
5. Ir a **Admin** → **Empresas** → crear el primer tenant real (empresa inmobiliaria).
6. Dentro del tenant, ir a **Admin** → **Usuarios** → crear el primer usuario ADMIN.

---

## Comparativa de costos mensuales

### Alternativa A — Servicios gestionados

| Servicio | Plan | Costo USD/mes |
|----------|------|---------------|
| Dominio `.com` | — | ~$1 |
| Cloudflare DNS + CDN | Free | $0 |
| Cloudflare Pages (CRM web) | Free | $0 |
| Vercel (portal Next.js) | Hobby | $0 |
| Railway (API NestJS) | Starter | $5–20 |
| Neon PostgreSQL | Free / Launch | $0–19 |
| Upstash Redis | Free / Pay-as-you-go | $0–10 |
| Cloudflare R2 (10 GB) | — | $0–1.5 |
| Resend emails (3 000/mes) | Free | $0 |
| Google Workspace (2 usuarios) | Starter | $12 |
| **Subtotal** | | **$18–63** |

> ⚠️ Los costos de Neon, Upstash y Railway son **variables** y suben con el uso real. BullMQ genera muchos comandos Redis y Neon cobra por compute-time activo.

### Alternativa B — VPS todo-en-uno (recomendado) ✅

| Servicio | Plan | Costo USD/mes |
|----------|------|---------------|
| Dominio `.com` | — | ~$1 |
| Cloudflare DNS + CDN + R2 | Free + R2 | $0–1.5 |
| **VPS (todo incluido)** | DigitalOcean 2 GB | **$12** |
| Resend emails (3 000/mes) | Free | $0 |
| Google Workspace (2 usuarios) | Starter | $12 |
| **Subtotal** | | **$25–27** |

> ✅ **Costo fijo y predecible.** PostgreSQL y Redis corren dentro del VPS sin límites de uso. No hay sorpresas de facturación.

### Comparativa directa

| Concepto | Alt. A (Managed) | Alt. B (VPS) |
|----------|------------------|--------------|
| Costo base | $18/mes | $13/mes |
| Costo realista (uso medio) | **$40–60/mes** | **$25–27/mes** |
| PostgreSQL | 0.5 GB free, luego $19+ | Ilimitado |
| Redis | 10K cmds/día free | Ilimitado |
| Backups DB | Incluidos (Neon) | Script cron → R2 |
| Escalabilidad | Auto | Upgrade droplet |
| Administración | Cero | Docker updates |
| Complejidad deploy | Múltiples dashboards | Un solo `docker compose up` |

### Integraciones opcionales (aplica a ambas)

| Servicio | Plan | Costo USD/mes |
|----------|------|---------------|
| Sentry (monitoreo errores) | Developer | $0–26 |
| Zoom (videollamadas) | Basic gratuito | $0–15 |
| DocuSign (firma digital) | Personal | $0–10/sobre |
| Meta Ads API (publicación FB/IG) | Sin costo de API | $0 |
| Encuentra24 (sindicación) | Por acuerdo | variable |
| MercadoLibre (sindicación) | Por acuerdo | variable |
| Mapbox | Free 50 000 req/mes | $0–50 |

---

## Lista de verificación final

Antes de considerar el despliegue completo:

### Infraestructura y acceso
- [ ] Dominio registrado y apuntando a Cloudflare
- [ ] SSL en modo Full (strict) en Cloudflare
- [ ] Registros MX configurados y emails probados
- [ ] SPF, DKIM y DMARC configurados (verificar en [mail-tester.com](https://mail-tester.com))

### Servicios desplegados
- [ ] API desplegada y respondiendo en `https://api.tudominio.com/health`
- [ ] Portal desplegado y cargando propiedades en `https://www.tudominio.com`
- [ ] CRM desplegado y login funciona en `https://crm.tudominio.com`
- [ ] `sitemap.xml` accesible en `https://www.tudominio.com/sitemap.xml`
- [ ] `robots.txt` accesible en `https://www.tudominio.com/robots.txt`
- [ ] Página 404 personalizada funcionando en el portal

### Base de datos
- [ ] Variables de entorno de producción completas (sin valores de desarrollo)
- [ ] Migraciones de Prisma aplicadas (`npx prisma migrate deploy` en Railway)
- [ ] RLS policies aplicadas en Neon (`migration.sql` y `migration_v2.sql` en ese orden)
- [ ] Contraseña del rol `gestprop_app` (RLS) cambiada en producción
- [ ] Seed ejecutado (`npx ts-node prisma/seed.ts`)
- [ ] Contraseña de `superadmin@gestprop.net` cambiada tras el primer login

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
- [ ] **Tema** — toggle claro/oscuro funciona en CRM y en el portal público
