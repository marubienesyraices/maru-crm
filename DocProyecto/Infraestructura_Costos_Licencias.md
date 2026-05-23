# 2.2 Requerimientos de Infraestructura y Entornos
## CRM Inmobiliario "GestPro CRM Inmobiliario"

> **Versión:** 2.0 | **Fecha:** 12 de mayo de 2026
> **Sección:** Especificación Técnica — Infraestructura Azure, Costos y Modelo de Licencias SaaS
> **Modelo de despliegue:** Instancia única compartida (Single-Deployment Multitenant SaaS)

---

## Modelo de Despliegue: Instancia Única Compartida (Single-Deployment Multitenant)

A diferencia de modelos donde se instala una copia por cliente, **GestPro CRM se despliega una sola vez en Azure**. Todas las empresas que adquieran una licencia se conectan a esa misma instancia. El aislamiento de datos entre empresas se garantiza a nivel de base de datos mediante **PostgreSQL Row-Level Security (RLS)** — cada fila tiene un `tenant_id` y una política que impide que un tenant vea datos de otro, independientemente del código de aplicación.

```
                         ┌─────────────────────────────────┐
  Empresa A (Maru B.R.)  │                                 │
  Empresa B (Inmob. XYZ) │   GestPro CRM — Azure           │
  Empresa C (Casa Linda) │   Una sola instancia            │
  Empresa D (...)        │   compartida por todos          │
        │                │   los tenants                   │
        └───────────────►│                                 │
                         │  ┌─────────────────────────┐   │
                         │  │ PostgreSQL RLS          │   │
                         │  │ tenant_id = 'empresa-A' │   │
                         │  │ tenant_id = 'empresa-B' │   │
                         │  │ (datos completamente    │   │
                         │  │  aislados por policy)   │   │
                         │  └─────────────────────────┘   │
                         └─────────────────────────────────┘
```

**Ventajas del modelo:**
- Un solo equipo administra y actualiza la plataforma.
- Los costos de infraestructura se prorratean entre todos los tenants.
- Nuevos clientes se activan en segundos (solo se crea un registro en la tabla `empresas`).
- Las actualizaciones de funcionalidades llegan a todos los clientes simultáneamente.

---

## 2.2.1 Hardware Mínimo y Recomendado

El sistema se despliega íntegramente sobre **Microsoft Azure**. No se requiere hardware propio. Se documentan las especificaciones de los servicios Azure necesarios para cada entorno.

---

### Entorno de Desarrollo (Local — por desarrollador)

| Componente | Mínimo | Recomendado |
|:-----------|:-------|:------------|
| **CPU** | 4 núcleos / 2.0 GHz | 8 núcleos / 3.0 GHz |
| **RAM** | 8 GB | 16 GB |
| **Almacenamiento** | 50 GB SSD | 100 GB NVMe SSD |
| **SO** | Windows 10 / macOS 12 / Ubuntu 20.04 | Windows 11 / macOS 14 / Ubuntu 22.04 |
| **Conexión** | 10 Mbps simétrico | 50 Mbps fibra óptica |
| **Docker Desktop** | v4.x | v4.x (últimas actualizaciones) |
| **Node.js** | v20 LTS | v22 LTS |
| **PostgreSQL local** | v16 (via Docker) | v16 (via Docker) |
| **Redis local** | v7 (via Docker) | v7 (via Docker) |

> Con `docker compose up -d` se levantan PostgreSQL 16 y Redis 7 automáticamente. El entorno local replica la arquitectura de producción sin necesidad de conectarse a Azure.

---

### Entorno de Staging en Azure (Pre-producción — compartido por el equipo de desarrollo)

