import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  BrochureSeccion,
  DEFAULT_BROCHURE_SECTIONS,
  SECCION_COLUMNA_IZQUIERDA,
  SECCION_COLUMNA_DERECHA,
} from '../config-documentos/brochure-sections.default';

const PDFDocument = require('pdfkit');

const TIPO_LABELS: Record<string, string> = {
  CASA: 'Casa',
  APARTAMENTO: 'Apartamento',
  TERRENO: 'Terreno',
  LOCAL_COMERCIAL: 'Local Comercial',
  OFICINA: 'Oficina',
  BODEGA: 'Bodega',
  FINCA: 'Finca',
  EDIFICIO: 'Edificio',
  OTRO: 'Otro',
};

const GESTION_LABELS: Record<string, string> = {
  VENTA: 'EN VENTA',
  RENTA: 'EN RENTA',
  AMBAS: 'VENTA / RENTA',
};

export function formatMoney(val: any, currency = 'GTQ') {
  if (!val) return null;
  const n = Number(val);
  return `${currency} ${n.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

/** Prioridad: moneda propia de la propiedad > moneda del tenant > GTQ. */
export function resolveCurrency(
  propiedad: { moneda?: string | null },
  tenant: { moneda?: string | null },
): string {
  return propiedad.moneda || tenant.moneda || 'GTQ';
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function darken(hex: string, amount = 0.15): string {
  const [r, g, b] = hexToRgb(hex);
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${d(r).toString(16).padStart(2, '0')}${d(g).toString(16).padStart(2, '0')}${d(b).toString(16).padStart(2, '0')}`;
}

export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

