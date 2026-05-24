# Estudio de Factibilidad

## Proyecto: GestProp CRM

**Versión:** 1.0  
**Fecha:** 15 de mayo de 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Descripción del Proyecto](#2-descripción-del-proyecto)
3. [Factibilidad Técnica](#3-factibilidad-técnica)
   - 3.1 Evaluación de Tecnologías
   - 3.2 Capacidades del Equipo Técnico
   - 3.3 Conclusión Técnica
4. [Factibilidad Económica](#4-factibilidad-económica)
   - 4.1 Costos Actuales vs. Propuestos
   - 4.2 Inversión de Desarrollo
   - 4.3 Beneficios Tangibles e Intangibles
   - 4.4 Análisis Costo-Beneficio y Retorno de Inversión (ROI)
   - 4.5 Conclusión Económica
5. [Factibilidad Operativa](#5-factibilidad-operativa)
   - 5.1 Impacto Organizacional y Adopción
   - 5.2 Plan de Mitigación de Riesgos
   - 5.3 Conclusión Operativa
6. [Conclusión General y Recomendación](#6-conclusión-general-y-recomendación)

---

## 1. Introducción

El presente documento expone el Estudio de Factibilidad para la implementación de un sistema **CRM Inmobiliario** a la medida para la agencia **GestProp**. El objetivo de este análisis es evaluar si el proyecto cuenta con las bases técnicas, los recursos financieros y la capacidad operativa necesarios para desarrollarse, implementarse y sostenerse exitosamente en el tiempo, mitigando riesgos antes de la inversión principal.

## 2. Descripción del Proyecto

El proyecto consiste en el diseño y desarrollo de una plataforma CRM Inmobiliaria en la nube, con arquitectura *multitenant* (multiempresa). El sistema automatizará la gestión de inventario de propiedades, perfilamiento de prospectos (leads), control de flujo de ventas mediante un modelo Kanban y proporcionará analíticas de negocio en tiempo real. 

Además, contará con capacidades de integración a redes sociales, un portal público web para captura de interesados y notificaciones centralizadas. 

---

## 3. Factibilidad Técnica

Este apartado evalúa si la tecnología necesaria para el desarrollo del sistema existe y si el equipo cuenta con los conocimientos para implementarla.

### 3.1 Evaluación de Tecnologías

| Componente | Tecnología Propuesta | Madurez | Comunidad | Soporte LTS | Evaluación |
|:-----------|:---------------------|:--------|:----------|:------------|:-----------|
| **Frontend** | React 18+ con Vite | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| **Backend** | NestJS / Node.js | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |
| **Base de datos** | PostgreSQL + PostGIS | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| **ORM** | Prisma | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |
| **Caché** | Redis | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| **Almacenamiento** | AWS S3 / Cloudflare R2 | ✅ Madura | ✅ Masiva | ✅ Sí | **Viable** |
| **App Móvil** | React Native + Expo | ✅ Madura | ✅ Grande | ✅ Sí | **Viable** |

### 3.2 Capacidades del Equipo Técnico

| Requisito Técnico | Disponibilidad | Observación |
|:-------------------|:--------------|:------------|
| Desarrollo frontend (React/TypeScript) | ✅ Disponible | Stack moderno y ampliamente conocido en el equipo. |
| Desarrollo backend (Node.js/NestJS) | ✅ Disponible | Ecosistema JavaScript unificado que agiliza el desarrollo. |
| Administración de PostgreSQL | ✅ Disponible | Alta experiencia interna en bases de datos relacionales. |
| DevOps (Docker, CI/CD) | ✅ Disponible | Configuración estándar garantizada con GitHub Actions. |
| Integraciones API (Meta, etc.) | ⚠️ Parcial | Requiere investigación moderada para lidiar con rate limits y cuotas de APIs de terceros. |

### 3.3 Conclusión Técnica
> **El proyecto es TÉCNICAMENTE VIABLE.** El stack tecnológico propuesto es sumamente maduro, está documentado exhaustivamente y es un estándar probado en la industria moderna de desarrollo de software en la nube. 

---

## 4. Factibilidad Económica

Este punto evalúa la relación costo-beneficio del proyecto para garantizar su viabilidad financiera a mediano y largo plazo.

### 4.1 Costos Actuales vs. Propuestos

**Situación Actual (Proceso Manual y Fragmentado)**
| Concepto | Costo Mensual Estimado | Costo Anual Estimado |
|:---------|:----------------------|:------------|
| Tiempo administrativo (Excel, WhatsApp aislado) | $2,500 USD | $30,000 USD |
| Pérdida de leads por falta de seguimiento | $1,500 USD | $18,000 USD |
| Gastos fragmentados en marketing y publicación | $500 USD | $6,000 USD |
| Tiempo en generación de brochures / documentos | $300 USD | $3,600 USD |
| **Total Pérdidas y Costos Actuales** | **$4,800 USD** | **$57,600 USD** |

**Situación Propuesta (Sostenimiento del CRM)**
| Concepto | Costo Mensual Estimado | Costo Anual Estimado |
|:---------|:----------------------|:------------|
| Infraestructura cloud (DB, CDN, S3, Hosting) | $150–$400 USD | $1,800–$4,800 USD |
| Servicios de terceros (SendGrid, Mapas) | $50–$150 USD | $600–$1,800 USD |
| Mantenimiento y soporte técnico preventivo | $500–$1,000 USD | $6,000–$12,000 USD |
| **Total Mantenimiento Propuesto** | **$700–$1,550 USD** | **$8,400–$18,600 USD** |

### 4.2 Inversión de Desarrollo Inicial

El desarrollo abarca un estimado de **30 semanas** dividido en 5 fases, con un costo total estimado (incluyendo equipo de 2 a 3 desarrolladores) en un rango de **$60,000 a $90,000 USD**.

### 4.3 Beneficios Tangibles e Intangibles

*   **Tangibles:** 
    *   Ahorro operativo de ~60% en horas administrativas de agentes.
    *   Incremento proyectado de 30% a 50% en retención de prospectos (*leads*).
    *   Eliminación del pago de licencias a plataformas fragmentadas.
*   **Intangibles:** 
    *   Imagen corporativa y profesional hacia clientes y propietarios.
    *   Seguridad, encriptación, y trazabilidad total (evitando robos o fuga de carteras).
    *   Decisiones gerenciales basadas en datos exactos (*Business Intelligence*).

### 4.4 Análisis Costo-Beneficio y Retorno de Inversión (ROI)
Teniendo un ahorro operativo e incremento de ventas estimado de **$41,400 a $51,600 USD anuales** contra una inversión inicial máxima de **$90,000 USD**, se proyecta recuperar la inversión (Retorno de Inversión) en un período estimado de **14 a 26 meses**.

### 4.5 Conclusión Económica
> **El proyecto es ECONÓMICAMENTE VIABLE.** A pesar de requerir una inversión de desarrollo significativa, el período de recuperación es muy razonable para software corporativo. El ahorro en costos ocultos (tiempo y pérdida de negocios) justifica el gasto de capital inicial.

---

## 5. Factibilidad Operativa

Este segmento analiza si el proyecto será adoptado correctamente por el personal y se alinea a los procesos diarios de la empresa.

### 5.1 Impacto Organizacional y Adopción
El principal desafío en empresas inmobiliarias es la **resistencia al cambio** de los agentes acostumbrados a su libreta, Excel, o métodos análogos. Se ha clasificado el riesgo de adopción como **Medio**. 

### 5.2 Plan de Mitigación de Riesgos

| Riesgo / Factor Operativo | Estrategia de Mitigación Implementada |
|:--------------------------|:---------------------------------------|
| **Curva de Aprendizaje** | Interfaz intuitiva y moderna, uso de Tooltips en pantalla, y liberación progresiva de módulos funcionales (no todo de golpe). |
| **Migración de Datos** | Scripts masivos (CSV/Excel) en Fase 1 para no depender de la captura manual de miles de registros históricos de propiedades. |
| **Pruebas y Go-Live** | UAT (Pruebas de Aceptación de Usuario) con un grupo piloto de agentes *Early Adopters* antes del lanzamiento global en la agencia. |

### 5.3 Conclusión Operativa
> **El proyecto es OPERATIVAMENTE VIABLE.** Identificados los cuellos de botella organizacionales, se planea contrarrestarlos con un excelente diseño de interfaz y un esquema de capacitación y soporte escalonado.

---

## 6. Conclusión General y Recomendación

Con base en la evaluación de los tres pilares (Técnico, Económico y Operativo), el proyecto del **CRM Inmobiliario** cuenta con la solvencia tecnológica, genera un evidente retorno positivo a mediano plazo y mejora radicalmente los estándares de la operación empresarial. 

**Recomendación:** Se dictamina proceder con la ejecución del desarrollo conforme a la planificación en 5 Fases estipuladas en la hoja de ruta inicial, comenzando a la brevedad con la **Fase 1 (Seguridad e Infraestructura).**