| Servicio Azure | SKU / Configuración | Propósito | Costo/Mes USD |
|:--------------|:--------------------|:----------|:-------------|
| **Azure Container Apps** | Consumption Plan — 0.5 vCPU / 1 GB RAM | API Backend (NestJS) | ~$15 |
| **Azure Container Apps** | Consumption Plan — 0.25 vCPU / 512 MB | Worker BullMQ | ~$8 |
| **Azure Static Web Apps** | Free Tier | CRM Web SPA (React) | $0 |
| **Azure Container Apps** | Consumption Plan — 0.5 vCPU / 1 GB RAM | Portal Público (Next.js SSR) | ~$15 |
| **Azure Database for PostgreSQL Flexible** | Burstable B1ms — 1 vCPU / 2 GB / 32 GB | Base de datos | ~$25 |
| **Azure Cache for Redis** | Basic C0 — 250 MB | Cache BI + BullMQ | ~$16 |
| **Azure Blob Storage** | LRS Standard — 50 GB | Multimedia + PDFs + Docs | ~$5 |
| **Azure CDN** | Standard Microsoft | Archivos estáticos | ~$3 |
| **Azure Key Vault** | Standard | Secretos y variables de entorno | ~$5 |
| **Azure Monitor + App Insights** | Basic | Logs y monitoreo básico | ~$10 |
| | | **TOTAL STAGING** | **~$102 USD/mes** |

---

### Entorno de Producción en Azure — Instancia Única Compartida

La producción es **una sola instancia** que escala automáticamente conforme se incorporan nuevos tenants. Se dimensiona para soportar hasta **200 empresas simultáneas** con carga normal.

#### Fase Inicial: 1–30 tenants activos

| Servicio Azure | SKU / Configuración | Propósito | Costo/Mes USD |
|:--------------|:--------------------|:----------|:-------------|
| **Azure Container Apps** | Dedicated — 2 vCPU / 4 GB RAM (min 1 réplica, max 3) | API Backend (NestJS) | ~$120 |
| **Azure Container Apps** | Dedicated — 1 vCPU / 2 GB RAM (min 1, max 2) | Worker BullMQ | ~$60 |
| **Azure Container Apps** | Consumption — 0.5 vCPU / 1 GB RAM | Cron Scheduler | ~$20 |
| **Azure Static Web Apps** | Standard | CRM Web SPA (React) | $9 |
| **Azure Container Apps** | Dedicated — 1 vCPU / 2 GB RAM (min 1, max 3) | Portal Público SSR | ~$60 |
| **Azure Database for PostgreSQL Flexible** | General Purpose D2s v3 — 2 vCPU / 8 GB / 128 GB SSD | PostgreSQL 16 + PostGIS | ~$185 |
| **Azure Cache for Redis** | Standard C1 — 1 GB con réplica | Cache BI + BullMQ + Sesiones | ~$55 |
| **Azure Blob Storage** | LRS Standard — 500 GB + CDN | Multimedia, PDFs, Documentos | ~$30 |
| **Azure CDN** | Standard Microsoft — 1 TB/mes | Assets estáticos + Blob | ~$15 |
| **Azure Application Gateway** | WAF v2 — Standard | WAF + Load Balancer + SSL | ~$130 |
| **Azure Key Vault** | Standard | Secretos, API keys, certificados | ~$5 |
| **Azure Monitor + App Insights** | Pay-as-you-go — 5 GB logs/mes | Monitoreo, alertas, trazas | ~$25 |
| **Azure Backup** | PostgreSQL backup automático 35 días | RPO < 24h | ~$20 |
| **Azure DNS** | Zona DNS + registros | Dominio principal + subdomains | ~$5 |
| **Resend (email)** | Pro — 100,000 emails/mes | Emails transaccionales y campañas | ~$20 |
| | | **TOTAL FASE INICIAL** | **~$759 USD/mes** |

---

#### Fase de Crecimiento: 31–100 tenants activos

