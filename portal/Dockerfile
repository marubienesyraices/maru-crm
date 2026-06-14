# ─── Stage 1: deps ───────────────────────────────────────────────────────────
# El portal no depende de otros workspaces: se instala aislado para evitar
# duplicados de react/react-dom que provoca el hoisting del monorepo.
FROM node:20-alpine AS deps
WORKDIR /app
RUN printf "fetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nfetch-timeout=300000\n" > /root/.npmrc
COPY portal/package.json ./
RUN npm install --ignore-scripts

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY portal/ .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S maru && adduser -S maru -G maru

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

RUN chown -R maru:maru /app
USER maru

EXPOSE 3001
ENV PORT=3001

CMD ["npx", "next", "start", "-p", "3001"]
