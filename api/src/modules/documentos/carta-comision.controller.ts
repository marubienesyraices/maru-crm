import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ConfigDocumentosService } from '../config-documentos/config-documentos.service';
import { PdfRenderService } from './pdf-render.service';
import { randomUUID } from 'crypto';

const Handlebars = require('handlebars');

const GESTION_TEXTO: Record<string, string> = {
  VENTA: 'venta',
  RENTA: 'renta',
  AMBAS: 'venta o renta',
};

function darken(hex: string, amount = 0.2): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

function fmt(val: number, currency: string): string {
  return `${currency} ${val.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`;
}

@ApiTags('Carta Comisión PDF')
@ApiBearerAuth('JWT')
@Controller('api/propiedades/:propiedadId/carta-comision')
@UseGuards(JwtAuthGuard)
export class CartaComisionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly configDocumentos: ConfigDocumentosService,
    private readonly pdfRender: PdfRenderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Generar carta de compromiso de comisión en PDF' })
  @ApiQuery({
    name: 'anos_contrato',
    required: false,
    description: 'Años de contrato para renta (default: 1)',
  })
  async generateCartaComision(
    @Param('propiedadId') propiedadId: string,
    @Query('anos_contrato') anosContratoStr: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const [propiedad, configIntegraciones, configSeguridad, plantilla] =
      await Promise.all([
        this.prisma.propiedad.findFirst({
          where: { id: propiedadId, tenant_id: user.tenantId },
          include: {
            propietario: true,
            agente: { select: { nombre: true, email: true } },
            tenant: {
              select: {
                nombre: true,
                moneda: true,
                logo_url: true,
                color_primario: true,
              },
            },
          },
        }),
        this.prisma.configIntegraciones.findUnique({
          where: { tenant_id: user.tenantId },
          select: {
            carta_color_primario: true,
            carta_tagline: true,
            carta_logo_url: true,
            carta_clausulas_custom: true,
          },
        }),
        this.prisma.configSeguridad.findUnique({
          where: { tenant_id: user.tenantId },
          select: { porcentaje_iva: true },
        }),
        this.configDocumentos.resolveCartaPlantilla(user.tenantId),
      ]);

    if (!propiedad) throw new BadRequestException('Propiedad no encontrada');
    // El porcentaje de comisión solo aplica al cálculo de VENTA; en RENTA la
    // comisión se calcula como N rentas mensuales, sin depender de un %.
    const requierePorcentaje =
      propiedad.gestion === 'VENTA' || propiedad.gestion === 'AMBAS';
    if (requierePorcentaje && !propiedad.comision_porcentaje) {
      throw new BadRequestException(
        'La propiedad no tiene porcentaje de comisión definido',
      );
    }

    const cartaExistente = await this.prisma.propiedadDocumento.findFirst({
      where: {
        propiedad_id: propiedadId,
        nombre: { startsWith: 'Carta de Comisión —' },
      },
      select: { id: true },
    });
    if (cartaExistente) {
      throw new BadRequestException(
        'Ya existe una carta de comisión generada para esta propiedad. Elimínala del expediente antes de generar una nueva.',
      );
    }

    // Visual overrides
    const primary =
      configIntegraciones?.carta_color_primario ||
      (propiedad.tenant as any).color_primario ||
      '#2563eb';
    const tagline = configIntegraciones?.carta_tagline ?? '';

    // Logo → base64 data URI
    const logoUrl =
      configIntegraciones?.carta_logo_url ||
      (propiedad.tenant as any).logo_url ||
      null;
    let logoSrc = '';
    if (logoUrl) {
      try {
        const buf = await this.storage.readBuffer(logoUrl);
        if (buf) {
          const mime = logoUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
          logoSrc = `data:${mime};base64,${buf.toString('base64')}`;
        }
      } catch {
        /* skip */
      }
    }

    const currency = propiedad.tenant.moneda || 'GTQ';
    const comisionPct = Number(propiedad.comision_porcentaje);
    const ivaRate = configSeguridad?.porcentaje_iva
      ? Number(configSeguridad.porcentaje_iva)
      : 0.12;
    const ivaPctDisplay = `${(ivaRate * 100).toFixed(0)}%`;

    const gestion = propiedad.gestion; // VENTA | RENTA | AMBAS
    const esVenta = gestion === 'VENTA' || gestion === 'AMBAS';
    const esRenta = gestion === 'RENTA' || gestion === 'AMBAS';
    const esAmbas = gestion === 'AMBAS';

    // ── Cálculo VENTA ───────────────────────────────────────────────
    let ventaVars: Record<string, any> = {};
    if (esVenta && propiedad.precio_venta) {
      const precioVenta = Number(propiedad.precio_venta);
      const comisionBase = (precioVenta * comisionPct) / 100;
      const ivaMonto = comisionBase * ivaRate;
      const comisionTotal = comisionBase + ivaMonto;
      ventaVars = {
        venta_precio: fmt(precioVenta, currency),
        venta_comision_base: fmt(comisionBase, currency),
        venta_iva_monto: fmt(ivaMonto, currency),
        venta_comision_total: fmt(comisionTotal, currency),
      };
    }

    // ── Cálculo RENTA ───────────────────────────────────────────────
    // El tiempo de contrato es desconocido al generar la carta, por lo que
    // se muestran ambos escenarios (< 5 años y >= 5 años) como referencia.
    let rentaVars: Record<string, any> = {};
    if (esRenta && propiedad.precio_renta) {
      const precioRenta = Number(propiedad.precio_renta);
      // Escenario A: contrato < 5 años → 1 renta (IVA incluido)
      const escA_total = precioRenta;
      const escA_neta = escA_total / (1 + ivaRate);
      const escA_iva = escA_total - escA_neta;
      rentaVars = {
        renta_precio: `${fmt(precioRenta, currency)} mensuales (IVA incluido)`,
        renta_esc_a_total: fmt(escA_total, currency),
        renta_esc_a_neta: fmt(escA_neta, currency),
        renta_esc_a_iva: fmt(escA_iva, currency),
      };
    }

    // Precio de referencia (texto legacy para la tabla de datos)
    const precioBase = propiedad.precio_venta || propiedad.precio_renta;
    const precioStr = precioBase
      ? `${currency} ${Number(precioBase).toLocaleString('es-GT', { minimumFractionDigits: 2 })}${propiedad.precio_renta && !propiedad.precio_venta ? ' mensuales' : ''}`
      : '';

    const fecha = new Date().toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const refNum = `CCC-${propiedad.codigo}-${new Date().getFullYear()}`;
    const clausulas =
      configIntegraciones?.carta_clausulas_custom ||
      'La vigencia del presente compromiso es de seis (6) meses a partir de la fecha de suscripción, ' +
        'renovable de común acuerdo entre las partes. El presente acuerdo es exclusivo para la propiedad ' +
        'identificada y no implica obligación de exclusividad por parte del propietario(a), salvo pacto expreso en contrario.';

    const templateFn = Handlebars.compile(plantilla);
    const html = templateFn({
      empresa_nombre: propiedad.tenant.nombre,
      logo_src: logoSrc,
      tagline,
      color_primario: primary,
      color_oscuro: darken(primary),
      on_primario: isLight(primary) ? '#1e293b' : '#ffffff',
      ref_num: refNum,
      fecha,
      propietario_nombre:
        propiedad.propietario?.nombre || '[Propietario no asignado]',
      agente_nombre: propiedad.agente?.nombre || '[Agente no asignado]',
      agente_email: propiedad.agente?.email || '',
      gestion_texto: GESTION_TEXTO[gestion] || gestion.toLowerCase(),
      codigo_propiedad: propiedad.codigo,
      titulo_propiedad: propiedad.titulo,
      tipo_inmueble: propiedad.tipo.replace(/_/g, ' '),
      gestion,
      ubicacion:
        [propiedad.zona, propiedad.municipio, propiedad.departamento]
          .filter(Boolean)
          .join(', ') || 'No especificada',
      direccion: propiedad.direccion || '',
      precio_referencia: precioStr,
      comision_pct: comisionPct,
      iva_pct_display: ivaPctDisplay,
      // flags de gestión
      es_venta: esVenta,
      es_renta: esRenta,
      es_ambas: esAmbas,
      // vars por tipo
      ...ventaVars,
      ...rentaVars,
      clausulas_custom: clausulas,
    });

    const buffer = await this.pdfRender.renderHtml(html, 'Letter');

    const fechaStr = new Date().toISOString().slice(0, 10);
    const filename = `carta-comision-${propiedad.codigo}-${randomUUID()}.pdf`;
    const url = await this.storage.upload(buffer, filename, 'application/pdf');

    await this.prisma.propiedadDocumento
      .create({
        data: {
          propiedad_id: propiedadId,
          tipo: 'OTRO',
          nombre: `Carta de Comisión — ${propiedad.codigo} — ${fechaStr}`,
          url,
          tamano_bytes: buffer.length,
          notas: `Generado automáticamente el ${fechaStr}`,
        },
      })
      .catch(() => {});

    // Devuelve la URL del PDF ya subido (igual que el flujo de brochure),
    // en vez de transmitir los bytes crudos: un blob: URL creado en el frontend
    // no se puede abrir de forma confiable en una pestaña nueva (Chrome
    // particiona los blob URLs por contexto de navegación de nivel superior).
    res.json({ url });
  }
}
