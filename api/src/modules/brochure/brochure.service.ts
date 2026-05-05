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
  VENTA: 'En Venta', RENTA: 'En Renta', AMBAS: 'Venta / Renta',
};

function formatMoney(val: any, currency = 'GTQ') {
  if (!val) return null;
  const n = Number(val);
  return `${currency} ${n.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
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
        imagenes: { where: { tipo: 'portada' }, orderBy: { orden: 'asc' }, take: 1 },
        tenant: { select: { nombre: true, color_primario: true, moneda: true } },
      },
    });

    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const primary = propiedad.tenant.color_primario || '#3b82f6';
    const currency = propiedad.tenant.moneda || 'GTQ';

    // ─── Header band ─────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(primary);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text(propiedad.tenant.nombre, 50, 18, { width: doc.page.width - 100 });
    doc.fontSize(11).font('Helvetica')
      .text(GESTION_LABELS[propiedad.gestion] || propiedad.gestion, 50, 46, { width: doc.page.width - 100 });
    doc.fillColor('#333333');

    // ─── Property image ───────────────────────────────────────
    let imgBottom = 90;
    if (propiedad.imagenes.length > 0) {
      const imgPath = this.storage.localPath(propiedad.imagenes[0].url);
      if (imgPath && existsSync(imgPath)) {
        const imgW = doc.page.width - 100;
        const imgH = 180;
        try {
          doc.image(imgPath, 50, 80, { width: imgW, height: imgH, cover: [imgW, imgH] });
          imgBottom = 80 + imgH + 10;
        } catch { /* skip image on error */ }
      }
    }

    // ─── Title block ──────────────────────────────────────────
    let y = imgBottom;
    doc.fillColor(primary).fontSize(18).font('Helvetica-Bold')
      .text(propiedad.titulo, 50, y, { width: doc.page.width - 100 });
    y = doc.y + 4;
    doc.fillColor('#666666').fontSize(10).font('Helvetica')
      .text(`${TIPO_LABELS[propiedad.tipo] || propiedad.tipo} · ${propiedad.codigo}`, 50, y);
    y = doc.y + 14;

    // ─── Separator ────────────────────────────────────────────
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(primary).lineWidth(1.5).stroke();
    y += 14;

    // ─── Price ───────────────────────────────────────────────
    const prices: string[] = [];
    if (propiedad.precio_venta) prices.push(`Precio venta: ${formatMoney(propiedad.precio_venta, currency)}`);
    if (propiedad.precio_renta) prices.push(`Renta mensual: ${formatMoney(propiedad.precio_renta, currency)}`);
    if (prices.length) {
      doc.fillColor(primary).fontSize(14).font('Helvetica-Bold').text(prices.join('   ·   '), 50, y);
      y = doc.y + 12;
    }

    // ─── Description ──────────────────────────────────────────
    if (propiedad.descripcion) {
      doc.fillColor('#333333').fontSize(10).font('Helvetica')
        .text(propiedad.descripcion, 50, y, { width: doc.page.width - 100, lineGap: 3 });
      y = doc.y + 14;
    }

    // ─── Features grid (2 columns) ───────────────────────────
    const features: { label: string; value: string }[] = [];
    if (propiedad.habitaciones != null) features.push({ label: 'Habitaciones', value: String(propiedad.habitaciones) });
    if (propiedad.banos != null) features.push({ label: 'Baños', value: String(propiedad.banos) });
    if (propiedad.parqueos != null) features.push({ label: 'Parqueos', value: String(propiedad.parqueos) });
    if (propiedad.niveles != null) features.push({ label: 'Niveles', value: String(propiedad.niveles) });
    if (propiedad.area_terreno_m2) features.push({ label: 'Área terreno', value: `${Number(propiedad.area_terreno_m2).toLocaleString('es-GT')} m²` });
    if (propiedad.area_construccion_m2) features.push({ label: 'Área construcción', value: `${Number(propiedad.area_construccion_m2).toLocaleString('es-GT')} m²` });
    if (propiedad.ano_construccion) features.push({ label: 'Año construcción', value: String(propiedad.ano_construccion) });

    if (features.length) {
      doc.fillColor(primary).fontSize(11).font('Helvetica-Bold').text('Características', 50, y);
      y = doc.y + 6;
      const colW = (doc.page.width - 100) / 2;
      features.forEach((f, i) => {
        const col = i % 2;
        const fx = 50 + col * colW;
        if (col === 0 && i > 0) y += 18;
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold').text(f.label.toUpperCase(), fx, y);
        doc.fillColor('#555555').font('Helvetica').text(f.value, fx, y + 11);
      });
      y += 26;
    }

    // ─── Location ─────────────────────────────────────────────
    const locationParts = [propiedad.zona, propiedad.municipio, propiedad.departamento, propiedad.pais]
      .filter(Boolean).join(', ');
    if (locationParts) {
      doc.fillColor(primary).fontSize(11).font('Helvetica-Bold').text('Ubicación', 50, y + 10);
      y = doc.y + 4;
      doc.fillColor('#555555').fontSize(10).font('Helvetica').text(locationParts, 50, y);
      if (propiedad.direccion) { y = doc.y + 2; doc.text(propiedad.direccion, 50, y); }
      y = doc.y + 14;
    }

    // ─── Agent contact ────────────────────────────────────────
    if (propiedad.agente) {
      doc.fillColor(primary).fontSize(11).font('Helvetica-Bold').text('Contacto', 50, y + 6);
      y = doc.y + 4;
      doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(propiedad.agente.nombre, 50, y);
      y = doc.y + 2;
      doc.font('Helvetica').fillColor('#555555').text(propiedad.agente.email, 50, y);
    }

    // ─── Footer ───────────────────────────────────────────────
    const pageH = doc.page.height;
    doc.rect(0, pageH - 40, doc.page.width, 40).fill(primary);
    const fecha = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.fillColor('white').fontSize(8).font('Helvetica')
      .text(`${propiedad.tenant.nombre} · ${propiedad.codigo} · ${fecha}`, 50, pageH - 26,
        { width: doc.page.width - 100, align: 'center' });

    await new Promise<void>((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      doc.end();
    });

    return { buffer: Buffer.concat(chunks), codigo: propiedad.codigo };
  }
}
