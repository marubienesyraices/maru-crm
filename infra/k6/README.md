# Tests de carga — k6

## Prerrequisitos

```bash
# Instalar k6 (https://k6.io/docs/get-started/installation/)
# macOS:
brew install k6
# Windows (Winget):
winget install k6
# Linux:
sudo apt-get install k6
```

## Scripts disponibles

| Script | Escenario | VUs máx | Duración |
|:-------|:----------|:-------:|:---------|
| `auth.js` | Login + listado de propiedades | 50 | 2 min |
| `pipeline.js` | Pipeline, clientes, notificaciones | 50 | 3 min |
| `portal-publico.js` | Portal público sin auth | 100 | 3 min |

## Ejecutar

```bash
# Contra el entorno local
k6 run infra/k6/auth.js

# Contra staging
k6 run -e BASE_URL=https://api-staging.tudominio.com infra/k6/pipeline.js

# Con reporte HTML (requiere k6-reporter)
k6 run --out json=results.json infra/k6/auth.js
```

## Umbrales de aceptación (Sprint 14)

- `p(95)` latencia < **500ms** para endpoints autenticados
- `p(95)` latencia < **1 000ms** para portal SSR
- Tasa de error < **1%** en carga sostenida de 50 VUs
- Sin OOM / crash del proceso API después de 3 min a 50 VUs
