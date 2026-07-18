# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN printf "fetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nfetch-timeout=300000\n" > /root/.npmrc

COPY package*.json ./
COPY api/package*.json ./api/
COPY shared/package*.json ./shared/

RUN npm ci --workspace=api --workspace=shared --ignore-scripts

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# npm workspaces hoistea todo a /app/node_modules (no existe api/node_modules)
COPY --from=deps /app/node_modules ./node_modules

COPY package*.json ./
COPY shared/ ./shared/
COPY api/ ./api/

WORKDIR /app/api
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: migrator (one-shot) ────────────────────────────────────────────
# Imagen dedicada a `prisma migrate deploy`. Instala deps SIN --ignore-scripts
# para que el postinstall de Prisma descargue el schema-engine en build time
# (la red `internal` del compose no tiene salida a internet en runtime).
FROM node:20-alpine AS migrator
WORKDIR /app

RUN printf "fetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nfetch-timeout=300000\n" > /root/.npmrc

COPY package*.json ./
COPY api/package*.json ./api/
COPY shared/package*.json ./shared/
# Sin --ignore-scripts: Prisma descarga schema-engine + query-engine en build
RUN npm ci --workspace=api --workspace=shared

COPY api/prisma ./api/prisma
COPY api/prisma.config.ts ./api/prisma.config.ts
COPY shared/ ./shared/

WORKDIR /app/api
RUN npx prisma generate

CMD ["npx", "prisma", "migrate", "deploy"]

# ─── Stage 4: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# node:20-alpine no trae fuentes: sharp (libvips) rasteriza el <text> de la
# marca de agua (ImageService) vía Pango/librsvg, y sin fuentes instaladas
# cada carácter sale como un glifo "tofu" (cuadro vacío). fontconfig + DejaVu
# le dan un sans-serif real para resolver font-family:"Arial,Helvetica,sans-serif".
RUN apk add --no-cache fontconfig ttf-dejavu

RUN addgroup -S maru && adduser -S maru -G maru

RUN printf "fetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nfetch-timeout=300000\n" > /root/.npmrc

# Solo deps de producción
COPY package*.json ./
COPY api/package*.json ./api/
COPY shared/package*.json ./shared/
RUN npm ci --workspace=api --workspace=shared --omit=dev --ignore-scripts

COPY --from=builder /app/api/dist ./api/dist
# Prisma Client generado se hoistea a /app/node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY api/prisma ./api/prisma
COPY shared/ ./shared/

# Directorio para uploads locales (si no se usa R2)
RUN mkdir -p /app/api/uploads && chown -R maru:maru /app

USER maru

WORKDIR /app/api
EXPOSE 3000

# Nest compila a dist/src/main.js (hay .ts en la raíz de api/ que expanden rootDir)
CMD ["node", "dist/src/main"]
