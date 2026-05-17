# Plan de Configuración de Servicios Externos — GestPro CRM

Guía paso a paso para conectar el proyecto con cada servicio externo. Los marcados como **Requerido** bloquean el arranque si faltan. Los marcados como **Opcional** degradan funcionalidad pero no impiden el inicio.

---

## 1. PostgreSQL — Base de datos principal · REQUERIDO

**Qué hace:** almacena todos los datos del CRM (tenants, usuarios, propiedades, clientes, pipeline, etc.) con Row-Level Security multi-tenant.

### Opción A — Docker local (desarrollo)
```bash
docker compose up -d   # ya incluido en el proyecto
```
Usa las credenciales del `docker-compose.yml`. No requiere configuración adicional.

### Opción B — Neon / Supabase / Railway (producción)
1. Crear cuenta en [neon.tech](https://neon.tech) (recomendado para producción serverless) o [supabase.com](https://supabase.com).
2. Crear un nuevo proyecto/base de datos.
3. Copiar la **Connection String** en formato `postgresql://usuario:password@host:5432/db`.
4. Configurar en `.env`:
   ```env
   DATABASE_URL="postgresql://usuario:password@host:5432/nombre_db?schema=public&sslmode=require"
   ```
5. Ejecutar migraciones y RLS:
   ```bash
   cd api && npm run db:migrate
   # Luego aplicar manualmente en el SQL editor del proveedor:
   # 1. api/prisma/sql/rls_policies/migration.sql
   # 2. api/prisma/sql/rls_policies/migration_v2.sql
   ```
6. **Importante:** los scripts RLS crean un rol PostgreSQL llamado `gestpro_app` con permisos limitados (SELECT/INSERT/UPDATE/DELETE sin DROP). Cambiar su contraseña inmediatamente tras la primera aplicación:
   ```sql
   ALTER ROLE gestpro_app PASSWORD 'contraseña-segura-nueva';
   ```
   > Este rol es distinto del usuario administrador de la BD. Es el rol que usa la app en producción — tiene las políticas RLS aplicadas.

---

## 2. Redis — Caché y colas · REQUERIDO

**Qué hace:** caché de dashboards BI (15 min), colas BullMQ para generación de brochures PDF, bloqueo de TOTP fallidos.

### Opción A — Docker local (desarrollo)
```bash
docker compose up -d   # ya incluido, Redis en puerto 6379
```

### Opción B — Upstash (producción serverless)
1. Crear cuenta en [upstash.com](https://upstash.com).
2. Crear base de datos → elegir región más cercana (ej: `us-east-1`).
3. Copiar **Endpoint** y **Password** de la sección "REST API" o "Redis CLI".
4. Configurar en `.env`:
   ```env
   REDIS_HOST="tu-endpoint.upstash.io"
   REDIS_PORT=6379
   ```
   Si Upstash requiere TLS, ajustar `redis.service.ts` para agregar `tls: {}`.

### Opción C — Redis Cloud
1. Crear cuenta en [redis.com/try-free](https://redis.com/try-free/).
2. Crear suscripción gratuita → base de datos.
3. Copiar **Public endpoint** (host:puerto) y la **password**.
4. Configurar igual que Upstash.

---

## 3. JWT Secrets · REQUERIDO

**Qué hace:** firma y verifica los access tokens (15 min) y refresh tokens (7 días). Sin secreto fuerte el servidor no arranca.

1. Generar dos secretos aleatorios de al menos 32 caracteres:
   ```bash
   # PowerShell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | % {[char]$_})
   # O Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Configurar en `.env`:
   ```env
   JWT_ACCESS_SECRET="pega-aqui-el-primer-secreto-generado"
   JWT_REFRESH_SECRET="pega-aqui-el-segundo-secreto-generado"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   ```

---

## 4. Resend — Envío de emails · OPCIONAL (recomendado)

**Qué hace:** notificaciones transaccionales a agentes (alertas de visitas, pipeline, documentos) y emails de confirmación a clientes del portal.
Sin esto los emails son silenciosos no-ops, pero el sistema funciona.

1. Crear cuenta en [resend.com](https://resend.com).
2. Ir a **API Keys** → **Create API Key** → copiar la key (empieza con `re_`).
3. Ir a **Domains** → **Add Domain** → agregar y verificar tu dominio con los registros DNS que indica (SPF, DKIM).
4. Configurar en `.env`:
   ```env
   RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   EMAIL_FROM="GestPro <noreply@tudominio.com>"
   ```
   El `EMAIL_FROM` debe usar el dominio verificado en el paso 3.

---

## 5. Mapbox — Mapas y geocodificación · OPCIONAL

**Qué hace:** muestra mapa en el formulario de propiedad (CRM web y portal público), y geocodifica automáticamente direcciones al crear/editar propiedades desde el servidor.

1. Crear cuenta en [mapbox.com](https://www.mapbox.com/).
2. Ir a [account.mapbox.com](https://account.mapbox.com) → **Tokens** → **Create a token**.
3. Para el token de **servidor** (`MAPBOX_TOKEN`): permisos mínimos `styles:read`, `geocoding`.
4. Para el token de **navegador** (`VITE_MAPBOX_TOKEN`): agregar restricción de URL (solo tu dominio) para evitar uso no autorizado.
5. Configurar en `.env`:
   ```env
   MAPBOX_TOKEN="sk.eyJ1Ijoixxxxxxx..."       # token servidor (privado)
   VITE_MAPBOX_TOKEN="pk.eyJ1Ijoixxxxxxx..."   # token navegador (público)
   ```
   **Nota:** `VITE_MAPBOX_TOKEN` queda expuesto en el bundle del navegador — restringirlo por URL en el dashboard de Mapbox es importante en producción.

---

## 6. Google Maps — Geocodificación alternativa · OPCIONAL

**Qué hace:** geocodificación de direcciones en el formulario de propiedad como alternativa a Mapbox.

1. Ir a [console.cloud.google.com](https://console.cloud.google.com).
2. Crear o seleccionar un proyecto.
3. Ir a **APIs y servicios** → **Biblioteca** → buscar y habilitar **Geocoding API**.
4. Ir a **APIs y servicios** → **Credenciales** → **Crear credencial** → **Clave de API**.
5. En la clave creada: **Restricciones de API** → seleccionar "Geocoding API". En **Restricciones de aplicación** → HTTP referrers → agregar tu dominio.
6. Configurar en `.env`:
   ```env
   VITE_GOOGLE_MAPS_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   ```

---

## 7. Cloudflare R2 — Almacenamiento de archivos · OPCIONAL

**Qué hace:** almacena imágenes de propiedades, documentos y brochures PDF. Sin configurar, usa disco local (`api/uploads/`), que no persiste en despliegues serverless.

1. Crear cuenta en [cloudflare.com](https://cloudflare.com).
2. Ir a **R2 Object Storage** → **Create bucket** → elegir nombre (ej: `gestpro-files`).
3. En el bucket → **Settings** → **Public access** → habilitar si las imágenes deben ser públicas (para el portal).
4. Ir a **Manage R2 API Tokens** → **Create API Token** → permisos **Object Read & Write** en el bucket creado.
5. Anotar: Account ID (en la URL de R2), Access Key ID, Secret Access Key.
6. Configurar en `.env`:
   ```env
   R2_ACCOUNT_ID="tu_account_id"
   R2_ACCESS_KEY_ID="tu_access_key_id"
   R2_SECRET_ACCESS_KEY="tu_secret_access_key"
   R2_BUCKET="gestpro-files"
   R2_PUBLIC_URL="https://tu_account_id.r2.cloudflarestorage.com"
   # O si tienes dominio personalizado: "https://archivos.tudominio.com"
   ```

---

## 8. WhatsApp Business Cloud API · OPCIONAL

**Qué hace:** envía mensajes de WhatsApp a clientes directamente desde el CRM. Sin configurar, usa un link `wa.me/` como fallback.

1. Ir a [developers.facebook.com](https://developers.facebook.com) → **Mis apps** → **Crear app**.
2. Elegir tipo **Business** → configurar nombre y cuenta Business de Meta.
3. En el panel de la app → **Agregar producto** → **WhatsApp**.
4. Ir a **WhatsApp** → **Configuración de la API** → anotar el **Phone Number ID** del número de prueba.
5. Para producción: agregar y verificar un número real en **Números de teléfono** → seguir el proceso de verificación.
6. Generar un **Token de acceso de sistema permanente** en **Configuración del negocio** → **Usuarios del sistema** → asignar permisos `whatsapp_business_messaging`.
7. Configurar en `.env`:
   ```env
   WHATSAPP_PHONE_NUMBER_ID="123456789012345"
   WHATSAPP_API_TOKEN="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

---

## 9. Meta Graph API — Facebook e Instagram · OPCIONAL

**Qué hace:** publica propiedades directamente en la página de Facebook y cuenta de Instagram del negocio desde el CRM (sindicación).

1. En la misma app de Meta del paso anterior (o crear una nueva de tipo Business).
2. Agregar producto **Instagram Graph API** y **Pages API**.
3. Obtener un **Page Access Token** de larga duración:
   - Ir al [Explorador de la API Graph](https://developers.facebook.com/tools/explorer/).
   - Seleccionar tu app → generar token con permisos `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`.
   - Cambiar a token de larga duración con el endpoint `/oauth/access_token?grant_type=fb_exchange_token`.
4. Obtener el **Page ID**: en la página de Facebook → **Acerca de** → desplazarse hasta el final → ID de la página.
5. Obtener el **Instagram User ID**: llamar a `GET /{page-id}?fields=instagram_business_account` con el token.
6. Configurar en `.env`:
   ```env
   META_PAGE_ACCESS_TOKEN="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   META_PAGE_ID="123456789012345"
   META_IG_USER_ID="987654321098765"
   ```

---

## 10. Encuentra24 — Sindicación de propiedades · OPCIONAL

**Qué hace:** publica propiedades automáticamente en el portal Encuentra24 (Guatemala).

1. Contactar a Encuentra24 directamente en [encuentra24.com](https://www.encuentra24.com) para solicitar acceso a la API de desarrolladores (es un proceso comercial).
2. Recibirás una **API Key** por email tras la aprobación.
3. Configurar en `.env`:
   ```env
   ENCUENTRA24_API_KEY="tu_api_key"
   ENCUENTRA24_API_URL="https://api.encuentra24.com/v1"
   ```

---

## 11. MercadoLibre — Sindicación de propiedades · OPCIONAL

**Qué hace:** publica propiedades en MercadoLibre Inmuebles desde el CRM.

1. Crear cuenta de desarrollador en [developers.mercadolibre.com](https://developers.mercadolibre.com).
2. Ir a **Mis Apps** → **Crear aplicación**.
3. Configurar los **redirect URIs** de tu app.
4. Seguir el flujo OAuth 2.0 para obtener el **Access Token**:
   - Redirigir al usuario a `https://auth.mercadolibre.com.gt/authorization?response_type=code&client_id=TU_APP_ID&redirect_uri=TU_REDIRECT`
   - Intercambiar el código por el token con `POST /oauth/token`.
5. Configurar en `.env`:
   ```env
   ML_ACCESS_TOKEN="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```
   **Nota:** los tokens de MercadoLibre expiran en 6 horas. Implementar renovación automática con el `refresh_token`.

---

## 12. DocuSign — Firma digital de contratos · OPCIONAL

**Qué hace:** envía contratos de compra/renta a clientes para firma digital directamente desde el expediente de la propiedad.

1. Crear cuenta en [developers.docusign.com](https://developers.docusign.com) (cuenta demo gratuita).
2. Ir a **Apps and Keys** → **Add App and Integration Key**.
3. En la app creada:
   - Anotar el **Integration Key** (= Client ID) y el **Account ID** (en el perfil).
   - En **Authentication** → agregar **RSA Keypair** → copiar y guardar la clave privada generada.
   - En **Redirect URIs** → agregar la URL de callback de tu app.
4. Anotar el **User ID** de tu cuenta (en Settings → Apps and Keys → User ID).
5. Para pasar a producción: crear una app separada en [app.docusign.com](https://app.docusign.com) y repetir el proceso.
6. Configurar en `.env`:
   ```env
   DOCUSIGN_INTEGRATION_KEY="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   DOCUSIGN_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   DOCUSIGN_ACCOUNT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   DOCUSIGN_USER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   DOCUSIGN_RSA_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
   DOCUSIGN_BASE_URL="https://demo.docusign.net/restapi"   # demo
   # DOCUSIGN_BASE_URL="https://www.docusign.net/restapi"  # producción
   ```
   **Nota:** en la clave RSA, reemplazar saltos de línea reales por `\n` para incluirla en una sola línea del `.env`.

---

## 13. Zoom — Videollamadas en visitas · OPCIONAL

**Qué hace:** crea reuniones de Zoom automáticamente al programar una visita virtual desde el CRM.

1. Ir a [marketplace.zoom.us/develop/create](https://marketplace.zoom.us/develop/create).
2. Elegir **Server-to-Server OAuth** → asignar nombre a la app.
3. En la app creada → **App Credentials**: anotar **Account ID**, **Client ID**, **Client Secret**.
4. En **Scopes** → agregar `meeting:write:admin` y `meeting:read:admin`.
5. Activar la app en **Activation**.
6. Configurar en `.env`:
   ```env
   ZOOM_ACCOUNT_ID="xxxxxxxxxxxx"
   ZOOM_CLIENT_ID="xxxxxxxxxxxxxxxxxxxx"
   ZOOM_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

---

## 14. Sentry — Monitoreo de errores · OPCIONAL

**Qué hace:** captura errores y excepciones en producción con stack trace completo, trazas de performance y alertas por email.

1. Crear cuenta en [sentry.io](https://sentry.io) (plan gratuito disponible).
2. Crear dos proyectos: uno de tipo **Node.js** (para la API) y uno de tipo **React** (para el CRM web).
3. En cada proyecto → **Settings** → **Client Keys (DSN)** → copiar el DSN.
4. Configurar en `.env`:
   ```env
   SENTRY_DSN="https://xxxxxx@o0000000.ingest.sentry.io/0000000"   # API NestJS
   VITE_SENTRY_DSN="https://yyyyyy@o0000000.ingest.sentry.io/1111111"  # CRM web React
   ```

---

## Resumen de prioridades

| Servicio | Variable clave | Prioridad | Sin configurar |
|---|---|---|---|
| PostgreSQL | `DATABASE_URL` | **Requerido** | No arranca |
| Redis | `REDIS_HOST` | **Requerido** | No arranca |
| JWT Secrets | `JWT_ACCESS_SECRET` | **Requerido** | No arranca |
| Resend | `RESEND_API_KEY` | Alta | Sin emails |
| Mapbox / Google Maps | `VITE_MAPBOX_TOKEN` | Media | Sin mapas |
| Cloudflare R2 | `R2_BUCKET` | Media | Archivos locales |
| Sentry | `SENTRY_DSN` | Media | Sin monitoreo |
| WhatsApp | `WHATSAPP_API_TOKEN` | Baja | Link wa.me |
| Meta | `META_PAGE_ACCESS_TOKEN` | Baja | Sin sindicación |
| Encuentra24 / ML | `ENCUENTRA24_API_KEY` | Baja | Sin sindicación |
| DocuSign | `DOCUSIGN_INTEGRATION_KEY` | Baja | Sin firma digital |
| Zoom | `ZOOM_ACCOUNT_ID` | Baja | Sin videollamadas |
