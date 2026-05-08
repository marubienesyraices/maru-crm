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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules

COPY package*.json ./
COPY shared/ ./shared/
COPY api/ ./api/

WORKDIR /app/api
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S maru && adduser -S maru -G maru

# Solo deps de producción
COPY package*.json ./
COPY api/package*.json ./api/
COPY shared/package*.json ./shared/
RUN npm ci --workspace=api --workspace=shared --omit=dev --ignore-scripts

COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/node_modules/.prisma ./api/node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY api/prisma ./api/prisma
COPY shared/ ./shared/

# Directorio para uploads locales (si no se usa R2)
RUN mkdir -p /app/api/uploads && chown -R maru:maru /app

USER maru

WORKDIR /app/api
EXPOSE 3000

CMD ["node", "dist/main"]
