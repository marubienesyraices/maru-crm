import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBrochureConfigDto, UpdateCartaPlantillaDto } from './dto';
import { BrochureSeccion, DEFAULT_BROCHURE_SECTIONS } from './brochure-sections.default';
import { CARTA_TEMPLATE_DEFAULT } from './carta-template.default';

const DEFAULT_SECCIONES_JSON = DEFAULT_BROCHURE_SECTIONS as unknown as Prisma.InputJsonValue;

@Injectable()
export class ConfigDocumentosService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Carta plantilla ───────────────────────────────────────────────

  async getCartaPlantilla(tenantId: string): Promise<{ plantilla_html: string; es_default: boolean }> {
    const row = await this.prisma.configIntegraciones.findUnique({
      where: { tenant_id: tenantId },
      select: { carta_plantilla_html: true },
    });
    const plantilla = row?.carta_plantilla_html ?? null;
    return {
      plantilla_html: plantilla ?? CARTA_TEMPLATE_DEFAULT,
      es_default: !plantilla,
    };
  }

  async updateCartaPlantilla(tenantId: string, dto: UpdateCartaPlantillaDto) {
    await this.prisma.configIntegraciones.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, carta_plantilla_html: dto.plantilla_html },
      update: { carta_plantilla_html: dto.plantilla_html },
    });
    return { plantilla_html: dto.plantilla_html, es_default: false };
  }

  async resetCartaPlantilla(tenantId: string) {
    await this.prisma.configIntegraciones.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, carta_plantilla_html: null },
      update: { carta_plantilla_html: null },
    });
    return { plantilla_html: CARTA_TEMPLATE_DEFAULT, es_default: true };
  }

  // ── Brochure config ───────────────────────────────────────────────

  async getBrochureConfig(tenantId: string) {
    const row = await this.prisma.configBrochure.findUnique({ where: { tenant_id: tenantId } });
    if (!row) {
      return {
        secciones: DEFAULT_BROCHURE_SECTIONS,
        footer_texto: null,
        watermark_texto: null,
        es_default: true,
      };
    }
    const secciones = this.parseSecciones(row.secciones);
    return {
      secciones,
      footer_texto: row.footer_texto,
      watermark_texto: row.watermark_texto,
      es_default: false,
    };
  }

  async updateBrochureConfig(tenantId: string, dto: UpdateBrochureConfigDto) {
    const data: Record<string, unknown> = {};
    if (dto.secciones !== undefined) data.secciones = dto.secciones as unknown as Prisma.InputJsonValue;
    if (dto.footer_texto !== undefined) data.footer_texto = dto.footer_texto || null;
    if (dto.watermark_texto !== undefined) data.watermark_texto = dto.watermark_texto || null;

    const row = await this.prisma.configBrochure.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        secciones: (dto.secciones ?? DEFAULT_BROCHURE_SECTIONS) as unknown as Prisma.InputJsonValue,
        footer_texto: dto.footer_texto ?? null,
        watermark_texto: dto.watermark_texto ?? null,
      },
      update: data,
    });
    return {
      secciones: this.parseSecciones(row.secciones),
      footer_texto: row.footer_texto,
      watermark_texto: row.watermark_texto,
      es_default: false,
    };
  }

  async resetBrochureConfig(tenantId: string) {
    await this.prisma.configBrochure.upsert({
      where: { tenant_id: tenantId },
      create: { tenant_id: tenantId, secciones: DEFAULT_SECCIONES_JSON },
      update: { secciones: DEFAULT_SECCIONES_JSON, footer_texto: null, watermark_texto: null },
    });
    return { secciones: DEFAULT_BROCHURE_SECTIONS, footer_texto: null, watermark_texto: null, es_default: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /** Carga segura del JSON de secciones; retorna defaults si el JSON es inválido. */
  parseSecciones(raw: unknown): BrochureSeccion[] {
    if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_BROCHURE_SECTIONS;
    return (raw as unknown as BrochureSeccion[]).sort((a, b) => a.order - b.order);
  }

  /** Devuelve la plantilla HTML vigente para el tenant (template de BD o default). */
  async resolveCartaPlantilla(tenantId: string): Promise<string> {
    const row = await this.prisma.configIntegraciones.findUnique({
      where: { tenant_id: tenantId },
      select: { carta_plantilla_html: true },
    });
    return row?.carta_plantilla_html ?? CARTA_TEMPLATE_DEFAULT;
  }

  /** Devuelve la config de brochure vigente (de BD o defaults). */
  async resolveBrochureConfig(tenantId: string) {
    const row = await this.prisma.configBrochure.findUnique({ where: { tenant_id: tenantId } });
    return {
      secciones: this.parseSecciones(row?.secciones),
      footer_texto: row?.footer_texto ?? null,
      watermark_texto: row?.watermark_texto ?? null,
    };
  }
}