| Servicio Azure | Cambio respecto a Fase Inicial | Costo/Mes USD |
|:--------------|:-------------------------------|:-------------|
| **Azure Container Apps — API** | Escala a 4 vCPU / 8 GB, max 5 réplicas | ~$250 |
| **Azure Container Apps — Worker** | Escala a 2 vCPU / 4 GB, max 4 réplicas | ~$125 |
| **Azure Container Apps — Portal** | Escala a 2 vCPU / 4 GB, max 5 réplicas | ~$125 |
| **Azure Database for PostgreSQL** | General Purpose D4s v3 — 4 vCPU / 16 GB / 512 GB + réplica lectura | ~$420 |
| **Azure Cache for Redis** | Standard C2 — 6 GB con réplica | ~$120 |
| **Azure Blob Storage** | 2 TB + CDN | ~$80 |
| **Azure Application Gateway WAF v2** | Sin cambio | ~$130 |
| **Demás servicios** | Sin cambios significativos | ~$85 |
| **Resend** | Scale — 500,000 emails/mes | ~$90 |
| | **TOTAL FASE CRECIMIENTO** | **~$1,425 USD/mes** |

---

#### Fase de Madurez: 101–300 tenants activos

| Servicio Azure | Configuración | Costo/Mes USD |
|:--------------|:-------------|:-------------|
| **Azure Container Apps — API** | 8 vCPU / 16 GB, auto-scale 2–10 réplicas | ~$520 |
| **Azure Container Apps — Worker** | 4 vCPU / 8 GB, auto-scale 2–8 réplicas | ~$260 |
| **Azure Container Apps — Portal** | 4 vCPU / 8 GB, auto-scale 2–8 réplicas | ~$260 |
| **Azure Database for PostgreSQL** | Memory Optimized E8ds v5 — 8 vCPU / 64 GB / 1 TB + 2 réplicas lectura | ~$900 |
| **Azure Cache for Redis** | Premium P1 — 6 GB, clustering, geo-replicación | ~$320 |
| **Azure Blob Storage** | 10 TB + CDN global | ~$300 |
| **Azure Application Gateway WAF v2** | Large + autoscale | ~$280 |
| **Azure Monitor** | 50 GB logs/mes + alertas + dashboards | ~$80 |
| **Azure Backup + Geo-redundancia** | RA-GRS para PostgreSQL y Blob | ~$120 |
| **Resend** | Business — 2M emails/mes | ~$200 |
| **Demás servicios** | DNS, Key Vault, Static Web Apps | ~$30 |
| | **TOTAL FASE MADUREZ** | **~$3,270 USD/mes** |

---

### Topología de Red en Azure — Producción

```
Internet
    │
    ▼
┌──────────────────────────────────────────────────┐
│              Azure Application Gateway            │
│         WAF v2 · SSL Termination · LB            │
│              (Public IP + Azure DNS)              │
└──────────┬───────────────────────────────────────┘
           │ HTTPS (TLS 1.3) — Virtual Network
           │
┌──────────▼────────────────────────────────────────────────────────┐
│                    Azure Virtual Network (VNet)                    │
│                                                                    │
│  ┌─────────────────────────┐  ┌────────────────────────────────┐  │
│  │  Azure Static Web Apps  │  │    Azure Container Apps Env    │  │
│  │  CRM Web SPA (React)    │  │                                │  │
│  │  (CDN edge global)      │  │  ┌────────────┐ ┌──────────┐  │  │
│  └─────────────────────────┘  │  │ API Backend│ │ Portal   │  │  │
│                                │  │ NestJS     │ │ Next.js  │  │  │
│                                │  │ (auto-     │ │ SSR      │  │  │
│  ┌─────────────────────────┐  │  │  scale)    │ │(auto-    │  │  │
│  │  Azure Blob Storage     │  │  └────────────┘ │ scale)   │  │  │
│  │  + CDN                  │  │  ┌────────────┐ └──────────┘  │  │
│  │  Multimedia, PDFs,      │  │  │ Worker     │               │  │
│  │  Documentos             │  │  │ BullMQ     │               │  │
│  └─────────────────────────┘  │  └────────────┘               │  │
│                                │  ┌────────────┐               │  │
│                                │  │ Cron       │               │  │
│                                │  │ Scheduler  │               │  │
│                                │  └────────────┘               │  │
│                                └────────────────────────────────┘  │
│                                           │ Private Endpoint        │
│            ┌──────────────────────────────┼──────────────────────┐ │
│            ▼                              ▼                      ▼ │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌────────────┐  │
│  │ Azure Database   │  │ Azure Cache for Redis │  │ Azure Key  │  │
│  │ PostgreSQL       │  │ Cache BI · BullMQ     │  │ Vault      │  │
│  │ Flexible Server  │  │ Sesiones              │  │ Secretos   │  │
│  │ RLS por tenant   │  └──────────────────────┘  └────────────┘  │
│  │ + Réplica lectura│                                              │
│  └──────────────────┘                                              │
└────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│              Azure Monitor + App Insights         │
│     Logs · Métricas · Alertas · Dashboards       │
└──────────────────────────────────────────────────┘
```