/** Fetch image buffer: local path or remote URL */
async function fetchImageBuffer(
  storage: StorageService,
  imgUrl: string,
): Promise<Buffer | null> {
  // Try local path first
  const p = storage.localPath(imgUrl);
  if (p && existsSync(p)) {
    const { readFile } = require('fs/promises');
    return readFile(p);
  }
  // Remote URL (R2/CDN) — fetch via HTTP
  if (imgUrl.startsWith('http')) {
    try {
      const res = await fetch(imgUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  return null;
}

/** Draw one image clipped to a rectangle; silently skips if load fails. */
function drawImg(
  doc: any,
  imgBuffer: Buffer | null,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!imgBuffer) return false;
  try {
    doc.save();
    doc.rect(x, y, w, h).clip();
    doc.image(imgBuffer, x, y, {
      cover: [w, h],
      align: 'center',
      valign: 'center',
    });
    doc.restore();
    return true;
  } catch {
    doc.restore();
    return false;
  }
}

/**
 * Dibuja la cabecera del brochure de forma consistente en ambas páginas.
 * Logo a la izquierda (dimensiones reales calculadas), texto a la derecha del logo.
 * Retorna la altura total del header dibujado.
 */
function drawHeader(
  doc: any,
  opts: {
    W: number;
    MARGIN: number;
    primary: string;
    primaryDark: string;
    onPrimary: string;
    logoBuf: Buffer | null;
    tenantNombre: string;
    line1: string;
    line2?: string;
    tagline?: string;
    badgeText?: string;
    headerH: number;
  },
): number {
  const {
    W,
    MARGIN,
    primary,
    primaryDark,
    onPrimary,
    logoBuf,
    tenantNombre,
    line1,
    line2,
    tagline,
    badgeText,
    headerH,
  } = opts;

  doc.rect(0, 0, W, headerH).fill(primary);
  doc.rect(0, 0, W, 4).fill(primaryDark);

  const LOGO_MAX_W = 150;
  const LOGO_MAX_H = headerH - 20;
  let logoDrawW = 0;

  if (logoBuf) {
    try {
      const imgObj = doc.openImage(logoBuf);
      const ratio = imgObj.width / imgObj.height;
      let dh = Math.min(LOGO_MAX_H, LOGO_MAX_W / ratio);
      let dw = dh * ratio;
      if (dw > LOGO_MAX_W) {
        dw = LOGO_MAX_W;
        dh = dw / ratio;
      }
      const logoY = (headerH - dh) / 2;
      doc.image(logoBuf, MARGIN, logoY, { width: dw, height: dh });
      logoDrawW = dw + 12; // margen derecho del logo
    } catch {
      /* usa texto */
    }
  }

  const textX = MARGIN + logoDrawW;
  const badgeW = 100;
  const badgeX = W - MARGIN - badgeW;
  const textMaxW = badgeX - textX - 8;

  if (logoDrawW === 0) {
    // Sin logo: nombre de empresa como texto
    doc
      .fillColor(onPrimary)
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(tenantNombre, textX, 16, { width: textMaxW, lineBreak: false });
  }

  doc
    .fillColor(onPrimary)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(line1, textX, logoDrawW > 0 ? 14 : 40, {
      width: textMaxW,
      lineBreak: false,
    });

  if (line2) {
    doc
      .fillColor(onPrimary)
      .font('Helvetica')
      .fontSize(8.5)
      .opacity(0.8)
      .text(line2, textX, doc.y + 3, { width: textMaxW, lineBreak: false })
      .opacity(1);
  }

  if (tagline) {
    doc
      .fillColor(onPrimary)
      .font('Helvetica')
      .fontSize(7.5)
      .opacity(0.65)
      .text(tagline, textX, doc.y + 3, { width: textMaxW, lineBreak: false })
      .opacity(1);
  }

  if (badgeText) {
    doc.roundedRect(badgeX, 14, badgeW, 22, 4).fill(primaryDark);
    doc
      .fillColor(onPrimary)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(badgeText, badgeX, 21, {
        width: badgeW,
        align: 'center',
        lineBreak: false,
      });
  }

  return headerH;
}

@Injectable()
export class BrochureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async generateBuffer(
    propiedadId: string,
    tenantId: string,
  ): Promise<{ buffer: Buffer; codigo: string }> {
    const [propiedad, configIntegraciones, configBrochureRow] =
      await Promise.all([
        this.prisma.propiedad.findFirst({
          where: { id: propiedadId, tenant_id: tenantId },
          include: {
            propietario: { select: { nombre: true, telefono: true } },
            agente: { select: { nombre: true, email: true } },
            imagenes: { orderBy: { orden: 'asc' }, take: 20 },
            tenant: {
              select: {
                nombre: true,
                moneda: true,
                color_primario: true,
                logo_url: true,
              },
            },
          },
        }),
        this.prisma.configIntegraciones.findUnique({
          where: { tenant_id: tenantId },
          select: {
            carta_color_primario: true,
            carta_tagline: true,
            carta_logo_url: true,
          },
        }),
        this.prisma.configBrochure.findUnique({
          where: { tenant_id: tenantId },
        }),
      ]);

    // Resolve section config (sorted by order, using defaults when not configured)
    const rawSecciones =
      Array.isArray(configBrochureRow?.secciones) &&
      (configBrochureRow.secciones as unknown as BrochureSeccion[]).length > 0
        ? (configBrochureRow.secciones as unknown as BrochureSeccion[])
        : DEFAULT_BROCHURE_SECTIONS;
    const secciones = rawSecciones.slice().sort((a, b) => a.order - b.order);
    const seccionVisible = (id: string) =>
      secciones.find((s) => s.id === id)?.visible !== false;
    const seccionLabel = (id: string, fallback: string) =>
      secciones.find((s) => s.id === id)?.label ?? fallback;

    const footerTexto = configBrochureRow?.footer_texto ?? null;
    const watermarkTexto = configBrochureRow?.watermark_texto ?? 'CONFIDENCIAL';

    // Left-column sections in configured order
    const seccionesIzq = secciones.filter(
      (s) => SECCION_COLUMNA_IZQUIERDA.has(s.id) && s.visible,
    );
    // Right-column sections in configured order
    const seccionesDer = secciones.filter(
      (s) => SECCION_COLUMNA_DERECHA.has(s.id) && s.visible,
    );

    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    const W = 595.28;
    const H = 841.89;
    const MARGIN = 40;
    const CONTENT_W = W - MARGIN * 2;

    // Carta config overrides tenant defaults for visual consistency across all PDFs
    const primary =
      configIntegraciones?.carta_color_primario ||
      (propiedad.tenant as any).color_primario ||
      '#2563eb';
    const primaryDark = darken(primary, 0.18);
    const onPrimary = isLight(primary) ? '#1e293b' : '#ffffff';
    const currency = resolveCurrency(propiedad, propiedad.tenant);
    const gestionLabel = GESTION_LABELS[propiedad.gestion] || propiedad.gestion;
    const tipoLabel = TIPO_LABELS[propiedad.tipo] || propiedad.tipo;
    const fecha = new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Separate images into hero (0-2), gallery strip (3-6), page2 (7+)
    const coverImg =
      propiedad.imagenes.find((i) => i.tipo === 'portada') ??
      propiedad.imagenes[0];
    const rest = propiedad.imagenes.filter((i) => i !== coverImg);
    const heroSide = rest.slice(0, 2); // up to 2 side images
    const galleryRow = rest.slice(2, 6); // up to 4 gallery strip images
    const page2Imgs = rest.slice(6); // remainder → page 2

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Pre-fetch all image buffers (local or R2/CDN)
    // Carta logo takes priority over tenant logo
    const tenantLogoUrl =
      configIntegraciones?.carta_logo_url ||
      ((propiedad.tenant as any).logo_url as string | null);
    const imgCache = new Map<string, Buffer | null>();
    const allImgUrls = propiedad.imagenes.map((i) => i.url);
    if (tenantLogoUrl) allImgUrls.push(tenantLogoUrl);
    await Promise.all(
      allImgUrls.map(async (url) => {
        imgCache.set(url, await fetchImageBuffer(this.storage, url));
      }),
    );

    // ════════════════════════════════════════════════════════════
    // PAGE 1
    // ════════════════════════════════════════════════════════════

    doc.rect(0, 0, W, H).fill('#f8fafc');

    // ─── Header (0–90) ───────────────────────────────────────────
    const tagline = configIntegraciones?.carta_tagline;
    drawHeader(doc, {
      W,
      MARGIN,
      primary,
      primaryDark,
      onPrimary,
      logoBuf: tenantLogoUrl ? (imgCache.get(tenantLogoUrl) ?? null) : null,
      tenantNombre: propiedad.tenant.nombre,
      line1: propiedad.tenant.nombre,
      line2: `${tipoLabel}  ·  ${propiedad.codigo}`,
      tagline: tagline ?? undefined,
      badgeText: gestionLabel,
      headerH: 90,
    });

    // ─── Hero image section (90–290) ─────────────────────────────
    // Layout: cover image takes left 63%, two side images stack on right 37%
    const HERO_Y = 90;
    const HERO_H = 200;
    const MAIN_W = heroSide.length > 0 ? Math.round(W * 0.63) : W;
    const SIDE_W = W - MAIN_W;
    const SIDE_H = Math.round(HERO_H / 2) - 1;

    let heroRendered = false;
    if (coverImg) {
      heroRendered = drawImg(
        doc,
        imgCache.get(coverImg.url) ?? null,
        0,
        HERO_Y,
        MAIN_W,
        HERO_H,
      );
    }
    if (!heroRendered) {
      doc.rect(0, HERO_Y, MAIN_W, HERO_H).fill('#cbd5e1');
      doc
        .fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(13)
        .text(tipoLabel, 0, HERO_Y + HERO_H / 2 - 8, {
          width: MAIN_W,
          align: 'center',
        });
    }

    // Side images (stacked)
    heroSide.forEach((img, i) => {
      const sy = HERO_Y + i * (SIDE_H + 2);
      const rendered = drawImg(
        doc,
        imgCache.get(img.url) ?? null,
        MAIN_W + 1,
        sy,
        SIDE_W - 1,
        SIDE_H,
      );
      if (!rendered) {
        doc.rect(MAIN_W + 1, sy, SIDE_W - 1, SIDE_H).fill('#e2e8f0');
      }
    });
    // Fill any unused side slots with a placeholder color
    if (heroSide.length === 0 && MAIN_W < W) {
      doc.rect(MAIN_W + 1, HERO_Y, SIDE_W - 1, HERO_H).fill('#e2e8f0');
    } else if (heroSide.length === 1) {
      doc
        .rect(MAIN_W + 1, HERO_Y + SIDE_H + 2, SIDE_W - 1, SIDE_H)
        .fill('#e2e8f0');
    }

    // Thin separator line between main and side panel
    if (heroSide.length > 0) {
      doc.rect(MAIN_W, HERO_Y, 1, HERO_H).fill('#ffffff');
      doc.rect(MAIN_W + 1, HERO_Y + SIDE_H, SIDE_W - 1, 2).fill('#ffffff');
    }

    // ─── Title card (below hero images) ──────────────────────────
    const CARD_Y = HERO_Y + HERO_H + 10;
    const CARD_H = 66;
    doc
      .roundedRect(MARGIN - 4, CARD_Y, CONTENT_W + 8, CARD_H, 6)
      .fill('#ffffff');
    doc.rect(MARGIN - 4, CARD_Y, 4, CARD_H).fill(primary);

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(propiedad.titulo, MARGIN + 8, CARD_Y + 10, {
        width: CONTENT_W - 8,
        lineBreak: true,
        lineGap: 1,
      });
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(9)
      .text(
        `${tipoLabel}  ·  ${propiedad.codigo}`,
        MARGIN + 8,
        Math.min(doc.y + 1, CARD_Y + 44),
      );

    // ─── Price cards ──────────────────────────────────────────────
    let y = CARD_Y + CARD_H + 12;
    const prices: { label: string; value: string }[] = [];
    if (propiedad.precio_venta)
      prices.push({
        label: 'PRECIO DE VENTA',
        value: formatMoney(propiedad.precio_venta, currency)!,
      });
    if (propiedad.precio_renta)
      prices.push({
        label: 'RENTA MENSUAL',
        value: formatMoney(propiedad.precio_renta, currency)!,
      });

    if (prices.length) {
      const priceCardW = prices.length === 1 ? CONTENT_W : (CONTENT_W - 10) / 2;
      prices.forEach((p, i) => {
        const px = MARGIN + i * (priceCardW + 10);
        doc.roundedRect(px, y, priceCardW, 44, 5).fill(primary);
        doc
          .fillColor(onPrimary)
          .font('Helvetica')
          .fontSize(7.5)
          .text(p.label, px + 12, y + 8, {
            width: priceCardW - 24,
            lineBreak: false,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .text(p.value, px + 12, y + 20, {
            width: priceCardW - 24,
            lineBreak: false,
          });
      });
      y += 56;
    }

    // ─── Separator ────────────────────────────────────────────────
    doc
      .moveTo(MARGIN, y)
      .lineTo(W - MARGIN, y)
      .strokeColor(primary)
      .lineWidth(1)
      .stroke();
    y += 14;

    // ─── Two-column content ───────────────────────────────────────
    const COL_GAP = 16;
    const COL_LEFT_W = Math.round(CONTENT_W * 0.62);
    const COL_RIGHT_W = CONTENT_W - COL_LEFT_W - COL_GAP;
    const COL_RIGHT_X = MARGIN + COL_LEFT_W + COL_GAP;
    let yLeft = y;
    let yRight = y;

    // Left column: render sections in configured order
    for (const sec of seccionesIzq) {
      if (sec.id === 'descripcion' && propiedad.descripcion) {
        doc
          .fillColor('#374151')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(
            seccionLabel('descripcion', 'DESCRIPCIÓN').toUpperCase(),
            MARGIN,
            yLeft,
          );
        yLeft = doc.y + 4;
        doc
          .fillColor('#4b5563')
          .font('Helvetica')
          .fontSize(9)
          .text(propiedad.descripcion, MARGIN, yLeft, {
            width: COL_LEFT_W,
            lineGap: 2,
          });
        yLeft = doc.y + 14;
      }

      if (sec.id === 'caracteristicas') {
        const features: { label: string; value: string }[] = [];
        if (propiedad.habitaciones != null)
          features.push({
            label: 'Habitaciones',
            value: String(propiedad.habitaciones),
          });
        if (propiedad.banos != null)
          features.push({ label: 'Baños', value: String(propiedad.banos) });
        if (propiedad.parqueos != null)
          features.push({
            label: 'Parqueos',
            value: String(propiedad.parqueos),
          });
        if (propiedad.niveles != null)
          features.push({ label: 'Niveles', value: String(propiedad.niveles) });
        if (propiedad.area_terreno_m2)
          features.push({
            label: 'Área terreno',
            value: `${Number(propiedad.area_terreno_m2).toLocaleString('es-GT')} m²`,
          });
        if (propiedad.area_construccion_m2)
          features.push({
            label: 'Área construida',
            value: `${Number(propiedad.area_construccion_m2).toLocaleString('es-GT')} m²`,
          });
        if (propiedad.ano_construccion)
          features.push({
            label: 'Año',
            value: String(propiedad.ano_construccion),
          });
        if (propiedad.estado)
          features.push({ label: 'Estado', value: propiedad.estado });

        if (features.length) {
          doc
            .fillColor('#374151')
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .text(
              seccionLabel('caracteristicas', 'CARACTERÍSTICAS').toUpperCase(),
              MARGIN,
              yLeft,
            );
          yLeft += 14;
          const featureColW = (COL_LEFT_W - 8) / 2;
          features.forEach((f, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const fx = MARGIN + col * (featureColW + 8);
            const fy = yLeft + row * 34;
            doc.rect(fx, fy, featureColW, 30).fill('#f1f5f9');
            doc.rect(fx, fy, 3, 30).fill(primary);
            doc
              .fillColor('#64748b')
              .font('Helvetica')
              .fontSize(7.5)
              .text(f.label.toUpperCase(), fx + 7, fy + 5, {
                width: featureColW - 10,
                lineBreak: false,
              });
            doc
              .fillColor('#1e293b')
              .font('Helvetica-Bold')
              .fontSize(12)
              .text(f.value, fx + 7, fy + 14, {
                width: featureColW - 10,
                lineBreak: false,
              });
          });
          yLeft += Math.ceil(features.length / 2) * 34 + 14;
        }
      }

      if (
        sec.id === 'amenidades' &&
        Array.isArray(propiedad.amenidades) &&
        (propiedad.amenidades as string[]).length > 0
      ) {
        doc
          .fillColor('#374151')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(
            seccionLabel('amenidades', 'AMENIDADES').toUpperCase(),
            MARGIN,
            yLeft,
          );
        yLeft += 12;
        doc
          .fillColor('#4b5563')
          .font('Helvetica')
          .fontSize(9)
          .text(
            (propiedad.amenidades as string[]).slice(0, 10).join('  ·  '),
            MARGIN,
            yLeft,
            { width: COL_LEFT_W },
          );
        yLeft = doc.y + 10;
      }
    }

    // Right column: render sections in configured order
    const locationParts = [
      propiedad.zona,
      propiedad.municipio,
      propiedad.departamento,
    ]
      .filter(Boolean)
      .join(', ');
    for (const sec of seccionesDer) {
      if (sec.id === 'ubicacion' && (locationParts || propiedad.direccion)) {
        doc.roundedRect(COL_RIGHT_X, yRight, COL_RIGHT_W, 2, 0).fill(primary);
        doc.rect(COL_RIGHT_X, yRight, COL_RIGHT_W, 80).fill('#f8fafc');
        doc
          .fillColor(primary)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(
            seccionLabel('ubicacion', 'UBICACIÓN').toUpperCase(),
            COL_RIGHT_X + 10,
            yRight + 8,
          );
        doc
          .fillColor('#1e293b')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(locationParts || '', COL_RIGHT_X + 10, yRight + 22, {
            width: COL_RIGHT_W - 20,
          });
        if (propiedad.direccion) {
          doc
            .fillColor('#64748b')
            .font('Helvetica')
            .fontSize(8.5)
            .text(propiedad.direccion, COL_RIGHT_X + 10, doc.y + 2, {
              width: COL_RIGHT_W - 20,
            });
        }
        if (propiedad.pais) {
          doc
            .fillColor('#94a3b8')
            .font('Helvetica')
            .fontSize(8)
            .text(propiedad.pais, COL_RIGHT_X + 10, doc.y + 2, {
              width: COL_RIGHT_W - 20,
            });
        }
        yRight += 88;
      }

      if (sec.id === 'agente' && propiedad.agente) {
        doc.roundedRect(COL_RIGHT_X, yRight, COL_RIGHT_W, 2, 0).fill(primary);
        doc.rect(COL_RIGHT_X, yRight, COL_RIGHT_W, 80).fill('#f0f9ff');
        doc
          .fillColor(primary)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(
            seccionLabel('agente', 'AGENTE A CARGO').toUpperCase(),
            COL_RIGHT_X + 10,
            yRight + 8,
          );
        const initials = propiedad.agente.nombre
          .split(' ')
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('');
        doc
          .circle(COL_RIGHT_X + COL_RIGHT_W / 2, yRight + 40, 18)
          .fill(primary);
        doc
          .fillColor(onPrimary)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(initials, COL_RIGHT_X + COL_RIGHT_W / 2 - 11, yRight + 33, {
            width: 22,
            align: 'center',
            lineBreak: false,
          });
        doc
          .fillColor('#1e293b')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(propiedad.agente.nombre, COL_RIGHT_X + 10, yRight + 62, {
            width: COL_RIGHT_W - 20,
            align: 'center',
          });
        yRight += 88;
        if (propiedad.agente.email) {
          doc
            .fillColor('#475569')
            .font('Helvetica')
            .fontSize(8)
            .text(propiedad.agente.email, COL_RIGHT_X, yRight + 2, {
              width: COL_RIGHT_W,
              align: 'center',
            });
          yRight += 18;
        }
      }
    }

    // ─── Gallery strip (images 3–6) ───────────────────────────────
    const FOOTER_H = 38;
    const FOOTER_Y = H - FOOTER_H;
    const GALLERY_H = 75;
    const GALLERY_LABEL_H = 16;
    const GALLERY_TOTAL = GALLERY_LABEL_H + GALLERY_H + 10;

    if (galleryRow.length > 0 && seccionVisible('galeria_strip')) {
      const yContent = Math.max(yLeft, yRight);
      // Place gallery strip just above footer; only draw if it doesn't overlap content
      const GALLERY_Y = FOOTER_Y - GALLERY_TOTAL;

      if (yContent + 12 < GALLERY_Y) {
        // Section label
        doc
          .fillColor('#374151')
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(
            seccionLabel('galeria_strip', 'GALERÍA').toUpperCase(),
            MARGIN,
            GALLERY_Y,
          );

        // Thin separator
        const sepX = MARGIN + 54;
        doc
          .moveTo(sepX, GALLERY_Y + 7)
          .lineTo(W - MARGIN, GALLERY_Y + 7)
          .strokeColor('#e2e8f0')
          .lineWidth(0.75)
          .stroke();

        const gap = 4;
        const thumbW =
          (CONTENT_W - gap * (galleryRow.length - 1)) / galleryRow.length;
        const thumbY = GALLERY_Y + GALLERY_LABEL_H;

        galleryRow.forEach((img, i) => {
          const tx = MARGIN + i * (thumbW + gap);
          const rendered = drawImg(
            doc,
            imgCache.get(img.url) ?? null,
            tx,
            thumbY,
            thumbW,
            GALLERY_H,
          );
          if (!rendered) {
            doc.rect(tx, thumbY, thumbW, GALLERY_H).fill('#e2e8f0');
          }
          // Subtle color accent at bottom of each thumb
          doc
            .rect(tx, thumbY + GALLERY_H - 3, thumbW, 3)
            .fill(primary)
            .opacity(0.6);
          doc.opacity(1);
        });
      }
    }

    // ─── Footer ───────────────────────────────────────────────────
    const footerLeft =
      footerTexto ??
      `${propiedad.tenant.nombre}  ·  Código ${propiedad.codigo}  ·  ${fecha}`;
    doc.rect(0, FOOTER_Y, W, FOOTER_H).fill(primaryDark);
    doc.rect(0, FOOTER_Y, W, 2).fill(primary);
    doc
      .fillColor(onPrimary)
      .opacity(0.9)
      .font('Helvetica')
      .fontSize(7.5)
      .text(footerLeft, MARGIN, FOOTER_Y + 10, {
        width: CONTENT_W - 60,
        align: 'left',
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .text(watermarkTexto, W - MARGIN - 80, FOOTER_Y + 10, {
        width: 80,
        align: 'right',
        lineBreak: false,
      });
    doc.opacity(1);

    // ════════════════════════════════════════════════════════════
    // PAGE 2 — Photo gallery (if more than 6 extra images)
    // ════════════════════════════════════════════════════════════
    if (page2Imgs.length > 0 && seccionVisible('galeria_pagina2')) {
      doc.addPage({ size: 'A4', margin: 0 });
      doc.rect(0, 0, W, H).fill('#f8fafc');

      // Compact header — misma función que página 1
      drawHeader(doc, {
        W,
        MARGIN,
        primary,
        primaryDark,
        onPrimary,
        logoBuf: tenantLogoUrl ? (imgCache.get(tenantLogoUrl) ?? null) : null,
        tenantNombre: propiedad.tenant.nombre,
        line1: propiedad.tenant.nombre,
        line2: `Galería de fotos  ·  ${propiedad.codigo}`,
        headerH: 72,
      });

      // Section title (debajo del header de 72px)
      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('GALERÍA FOTOGRÁFICA', MARGIN, 82, { width: CONTENT_W });
      doc
        .moveTo(MARGIN, 98)
        .lineTo(W - MARGIN, 98)
        .strokeColor(primary)
        .lineWidth(1)
        .stroke();

      // Grid: 2 columns × N rows
      const GRID_COLS = 2;
      const GRID_GAP = 8;
      const GRID_IMG_W = (CONTENT_W - GRID_GAP) / GRID_COLS;
      const GRID_IMG_H = 170;
      const GRID_START_Y = 106;

      page2Imgs.forEach((img, i) => {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const gx = MARGIN + col * (GRID_IMG_W + GRID_GAP);
        const gy = GRID_START_Y + row * (GRID_IMG_H + GRID_GAP);

        if (gy + GRID_IMG_H > FOOTER_Y - 10) return; // don't overflow footer

        const rendered = drawImg(
          doc,
          imgCache.get(img.url) ?? null,
          gx,
          gy,
          GRID_IMG_W,
          GRID_IMG_H,
        );
        if (!rendered) {
          doc.rect(gx, gy, GRID_IMG_W, GRID_IMG_H).fill('#e2e8f0');
          doc
            .fillColor('#94a3b8')
            .font('Helvetica')
            .fontSize(9)
            .text('Sin imagen', gx, gy + GRID_IMG_H / 2 - 6, {
              width: GRID_IMG_W,
              align: 'center',
            });
        }
        // Image counter badge
        doc
          .roundedRect(gx + GRID_IMG_W - 28, gy + GRID_IMG_H - 20, 24, 16, 3)
          .fill(primaryDark)
          .opacity(0.85);
        doc
          .fillColor('#ffffff')
          .opacity(1)
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text(
            `${i + heroSide.length + galleryRow.length + 1}`,
            gx + GRID_IMG_W - 28,
            gy + GRID_IMG_H - 15,
            { width: 24, align: 'center', lineBreak: false },
          );
        doc.opacity(1);
      });

      // Footer page 2
      doc.rect(0, FOOTER_Y, W, FOOTER_H).fill(primaryDark);
      doc.rect(0, FOOTER_Y, W, 2).fill(primary);
      doc
        .fillColor(onPrimary)
        .opacity(0.9)
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `${propiedad.tenant.nombre}  ·  ${propiedad.codigo}  ·  ${fecha}  ·  Pág. 2`,
          MARGIN,
          FOOTER_Y + 10,
          { width: CONTENT_W, align: 'center', lineBreak: false },
        );
      doc.opacity(1);
    }

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    return { buffer: Buffer.concat(chunks), codigo: propiedad.codigo };
  }
}
