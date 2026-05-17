import { Controller, Get, Param, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

const GESTION_TEXTO: Record<string, string> = {
  VENTA: 'venta',
  RENTA: 'renta',
  AMBAS: 'venta o renta',
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
}

function darken(hex: string, amount = 0.15): string {
  const [r, g, b] = hexToRgb(hex);
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `#${d(r).toString(16).padStart(2, '0')}${d(g).toString(16).padStart(2, '0')}${d(b).toString(16).padStart(2, '0')}`;
}

@ApiTags('Brochure PDF')
@ApiBearerAuth('JWT')
@Controller('api/propiedades/:propiedadId/carta-comision')
@UseGuards(JwtAuthGuard)
export class CartaComisionController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Generar carta de compromiso de comisión en PDF' })
  async generateCartaComision(
    @Param('propiedadId') propiedadId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: user.tenantId },
      include: {
        propietario: true,
        agente: { select: { nombre: true, email: true } },
        tenant: { select: { nombre: true, moneda: true } },
      },
    });

    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');
    if (!propiedad.comision_porcentaje) {
      throw new BadRequestException('La propiedad no tiene porcentaje de comisión definido');
    }

    // ─── Layout constants ────────────────────────────────────────
    const W = 612;     // LETTER width in pts
    const H = 792;     // LETTER height in pts
    const SIDE_BAR = 6;
    const MARGIN_L = 56;
    const MARGIN_R = 48;
    const CONTENT_W = W - MARGIN_L - MARGIN_R;

    const primary = '#2563eb';
    const primaryDark = darken(primary, 0.2);
    const onPrimary = isLight(primary) ? '#1e293b' : '#ffffff';
    const currency = propiedad.tenant.moneda || 'GTQ';

    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="carta-comision-${propiedad.codigo}.pdf"`);
    doc.pipe(res);

    // ─── Background ──────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#ffffff');

    // ─── Left accent sidebar ──────────────────────────────────────
    doc.rect(0, 0, SIDE_BAR, H).fill(primary);

    // ─── Header area (0–110) ─────────────────────────────────────
    // Top bar under sidebar
    doc.rect(SIDE_BAR, 0, W - SIDE_BAR, 3).fill(primary);

    // Company name
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(22)
      .text(propiedad.tenant.nombre, MARGIN_L, 22, { width: CONTENT_W, align: 'left' });

    // Tagline / subtitle
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
      .text('Bienes y Raíces · CRM', MARGIN_L, 50, { width: CONTENT_W });

    // Horizontal rule
    doc.moveTo(MARGIN_L, 66).lineTo(W - MARGIN_R, 66).strokeColor(primary).lineWidth(1.5).stroke();
    doc.moveTo(MARGIN_L, 68.5).lineTo(W - MARGIN_R, 68.5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    // Document title band
    doc.rect(MARGIN_L, 78, CONTENT_W, 26).fill(primary);
    doc.fillColor(onPrimary).font('Helvetica-Bold').fontSize(10.5)
      .text('CARTA DE COMPROMISO DE COMISIÓN', MARGIN_L, 85, { width: CONTENT_W, align: 'center', characterSpacing: 0.8 });

    // ─── Metadata row (date + ref) ────────────────────────────────
    const fecha = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
    const refNum = `CCC-${propiedad.codigo}-${new Date().getFullYear()}`;

    doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
      .text(`Ref: ${refNum}`, MARGIN_L, 116, { width: CONTENT_W / 2, align: 'left' });
    doc.text(`Guatemala, ${fecha}`, MARGIN_L, 116, { width: CONTENT_W, align: 'right' });

    // ─── Salutation ───────────────────────────────────────────────
    let y = 140;
    const propietarioName = propiedad.propietario?.nombre || '[Propietario no asignado]';
    const agenteName = propiedad.agente?.nombre || '[Agente no asignado]';
    const gestionTexto = GESTION_TEXTO[propiedad.gestion] || propiedad.gestion.toLowerCase();
    const comision = Number(propiedad.comision_porcentaje);

    const precioBase = propiedad.precio_venta || propiedad.precio_renta;
    const precioStr = precioBase
      ? `${currency} ${Number(precioBase).toLocaleString('es-GT', { minimumFractionDigits: 2 })}${propiedad.precio_renta && !propiedad.precio_venta ? ' mensuales' : ''}`
      : null;
    const comisionMonto = precioBase
      ? `${currency} ${(Number(precioBase) * comision / 100).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
      : null;

    // Salutation line
    doc.fillColor('#1e293b').font('Helvetica').fontSize(10.5)
      .text(`Señores(as):`, MARGIN_L, y, { lineGap: 2 });
    y += 14;
    doc.font('Helvetica-Bold').text(propiedad.tenant.nombre, MARGIN_L, y);
    y = doc.y + 4;
    doc.font('Helvetica').fillColor('#475569').text('Estimados(as):', MARGIN_L, y);
    y = doc.y + 16;

    // Opening paragraph
    doc.fillColor('#1e293b').font('Helvetica').fontSize(10.5).lineGap(3)
      .text(
        `Yo, ${propietarioName}, con plena capacidad legal para contratar, en calidad de propietario(a) ` +
        `del inmueble que se describe a continuación, por medio de la presente carta me comprometo ` +
        `a reconocer y pagar la comisión acordada en caso de concretarse la ${gestionTexto} del mismo ` +
        `a través de la intermediación de ${propiedad.tenant.nombre}.`,
        MARGIN_L, y, { width: CONTENT_W, lineGap: 3, align: 'justify' },
      );
    y = doc.y + 18;

    // ─── Property details box ─────────────────────────────────────
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(8.5)
      .text('DATOS DEL INMUEBLE', MARGIN_L, y, { characterSpacing: 0.5 });
    y += 12;

    // Box background
    const BOX_PADDING = 12;
    const rows: [string, string][] = [
      ['Código de propiedad', propiedad.codigo],
      ['Descripción', propiedad.titulo],
      ['Tipo de inmueble', propiedad.tipo.replace(/_/g, ' ')],
      ['Gestión', propiedad.gestion],
      ['Ubicación', [propiedad.zona, propiedad.municipio, propiedad.departamento].filter(Boolean).join(', ') || 'No especificada'],
    ];
    if (propiedad.direccion) rows.push(['Dirección', propiedad.direccion]);
    if (precioStr) rows.push(['Precio de referencia', precioStr]);

    const ROW_H = 20;
    const BOX_H = BOX_PADDING + rows.length * ROW_H + BOX_PADDING;
    doc.rect(MARGIN_L, y, CONTENT_W, BOX_H).fill('#f8fafc');
    doc.rect(MARGIN_L, y, 3, BOX_H).fill(primary);

    rows.forEach(([label, value], i) => {
      const ry = y + BOX_PADDING + i * ROW_H;
      // Alternating row tint
      if (i % 2 === 1) doc.rect(MARGIN_L + 3, ry, CONTENT_W - 3, ROW_H).fill('#f1f5f9');
      const LABEL_W = 140;
      doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
        .text(label.toUpperCase(), MARGIN_L + BOX_PADDING, ry + 5, { width: LABEL_W, lineBreak: false });
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9)
        .text(value, MARGIN_L + BOX_PADDING + LABEL_W, ry + 5, { width: CONTENT_W - BOX_PADDING * 2 - LABEL_W, lineBreak: false });
    });

    y += BOX_H + 18;

    // ─── Commission clause ────────────────────────────────────────
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(8.5)
      .text('ACUERDO DE COMISIÓN', MARGIN_L, y, { characterSpacing: 0.5 });
    y += 12;

    let comisionClause =
      `Me comprometo a pagar a ${propiedad.tenant.nombre}, como honorarios por la gestión de ` +
      `${gestionTexto}, una comisión equivalente al ${comision}% del valor total de la operación, ` +
      `pagadera al momento de la formalización o firma del contrato correspondiente.`;
    if (comisionMonto && precioStr) {
      comisionClause += ` Tomando como referencia el precio de ${precioStr}, el monto estimado de comisión asciende a ${comisionMonto}.`;
    }

    doc.fillColor('#1e293b').font('Helvetica').fontSize(10.5).lineGap(3)
      .text(comisionClause, MARGIN_L, y, { width: CONTENT_W, align: 'justify', lineGap: 3 });
    y = doc.y + 14;

    // ─── Validity & terms ─────────────────────────────────────────
    doc.fillColor('#1e293b').font('Helvetica').fontSize(10.5).lineGap(3)
      .text(
        `La vigencia del presente compromiso es de seis (6) meses a partir de la fecha de suscripción, ` +
        `renovable de común acuerdo entre las partes. El presente acuerdo es exclusivo para la propiedad ` +
        `identificada y no implica obligación de exclusividad por parte del propietario(a), salvo pacto expreso en contrario.`,
        MARGIN_L, y, { width: CONTENT_W, align: 'justify', lineGap: 3 },
      );
    y = doc.y + 24;

    // ─── Signatures ───────────────────────────────────────────────
    const SIG_W = (CONTENT_W - 40) / 2;
    const SIG_X2 = MARGIN_L + SIG_W + 40;

    // Signature blocks
    [MARGIN_L, SIG_X2].forEach((sx) => {
      doc.moveTo(sx, y + 40).lineTo(sx + SIG_W, y + 40).strokeColor('#1e293b').lineWidth(0.75).stroke();
    });

    // Left signature: propietario
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9.5)
      .text(propietarioName, MARGIN_L, y + 44, { width: SIG_W });
    doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
      .text('Propietario(a)', MARGIN_L, doc.y + 1, { width: SIG_W });
    if (propiedad.propietario?.telefono) {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
        .text(`Tel: ${propiedad.propietario.telefono}`, MARGIN_L, doc.y + 1, { width: SIG_W });
    }

    // Right signature: agente
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9.5)
      .text(agenteName, SIG_X2, y + 44, { width: SIG_W });
    doc.fillColor('#64748b').font('Helvetica').fontSize(8.5)
      .text(`Agente · ${propiedad.tenant.nombre}`, SIG_X2, y + 44 + 13, { width: SIG_W });
    if (propiedad.agente?.email) {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
        .text(propiedad.agente.email, SIG_X2, y + 44 + 26, { width: SIG_W });
    }

    // Signature date label
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8)
      .text('Lugar y fecha: _________________________', MARGIN_L, y + 44 + 44, { width: CONTENT_W });

    // ─── Footer ───────────────────────────────────────────────────
    const FOOTER_H = 32;
    const FOOTER_Y = H - FOOTER_H;

    doc.rect(SIDE_BAR, FOOTER_Y, W - SIDE_BAR, 0.5).fill('#e2e8f0');
    doc.rect(SIDE_BAR, FOOTER_Y + 0.5, W - SIDE_BAR, FOOTER_H - 0.5).fill('#f8fafc');

    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5)
      .text(
        `Documento generado automáticamente — ${propiedad.tenant.nombre} CRM`,
        MARGIN_L, FOOTER_Y + 9,
        { width: CONTENT_W - 120, align: 'left', lineBreak: false },
      );
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(7.5)
      .text(refNum, W - MARGIN_R - 110, FOOTER_Y + 9, { width: 110, align: 'right', lineBreak: false });

    // Bottom accent lines on footer
    doc.rect(0, H - 3, W, 3).fill(primaryDark);
    doc.rect(0, H - 3, W, 1).fill(primary);

    doc.end();
  }
}