---

### Seguridad de Infraestructura en Azure

| Capa | Servicio Azure | Descripción |
|:-----|:-------------|:------------|
| **Perimetral** | Azure Application Gateway WAF v2 | Filtra OWASP Top 10, DDoS L7, rate limiting |
| **Red** | Azure Virtual Network + Private Endpoints | Bases de datos y caché solo accesibles dentro del VNet |
| **Transporte** | TLS 1.3 en Application Gateway | Todo tráfico exterior cifrado; interno por VNet |
| **Identidad** | Azure Managed Identity | Servicios se autentican entre sí sin credenciales hardcodeadas |
| **Secretos** | Azure Key Vault | API keys, connection strings, certificados gestionados centralmente |
| **Aplicación** | JWT + 2FA + RBAC + RLS | Autenticación y aislamiento multi-nivel |
| **Datos** | PostgreSQL RLS + cifrado en reposo (AES-256) | Aislamiento por tenant garantizado a nivel de BD |
| **Almacenamiento** | Azure Blob con SAS tokens (TTL) | Archivos accesibles solo mediante URLs firmadas temporales |
| **Backup** | Azure Backup + Geo-redundancia RA-GRS | RPO < 24h, RTO < 4h, retención 35 días |
| **Monitoreo** | Azure Monitor + App Insights + alertas | Detección de anomalías, alertas por email/SMS |

---

## 2.2.2 Estimación de Costos Total del Proyecto

### A. Inversión Inicial de Desarrollo (CAPEX)

| Fase | Módulos Cubiertos | Semanas | P50 (probable) | P80 (pesimista) |
|:-----|:-----------------|:--------|:--------------|:----------------|
| Fase 1 — Infraestructura y Seguridad | Multitenancy, Auth 2FA, RBAC, Auditoría, Azure setup | 4 | $10,000 | $12,000 |
| Fase 2 — Propiedades y Portal | Propiedades, Multimedia, Portal SSR, Brochure | 6 | $15,000 | $18,000 |
| Fase 3 — Embudo, Interacciones, Agenda | Pipeline Kanban, Timeline, Visitas, Búsqueda | 6 | $15,000 | $18,000 |
| Fase 4 — Marketing y BI | Meta API, Email, Dashboard, Ranking | 6 | $15,000 | $18,000 |
| Fase 5 — Integraciones, App y Go-Live | DocuSign, Zoom, App Móvil, QA, Deploy Azure Prod | 8 | $20,000 | $24,000 |
| **TOTAL DESARROLLO** | | **30 sem** | **$75,000** | **$90,000** |

> **Equipo supuesto:** 2 desarrolladores full-stack senior + 1 QA. Tarifa promedio: $35–$50 USD/hora.

### B. Costos Operativos Azure — Instancia Única Compartida (OPEX)

La clave del modelo es que **la infraestructura NO escala por tenant sino por carga agregada**. Agregar un nuevo cliente no incrementa linealmente el costo.

| Fase | Tenants activos | Costo infra Azure/mes | Costo soporte/mes | OPEX Total/mes |
|:-----|:---------------|:---------------------|:-----------------|:--------------|
| **Fase Inicial** | 1 – 30 | $759 | $800 | **$1,559** |
| **Fase Crecimiento** | 31 – 100 | $1,425 | $1,200 | **$2,625** |
| **Fase Madurez** | 101 – 300 | $3,270 | $2,000 | **$5,270** |

