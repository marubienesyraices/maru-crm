# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

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
# Imagen dedicada a `prisma migrate deploy`. Conserva el CLI de Prisma (devDep)
# y fuerza la descarga del schema-engine en build time, para que las migraciones
# corran sin acceso a internet (la red `internal` del compose no tiene salida).
FROM builder AS migrator
WORKDIR /app/api
# Invoca el schema-engine en build para que su binario quede cacheado en la imagen
RUN npx prisma migrate diff --from-empty \
      --to-schema prisma/schema.prisma --script > /dev/null
CMD ["npx", "prisma", "migrate", "deploy"]

# ─── Stage 4: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S maru && adduser -S maru -G maru

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
