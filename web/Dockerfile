# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN echo "fetch-retries=5\nfetch-retry-mintimeout=20000\nfetch-retry-maxtimeout=120000\nfetch-timeout=300000" > /root/.npmrc

COPY package*.json ./
COPY web/package*.json ./web/
COPY shared/package*.json ./shared/

RUN npm ci --workspace=web --workspace=shared --ignore-scripts

COPY shared/ ./shared/
COPY web/ ./web/

# ARGs inyectados en build time por docker-compose.prod.yml
ARG VITE_API_URL
ARG VITE_MAPBOX_TOKEN

WORKDIR /app/web
RUN npm run build

# ─── Stage 2: nginx ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