> **Eficiencia de escala:** pasar de 30 a 100 tenants (+233%) incrementa el costo de infra solo un 88% ($759 → $1,425). El margen mejora con cada cliente adicional.

---

## 2.2.3 Modelo de Licencias SaaS — Acceso a la Instancia Compartida

Las empresas no instalan nada. Compran una **licencia mensual** que les da acceso al servicio alojado en Azure. Al activar la licencia, el sistema crea automáticamente su tenant con RLS en la base de datos compartida.

### Planes de Licencia

| | **Plan Starter** | **Plan Professional** | **Plan Enterprise** |
|:--|:----------------|:---------------------|:-------------------|
| **Precio/mes** | **$149 USD** | **$349 USD** | **$699 USD** |
| Agentes incluidos | Hasta 5 | Hasta 20 | Hasta 50 |
| Agentes adicionales | — | $15/agente/mes | $12/agente/mes |
| Propiedades activas | Hasta 300 | Hasta 3,000 | Ilimitadas |
| Portal público SSR | ✅ | ✅ | ✅ |
| Brochure PDF | ✅ | ✅ | ✅ |
| App móvil | ❌ | ✅ | ✅ |
| Publicación Meta API | ❌ | ✅ | ✅ |
| Sindicación portales | ❌ | ✅ | ✅ |
| DocuSign / Zoom | ❌ | ❌ | ✅ |
| Dashboard BI | Básico | Completo | Completo + exportable |
| Emails incluidos/mes | 1,000 | 10,000 | 50,000 |
| Almacenamiento | 5 GB | 50 GB | 200 GB |
| SLA uptime | 99.5% | 99.9% | 99.9% |
| Soporte | Email (48h) | Chat (24h) | Prioritario (4h) |

### Costo de Infraestructura Azure por Tenant (Prorrateado)

El costo de infraestructura **no es por tenant** sino de la plataforma entera. El costo prorrateado por tenant disminuye conforme crece la base de clientes:

| Tenants activos | Costo infra total/mes | Costo infra por tenant |
|:----------------|:---------------------|:----------------------|
| 10 | $759 | $75.90 |
| 30 | $759 | $25.30 |
| 60 | $1,425 | $23.75 |
| 100 | $1,425 | $14.25 |
| 200 | $3,270 | $16.35 |
| 300 | $3,270 | $10.90 |

> A partir de **30 tenants**, el costo prorrateado de infra por tenant cae por debajo de $26 USD, garantizando márgenes positivos incluso en el Plan Starter ($149 USD).

---

## 2.2.4 Análisis Financiero

### Punto de Equilibrio (Break-Even)

**Supuestos:**
- Mix de clientes: 60% Starter, 30% Professional, 10% Enterprise
- Costo operativo fijo mensual (infra + soporte): **$1,559 USD** (fase inicial)

**Ingreso promedio ponderado por tenant:**

$$\bar{R} = (0.60 \times 149) + (0.30 \times 349) + (0.10 \times 699) = 89.4 + 104.7 + 69.9 = \$264 \text{ USD/tenant/mes}$$

**Costo de infra prorrateado por tenant (a 30 clientes):**

$$C_{infra} = \frac{\$1{,}559}{30} \approx \$52 \text{ USD/tenant/mes}$$

**Margen de contribución por tenant:**

$$MC = \$264 - \$52 = \$212 \text{ USD/tenant/mes}$$

**Tenants necesarios para cubrir OPEX total mensual ($1,559 infra + $800 soporte = $2,359):**

$$N_{BE} = \frac{\$2{,}359}{\$212} \approx \mathbf{12 \text{ tenants activos}}$$

> Con solo **12 clientes** la plataforma cubre todos sus costos operativos. Extremadamente bajo gracias al modelo de instancia compartida.

**Tenants necesarios para recuperar inversión inicial ($75,000) en 18 meses:**

