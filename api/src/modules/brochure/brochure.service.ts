import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

const TIPO_LABELS: Record<string, string> = {
  CASA: 'Casa', APARTAMENTO: 'Apartamento', TERRENO: 'Terreno',
  LOCAL_COMERCIAL: 'Local Comercial', OFICINA: 'Oficina',
  BODEGA: 'Bodega', FINCA: 'Finca', EDIFICIO: 'Edificio', OTRO: 'Otro',
};

const GESTION_LABELS: Record<string, string> = {
  VENTA: 'EN VENTA', RENTA: 'EN RENTA', AMBAS: 'VENTA / RENTA',
};

function formatMoney(val: any, currency = 'GTQ') {
  if (!val) return null;
  const n = Number(val);
  return `${currency} ${n.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(hex: string, amount = 0.15): string {
  const [r, g, b] = hexToRgb(hex);
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${d(r).toString(16).padStart(2, '0')}${d(g).toString(16).padStart(2, '0')}${d(b).toString(16).padStart(2, '0')}`;
}

function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

@Injectable()
export class BrochureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async generateBuffer(propiedadId: string, tenantId: string): Promise<{ buffer: Buffer; codigo: string }> {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
      include: {
        propietario: { select: { nombre: true, telefono: true } },
        agente: { select: { nombre: true, email: true } },
        imagenes: { orderBy: { orden: 'asc' }, take: 4 },
        tenant: { select: { nombre: true, color_primario: true, moneda: true } },
      },
    });

    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    const W = 595.28;
    const H = 841.89;
    const MARGIN = 40;
    const CONTENT_W = W - MARGIN * 2;

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const primary = propiedad.tenant.color_primario || '#2563eb';
    const primaryDark = darken(primary, 0.18);
    const onPrimary = isLight(primary) ? '#1e293b' : '#ffffff';
    const currency = propiedad.tenant.moneda || 'GTQ';
    const gestionLabel = GESTION_LABELS[propiedad.gestion] || propiedad.gestion;
    const tipoLabel = TIPO_LABELS[propiedad.tipo] || propiedad.tipo;

    // ─── Background ──────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#f8fafc');

    // ─── Header gradient band (0–90) ─────────────────────────────
    doc.rect(0, 0, W, 90).fill(primary);
    // Accent dark strip at very top
    doc.rect(0, 0, W, 4).fill(primaryDark);

    // Company name
    doc.fillColor(onPrimary).font('Helvetica-Bold').fontSize(20)
      .text(propiedad.tenant.nombre, MARGIN, 18, { width: CONTENT_W - 110, lineBreak: false });

    // Gestión badge (top-right pill)
    const badgeW = 100;
    const badgeX = W - MARGIN - badgeW;
    doc.roundedRect(badgeX, 18, badgeW, 22, 4).fill(primaryDark);
    doc.fillColor(onPrimary).font('Helvetica-Bold').fontSize(7.5)
      .text(gestionLabel, badgeX, 25, { width: badgeW, align: 'center', lineBreak: false });

    // Tipo label below company
    doc.fillColor(onPrimary).font('Helvetica').fontSize(10).opacity(0.8)
      .text(`${tipoLabel}  ·  ${propiedad.codigo}`, MARGIN, 47, { width: CONTENT_W })
      .opacity(1);

    // ─── Property Image (90–290) ──────────────────────────────────
    const IMG_H = 200;
    const coverImg = propiedad.imagenes.find(i => i.tipo === 'portada') ?? propiedad.imagenes[0];
    let imgBottom = 90;

    if (coverImg) {
      const imgPath = this.storage.localPath(coverImg.url);
      if (imgPath && existsSync(imgPath)) {
        try {
          doc.save();
          doc.rect(0, 90, W, IMG_H).clip();
          doc.image(imgPath, 0, 90, { width: W, height: IMG_H, cover: [W, IMG_H] });
          doc.restore();
          imgBottom = 90 + IMG_H;
        } catch { /* skip */ }
      }
    }

    if (imgBottom === 90) {
      // No image placeholder
      doc.rect(0, 90, W, IMG_H).fill('#e2e8f0');
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(14)
        .text(tipoLabel, 0, 90 + IMG_H / 2 - 10, { width: W, align: 'center' });
      imgBottom = 90 + IMG_H;
    }

    // Gradient overlay at bottom of image for legibility
    // Simulate with semi-transparent rect
    doc.rect(0, imgBottom - 50, W, 50).fill('#0f172a').opacity(0.45);
    doc.opacity(1);

    // ─── Title card (floating over image bottom) ──────────────────
    const CARD_Y = imgBottom - 20;
    const CARD_H = 66;
    doc.roundedRect(MARGIN - 4, CARD_Y, CONTENT_W + 8, CARD_H, 6).fill('#ffffff');
    // Left accent bar on card
    doc.rect(MARGIN - 4, CARD_Y, 4, CARD_H).fill(primary);

    // Title
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(15)
      .text(propiedad.titulo, MARGIN + 8, CARD_Y + 10,
        { width: CONTENT_W - 8, lineBreak: true, lineGap: 1 });

    const titleBottom = doc.y;
    doc.fillColor('#64748b').font('Helvetica').fontSize(9)
      .text(`${tipoLabel}  ·  ${propiedad.codigo}`, MARGIN + 8, Math.min(titleBottom + 1, CARD_Y + 44));

    // ─── Price band ───────────────────────────────────────────────
    let y = CARD_Y + CARD_H + 12;

    const prices: { label: string; value: string }[] = [];
    if (propiedad.precio_venta) prices.push({ label: 'PRECIO DE VENTA', value: formatMoney(propiedad.precio_venta, currency)! });
    if (propiedad.precio_renta) prices.push({ label: 'RENTA MENSUAL', value: formatMoney(propiedad.precio_renta, currency)! });

    if (prices.length) {
      const priceCardW = prices.length === 1 ? CONTENT_W : (CONTENT_W - 10) / 2;
      prices.forEach((p, i) => {
        const px = MARGIN + i * (priceCardW + 10);
        doc.roundedRect(px, y, priceCardW, 44, 5).fill(primary);
        doc.fillColor(onPrimary).font('Helvetica').fontSize(7.5)
          .text(p.label, px + 12, y + 8, { width: priceCardW - 24, lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(14)
          .text(p.value, px + 12, y + 20, { width: priceCardW - 24, lineBreak: false });
      });
      y += 56;
    }

    // ─── Separator ────────────────────────────────────────────────
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).strokeColor(primary).lineWidth(1).stroke();
    y += 14;

    // ─── Two-column layout ────────────────────────────────────────
    const COL_GAP = 16;
    const COL_LEFT_W = Math.round(CONTENT_W * 0.62);
    const COL_RIGHT_W = CONTENT_W - COL_LEFT_W - COL_GAP;
    const COL_RIGHT_X = MARGIN + COL_LEFT_W + COL_GAP;

    // Left column: description
    let yLeft = y;
    let yRight = y;

    if (propiedad.descripcion) {
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9.5)
        .text('DESCRIPCIÓN', MARGIN, yLeft);
      yLeft = doc.y + 4;
      doc.fillColor('#4b5563').font('Helvetica').fontSize(9).lineGap(2)
        .text(propiedad.descripcion, MARGIN, yLeft, { width: COL_LEFT_W, lineGap: 2 });
      yLeft = doc.y + 14;
    }

    // Features grid in left column
    const features: { label: string; value: string }[] = [];
    if (propiedad.habitaciones != null) features.push({ label: 'Habitaciones', value: String(propiedad.habitaciones) });
    if (propiedad.banos != null) features.push({ label: 'Baños', value: String(propiedad.banos) });
    if (propiedad.parqueos != null) features.push({ label: 'Parqueos', value: String(propiedad.parqueos) });
    if (propiedad.niveles != null) features.push({ label: 'Niveles', value: String(propiedad.niveles) });
    if (propiedad.area_terreno_m2) features.push({ label: 'Área terreno', value: `${Number(propiedad.area_terreno_m2).toLocaleString('es-GT')} m²` });
    if (propiedad.area_construccion_m2) features.push({ label: 'Área construida', value: `${Number(propiedad.area_construccion_m2).toLocaleString('es-GT')} m²` });
    if (propiedad.ano_construccion) features.push({ label: 'Año', value: String(propiedad.ano_construccion) });
    if (propiedad.estado) features.push({ label: 'Estado', value: propiedad.estado });

    if (features.length) {
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9.5).text('CARACTERÍSTICAS', MARGIN, yLeft);
      yLeft += 14;

      const featureColW = (COL_LEFT_W - 8) / 2;
      features.forEach((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const fx = MARGIN + col * (featureColW + 8);
        const fy = yLeft + row * 34;

        // Feature cell
        doc.rect(fx, fy, featureColW, 30).fill('#f1f5f9');
        doc.rect(fx, fy, 3, 30).fill(primary);
        doc.fillColor('#64748b').font('Helvetica').fontSize(7.5)
          .text(f.label.toUpperCase(), fx + 7, fy + 5, { width: featureColW - 10, lineBreak: false });
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(12)
          .text(f.value, fx + 7, fy + 14, { width: featureColW - 10, lineBreak: false });
      });

      const rows = Math.ceil(features.length / 2);
      yLeft += rows * 34 + 14;
    }

    // Amenidades (right side of left column or below)
    if (propiedad.amenidades && Array.isArray(propiedad.amenidades) && (propiedad.amenidades as string[]).length > 0) {
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9.5).text('AMENIDADES', MARGIN, yLeft);
      yLeft += 12;
      const amenList = (propiedad.amenidades as string[]).slice(0, 10).join('  ·  ');
      doc.fillColor('#4b5563').font('Helvetica').fontSize(9)
        .text(amenList, MARGIN, yLeft, { width: COL_LEFT_W });
      yLeft = doc.y + 10;
    }

    // ─── Right column: Location + Agent ───────────────────────────
    // Location card
    const locationParts = [propiedad.zona, propiedad.municipio, propiedad.departamento].filter(Boolean).join(', ');
    if (locationParts || propiedad.direccion) {
      doc.roundedRect(COL_RIGHT_X, yRight, COL_RIGHT_W, 2, 0).fill(primary);
      doc.rect(COL_RIGHT_X, yRight, COL_RIGHT_W, 80).fill('#f8fafc');
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(8.5)
        .text('UBICACIÓN', COL_RIGHT_X + 10, yRight + 8);
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9.5)
        .text(locationParts || '', COL_RIGHT_X + 10, yRight + 22, { width: COL_RIGHT_W - 20 });
      if (propiedad.direccion) {
        doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
          .text(propiedad.direccion, COL_RIGHT_X + 10, doc.y + 2, { width: COL_RIGHT_W - 20 });
      }
      if (propiedad.pais) {
        const locY = propiedad.direccion ? doc.y + 2 : yRight + 22 + 14;
        doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
          .text(propiedad.pais, COL_RIGHT_X + 10, locY, { width: COL_RIGHT_W - 20 });
      }
      yRight += 88;
    }

    // Agent card
    if (propiedad.agente) {
      doc.roundedRect(COL_RIGHT_X, yRight, COL_RIGHT_W, 2, 0).fill(primary);
      doc.rect(COL_RIGHT_X, yRight, COL_RIGHT_W, 80).fill('#f0f9ff');
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(8.5)
        .text('AGENTE A CARGO', COL_RIGHT_X + 10, yRight + 8);
      // Agent avatar circle (initials)
      const initials = propiedad.agente.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('');
      doc.circle(COL_RIGHT_X + COL_RIGHT_W / 2, yRight + 40, 18).fill(primary);
      doc.fillColor(onPrimary).font('Helvetica-Bold').fontSize(11)
        .text(initials, COL_RIGHT_X + COL_RIGHT_W / 2 - 11, yRight + 33, { width: 22, align: 'center', lineBreak: false });
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9)
        .text(propiedad.agente.nombre, COL_RIGHT_X + 10, yRight + 62, { width: COL_RIGHT_W - 20, align: 'center' });
      yRight += 88;

      if (propiedad.agente.email) {
        doc.fillColor('#475569').font('Helvetica').fontSize(8)
          .text(propiedad.agente.email, COL_RIGHT_X, yRight + 2, { width: COL_RIGHT_W, align: 'center' });
        yRight += 18;
      }
    }

    // Thumbnail strip (extra images in right column)
    const extraImgs = propiedad.imagenes.filter(i => i !== coverImg).slice(0, 2);
    if (extraImgs.length > 0) {
      const thumbW = (COL_RIGHT_W - 4) / extraImgs.length;
      extraImgs.forEach((img, i) => {
        const imgPath = this.storage.localPath(img.url);
        if (imgPath && existsSync(imgPath)) {
          try {
            doc.save();
            doc.rect(COL_RIGHT_X + i * (thumbW + 4), yRight, thumbW, 50).clip();
            doc.image(imgPath, COL_RIGHT_X + i * (thumbW + 4), yRight, { width: thumbW, height: 50, cover: [thumbW, 50] });
            doc.restore();
          } catch { /* skip */ }
        }
      });
      yRight += 56;
    }

    // ─── Footer ───────────────────────────────────────────────────
    const FOOTER_H = 38;
    const FOOTER_Y = H - FOOTER_H;
    doc.rect(0, FOOTER_Y, W, FOOTER_H).fill(primaryDark);
    doc.rect(0, FOOTER_Y, W, 2).fill(primary);

    const fecha = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fillColor(onPrimary).opacity(0.9).font('Helvetica').fontSize(7.5)
      .text(
        `${propiedad.tenant.nombre}  ·  Código ${propiedad.codigo}  ·  ${fecha}`,
        MARGIN, FOOTER_Y + 10,
        { width: CONTENT_W - 60, align: 'left', lineBreak: false },
      );
    doc.font('Helvetica-Bold').text('CONFIDENCIAL', W - MARGIN - 60, FOOTER_Y + 10, { width: 60, align: 'right', lineBreak: false });
    doc.opacity(1);

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    return { buffer: Buffer.concat(chunks), codigo: propiedad.codigo };
  }
}
