import { Controller, Get, Param, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

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
        tenant: { select: { nombre: true, color_primario: true } },
      },
    });

    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');
    if (!propiedad.comision_porcentaje) {
      throw new BadRequestException('La propiedad no tiene porcentaje de comisión definido');
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="carta-comision-${propiedad.codigo}.pdf"`,
    );

    doc.pipe(res);

    // ─── Header ───────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').text(propiedad.tenant.nombre, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).font('Helvetica').text('CARTA DE COMPROMISO DE COMISIÓN', { align: 'center' });
    doc.moveDown(1);

    // ─── Date ─────────────────────────────────────────
    const fecha = new Date().toLocaleDateString('es-GT', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.fontSize(10).text(`Guatemala, ${fecha}`, { align: 'right' });
    doc.moveDown(1.5);

    // ─── Body ─────────────────────────────────────────
    const propietarioName = propiedad.propietario?.nombre || '[Propietario no asignado]';
    const agenteName = propiedad.agente?.nombre || '[Agente no asignado]';
    const precioStr = propiedad.precio_venta
      ? `Q ${Number(propiedad.precio_venta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
      : propiedad.precio_renta
        ? `Q ${Number(propiedad.precio_renta).toLocaleString('es-GT', { minimumFractionDigits: 2 })} mensuales`
        : '[Precio no definido]';
    const comision = Number(propiedad.comision_porcentaje);

    doc.fontSize(11).font('Helvetica');

    doc.text(`Yo, ${propietarioName}, en calidad de propietario del inmueble identificado como:`, { lineGap: 4 });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold');
    doc.text(`Código: ${propiedad.codigo}`);
    doc.text(`Propiedad: ${propiedad.titulo}`);
    doc.text(`Tipo: ${propiedad.tipo} — Gestión: ${propiedad.gestion}`);
    doc.text(`Dirección: ${propiedad.direccion || `${propiedad.departamento || ''}, ${propiedad.municipio || ''}`}`);
    doc.text(`Precio: ${precioStr}`);
    doc.font('Helvetica');
    doc.moveDown(1);

    doc.text(
      `Por medio de la presente, autorizo a ${propiedad.tenant.nombre}, a través de su agente ` +
      `${agenteName}, a gestionar la ${propiedad.gestion.toLowerCase()} del inmueble antes descrito, ` +
      `comprometiéndome a pagar una comisión equivalente al ${comision}% del valor de la operación ` +
      `al momento de la formalización de la misma.`,
      { lineGap: 4 },
    );
    doc.moveDown(1);

    doc.text(
      'Esta carta de compromiso tiene vigencia a partir de la fecha de firma y por un período ' +
      'de seis (6) meses, renovable de común acuerdo entre las partes.',
      { lineGap: 4 },
    );
    doc.moveDown(2);

    // ─── Signatures ───────────────────────────────────
    const y = doc.y;
    doc.text('_______________________________', 60, y);
    doc.text(propietarioName, 60, y + 18);
    doc.text('Propietario', 60, y + 32);

    doc.text('_______________________________', 340, y);
    doc.text(agenteName, 340, y + 18);
    doc.text(`Agente — ${propiedad.tenant.nombre}`, 340, y + 32);

    // ─── Footer ───────────────────────────────────────
    doc.fontSize(8).fillColor('#999999');
    doc.text(
      `Documento generado automáticamente por ${propiedad.tenant.nombre} CRM — ${new Date().toISOString()}`,
      60, 700, { align: 'center' },
    );

    doc.end();
  }
}