$$N_{ROI} = \frac{(\$75{,}000 / 18) + \$2{,}359}{\$212} = \frac{\$4{,}167 + \$2{,}359}{\$212} = \frac{\$6{,}526}{\$212} \approx \mathbf{31 \text{ tenants}}$$

---

### Proyección Financiera a 5 Años

| Período | Tenants activos | Ingresos MRR | OPEX Azure + soporte | EBITDA mensual | EBITDA acumulado |
|:--------|:---------------|:------------|:--------------------|:--------------|:----------------|
| Año 0 (dev) | 0 | $0 | $75,000 (dev) | — | **-$75,000** |
| Año 1 — Q1 | 5 → 15 | $1,320 → $3,960 | $1,559 | $1,601–$2,401 | **-$62,500** |
| Año 1 — Q2/Q3/Q4 | 15 → 35 | $3,960 → $9,240 | $1,559–$2,625 | $3,615–$6,615 | **-$35,800** |
| **Año 1 total** | | ~$72,000 | ~$24,600 | ~$47,400 | **-$27,600** |
| **Año 2** | 35 → 80 | $105,000–$253,440 | $31,500 | ~$192,000 | **+$164,400** |
| **Año 3** | 80 → 140 | $253,440–$443,520 | $47,400 | ~$349,000 | **+$513,400** |
| **Año 4** | 140 → 200 | $443,520–$633,600 | $58,800 | ~$519,000 | **+$1,032,400** |
| **Año 5** | 200 → 300 | $633,600–$950,400 | $63,240 | ~$820,000 | **+$1,852,400** |

> **Payback de la inversión inicial:** Aproximadamente al **mes 15** (Q3 del Año 2).

---

### Indicadores Financieros Clave

| Indicador | Valor | Interpretación |
|:----------|:------|:---------------|
| **Break-even operativo** | 12 tenants | Alcanzable en los primeros 3 meses |
| **Payback inversión** | ~15 meses | Muy rápido para un proyecto SaaS |
| **VAN (5 años, tasa 12%)** | ~$1,100,000 USD | Altamente rentable |
| **TIR** | ~82% anual | Muy superior al costo de capital |
| **MRR año 2 (80 tenants)** | ~$21,120 USD/mes | |
| **LTV promedio (churn 4%/mes)** | $6,600 USD/tenant | LTV = $264 / 0.04 |
| **CAC estimado** | $300–$500 USD | Ratio LTV:CAC = 13:1 a 22:1 |
| **Margen bruto promedio** | ~80% | Modelo de instancia compartida muy eficiente |

---

### Análisis de Sensibilidad (±20%)

| Escenario | Tenants año 2 | Precio promedio | Payback | VAN 5 años |
|:----------|:-------------|:---------------|:--------|:-----------|
| **Pesimista** (-20%) | 64 | $211 | 22 meses | ~$640,000 |
| **Base** | 80 | $264 | 15 meses | ~$1,100,000 |
| **Optimista** (+20%) | 96 | $317 | 11 meses | ~$1,580,000 |

---

## 2.2.5 Comparativa de Precios vs. Competencia

| Producto | Modelo | Precio referencia | Por empresa 10 agentes |
|:---------|:-------|:-----------------|:----------------------|
| **Zoho CRM** | Por usuario | $49/usuario/mes | $490/mes |
| **HubSpot Sales Starter** | Por usuario | $90/usuario/mes | $900/mes |
| **Propertybase** | Por usuario | $89/usuario/mes | $890/mes |
| **Rex CRM** | Por usuario | $99/usuario/mes | $990/mes |
| **Follow Up Boss** | Por cuenta | $499/mes (hasta 10) | $499/mes |
| **GestPro Starter** | **Por empresa** | **$149/mes** | **$149/mes** |
| **GestPro Professional** | **Por empresa** | **$349/mes** | **$349/mes** |

> Con GestPro, una empresa de 10 agentes paga **hasta 6 veces menos** que con competidores de precio por usuario. Esta es la propuesta de valor central para el mercado centroamericano.

---

## 2.2.6 Estrategia de Onboarding de Nuevos Tenants

Al ser instancia única, incorporar un nuevo cliente es completamente automatizado:

```
Cliente compra licencia
        │
        ▼
Sistema crea registro en tabla "empresas"
  tenant_id = UUID generado
  plan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  estado = 'ACTIVA'
        │
        ▼
PostgreSQL activa políticas RLS para el nuevo tenant_id
(los datos del nuevo tenant quedan aislados automáticamente)
        │
        ▼
Sistema crea usuario ADMIN inicial
y envía email de onboarding (enlace de activación 48h)
        │
        ▼
Cliente configura su empresa: logo, colores, zona horaria
        │
        ▼
Cliente activo en producción — tiempo total: < 5 minutos
```

No se requiere intervención del equipo técnico para activar nuevos clientes.

---

## 2.2.7 Resumen Ejecutivo

| Dimensión | Decisión |
|:----------|:---------|
| **Proveedor cloud** | Microsoft Azure (instancia única) |
| **Modelo de despliegue** | Single-deployment multitenant — una sola app para todos los clientes |
| **Aislamiento de datos** | PostgreSQL Row-Level Security por `tenant_id` |
| **Inversión inicial** | $75,000 USD (P50) — recuperable en ~15 meses |
| **Costo de infraestructura** | $759/mes (1–30 tenants) → $3,270/mes (100–300 tenants) |
| **Break-even operativo** | 12 tenants activos |
| **Modelo de licencias** | SaaS B2B — $149 / $349 / $699 USD/mes por empresa |
| **Margen bruto** | ~80% a escala (instancia compartida muy eficiente en costos) |
| **VAN 5 años** | ~$1,100,000 USD | TIR ~82% |
| **Ventaja competitiva de precio** | Hasta 6x más barato que competidores por-usuario para empresas medianas |

---

### Comparativa con Competencia (Validación de Precios)

| CRM Competidor | Precio/mes | Agentes | Propiedades | ¿Multiempresa? |
|:--------------|:-----------|:--------|:------------|:---------------|
| **Zoho CRM** | $49–$99/usuario | Por usuario | Ilimitadas | No (por usuario) |
| **HubSpot Starter** | $50–$800/mes | Limitado | Ilimitadas | No |
| **Propertybase** | $89/usuario/mes | Por usuario | Ilimitadas | Parcial |
| **Follow Up Boss** | $69–$499/mes | 1–unlimited | Ilimitadas | No |
| **Rex CRM** | $99–$149/usuario/mes | Por usuario | Ilimitadas | No |
| **GestPro Starter** | **$149/empresa/mes** | Hasta 5 | Hasta 200 | **Sí (nativo)** |
| **GestPro Professional** | **$349/empresa/mes** | Hasta 20 | Hasta 2,000 | **Sí (nativo)** |

> **Ventaja competitiva de precio:** GestPro cobra **por empresa**, no **por usuario**. Para una empresa con 5 agentes, Zoho CRM costaría $245–$495/mes vs. $149/mes de GestPro Starter. La propuesta de valor es clara y el precio es competitivo para el mercado guatemalteco/centroamericano.

---

## 2.2.4 Resumen Ejecutivo de Infraestructura y Viabilidad

| Dimensión | Conclusión |
|:----------|:-----------|
| **Infraestructura** | 100% cloud-native. Sin inversión en hardware propio. Escalable desde $58 hasta $1,000+ USD/mes según el tamaño del tenant. |
| **Inversión inicial** | $75,000 USD (P50) — recuperable en 22 meses con 80 clientes activos. |
| **Modelo de licencias** | SaaS B2B por empresa. 3 planes ($149 / $349 / $999). Diferenciado y competitivo en el mercado centroamericano. |
| **Punto de equilibrio** | 40 clientes activos generan $11,760 MRR, suficiente para cubrir todos los costos operativos. |
| **TIR / VAN** | TIR ~68%, VAN ~$820,000 USD en 5 años. Proyecto altamente rentable. |
| **Riesgo financiero** | Bajo. El escenario pesimista (-20%) sigue siendo rentable con payback en 32 meses. |
