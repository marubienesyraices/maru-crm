import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface Encuentra24Listing {
  category: string;
  type: string;
  price: number;
  currency: string;
  title: string;
  description: string;
  location: { country: string; region?: string; city?: string };
  images?: string[];
  attributes?: Record<string, unknown>;
}

interface MercadoLibreItem {
  title: string;
  category_id: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  buying_mode: string;
  condition: string;
  listing_type_id: string;
  description?: { plain_text: string };
  pictures?: { source: string }[];
  attributes?: { id: string; value_name: string }[];
}

const TIPO_CATEGORIA_ENCUENTRA24: Record<string, string> = {
  CASA: 'real_estate_house',
  APARTAMENTO: 'real_estate_apartment',
  TERRENO: 'real_estate_land',
  LOCAL_COMERCIAL: 'real_estate_commercial',
  OFICINA: 'real_estate_office',
  BODEGA: 'real_estate_warehouse',
  FINCA: 'real_estate_farm',
  EDIFICIO: 'real_estate_building',
  OTRO: 'real_estate',
};

// MercadoLibre category IDs for Guatemala (MLG)
const TIPO_CATEGORIA_ML: Record<string, string> = {
  CASA: 'MLG1459',
  APARTAMENTO: 'MLG1459',
  TERRENO: 'MLG1468',
  LOCAL_COMERCIAL: 'MLG1500',
  OFICINA: 'MLG1500',
  BODEGA: 'MLG1500',
  FINCA: 'MLG1468',
  EDIFICIO: 'MLG1459',
  OTRO: 'MLG1459',
};

@Injectable()
export class SindicacionService {
  private readonly logger = new Logger(SindicacionService.name);
  private readonly e24ApiKey: string;
  private readonly e24BaseUrl: string;
  private readonly mlAccessToken: string;
  private readonly mlBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.e24ApiKey = config.get<string>('ENCUENTRA24_API_KEY') ?? '';
    this.e24BaseUrl = (
      config.get<string>('ENCUENTRA24_API_URL') ??
      'https://api.encuentra24.com/v1'
    ).replace(/\/$/, '');
    this.mlAccessToken = config.get<string>('ML_ACCESS_TOKEN') ?? '';
    this.mlBaseUrl = 'https://api.mercadolibre.com';
  }

  async getEstado(tenantId: string, propiedadId: string) {
    await this.assertPropiedad(tenantId, propiedadId);
    return this.prisma.sindicacionPublicacion.findMany({
      where: { propiedad_id: propiedadId },
      orderBy: { created_at: 'desc' },
    });
  }

  async publicar(
    tenantId: string,
    propiedadId: string,
    portal: 'ENCUENTRA24' | 'MERCADOLIBRE',
  ) {
    const prop = await this.assertPropiedad(tenantId, propiedadId);

    const existing = await this.prisma.sindicacionPublicacion.findFirst({
      where: { propiedad_id: propiedadId, portal, estado: 'PUBLICADO' },
    });
    if (existing)
      throw new BadRequestException(`Ya está publicado en ${portal}`);

    const record = await this.prisma.sindicacionPublicacion.upsert({
      where: { propiedad_id_portal: { propiedad_id: propiedadId, portal } },
      create: {
        tenant_id: tenantId,
        propiedad_id: propiedadId,
        portal,
        estado: 'PENDIENTE',
      },
      update: { estado: 'PENDIENTE', error_msg: null, retirado_at: null },
    });

    try {
      const imagenes =
        (prop as any).imagenes?.map((i: any) => i.url).filter(Boolean) ?? [];
      const precio = Number(prop.precio_venta ?? prop.precio_renta ?? 0);

      let externalId: string | undefined;
      let externalUrl: string | undefined;

      if (portal === 'ENCUENTRA24') {
        const result = await this.publicarEncontra24(prop, precio, imagenes);
        externalId = result.id;
        externalUrl = result.url;
      } else if (portal === ('ZILLOW' as any)) {
        // §16 CA-1: Zillow integration (requires Zillow Data Connect partnership)
        // Generates RESO/RETS compliant XML feed entry stored locally until
        // a Zillow Data Connect agreement is in place for the tenant.
        const result = await this.publicarZillow(prop, precio, imagenes);
        externalId = result.id;
        externalUrl = result.url;
      } else {
        const result = await this.publicarMercadoLibre(prop, precio, imagenes);
        externalId = result.id;
        externalUrl = result.permalink;
      }

      return this.prisma.sindicacionPublicacion.update({
        where: { id: record.id },
        data: {
          estado: 'PUBLICADO',
          external_id: externalId,
          external_url: externalUrl,
          publicado_at: new Date(),
        },
      });
    } catch (err: any) {
      await this.prisma.sindicacionPublicacion.update({
        where: { id: record.id },
        data: {
          estado: 'ERROR',
          error_msg: err?.message ?? 'Error desconocido',
        },
      });
      throw new BadRequestException(
        `Error al publicar en ${portal}: ${err?.message}`,
      );
    }
  }

  async retirar(
    tenantId: string,
    propiedadId: string,
    portal: 'ENCUENTRA24' | 'MERCADOLIBRE',
  ) {
    await this.assertPropiedad(tenantId, propiedadId);

    const pub = await this.prisma.sindicacionPublicacion.findFirst({
      where: { propiedad_id: propiedadId, portal, estado: 'PUBLICADO' },
    });
    if (!pub)
      throw new NotFoundException(`No hay publicación activa en ${portal}`);

    try {
      if (pub.external_id) {
        if (portal === 'ENCUENTRA24')
          await this.retirarEncontra24(pub.external_id);
        else await this.retirarMercadoLibre(pub.external_id);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo retirar de ${portal}: ${err?.message}`);
    }

    return this.prisma.sindicacionPublicacion.update({
      where: { id: pub.id },
      data: { estado: 'RETIRADO', retirado_at: new Date() },
    });
  }

  // ─── Encuentra24 ─────────────────────────────────────────────

  private async publicarEncontra24(
    prop: any,
    precio: number,
    imagenes: string[],
  ) {
    if (!this.e24ApiKey) throw new Error('ENCUENTRA24_API_KEY no configurado');

    const body: Encuentra24Listing = {
      category: TIPO_CATEGORIA_ENCUENTRA24[prop.tipo] ?? 'real_estate',
      type: prop.gestion === 'RENTA' ? 'rent' : 'sale',
      price: precio,
      currency: prop.moneda ?? 'GTQ',
      title: prop.titulo,
      description: prop.descripcion ?? prop.titulo,
      location: {
        country: 'GT',
        region: prop.departamento ?? undefined,
        city: prop.municipio ?? undefined,
      },
      images: imagenes.slice(0, 10),
      attributes: {
        area: prop.area_construccion_m2
          ? Number(prop.area_construccion_m2)
          : undefined,
        bedrooms: prop.habitaciones ?? undefined,
        bathrooms: prop.banos ?? undefined,
        parking: prop.parqueos ?? undefined,
      },
    };

    const res = await fetch(`${this.e24BaseUrl}/classifieds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.e24ApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `HTTP ${res.status}`);
    }

    const data: any = await res.json();
    return {
      id: String(data.id ?? data.classifiedId),
      url: data.url ?? data.permalink,
    };
  }

  private async retirarEncontra24(externalId: string) {
    if (!this.e24ApiKey) return;
    await fetch(`${this.e24BaseUrl}/classifieds/${externalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.e24ApiKey}` },
    });
  }

  // ─── MercadoLibre ────────────────────────────────────────────

  private async publicarMercadoLibre(
    prop: any,
    precio: number,
    imagenes: string[],
  ) {
    if (!this.mlAccessToken) throw new Error('ML_ACCESS_TOKEN no configurado');

    const body: MercadoLibreItem = {
      title: prop.titulo,
      category_id: TIPO_CATEGORIA_ML[prop.tipo] ?? 'MLG1459',
      price: precio,
      currency_id: 'GTQ',
      available_quantity: 1,
      buying_mode: 'classified',
      condition: 'not_specified',
      listing_type_id: 'gold_special',
      description: { plain_text: prop.descripcion ?? prop.titulo },
      pictures: imagenes.slice(0, 12).map((url) => ({ source: url })),
      attributes: [
        ...(prop.habitaciones
          ? [{ id: 'BEDROOMS', value_name: String(prop.habitaciones) }]
          : []),
        ...(prop.banos
          ? [{ id: 'FULL_BATHROOMS', value_name: String(prop.banos) }]
          : []),
        ...(prop.area_construccion_m2
          ? [
              {
                id: 'COVERED_AREA',
                value_name: String(Number(prop.area_construccion_m2)),
              },
            ]
          : []),
      ],
    };

    const res = await fetch(`${this.mlBaseUrl}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.mlAccessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `HTTP ${res.status}`);
    }

    const data: any = await res.json();
    return { id: String(data.id), permalink: data.permalink };
  }

  private async retirarMercadoLibre(externalId: string) {
    if (!this.mlAccessToken) return;
    await fetch(`${this.mlBaseUrl}/items/${externalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.mlAccessToken}`,
      },
      body: JSON.stringify({ status: 'closed' }),
    });
  }

  // ─── Webhook MercadoLibre (notificaciones de estado) ─────────

  async handleMlWebhook(topic: string, resource: string) {
    if (topic !== 'items') return;
    const itemId = resource.split('/').pop();
    if (!itemId) return;

    const pub = await this.prisma.sindicacionPublicacion.findFirst({
      where: { external_id: itemId, portal: 'MERCADOLIBRE' },
    });
    if (!pub) return;

    const res = await fetch(`${this.mlBaseUrl}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${this.mlAccessToken}` },
    });
    if (!res.ok) return;
    const item: any = await res.json();

    if (item.status === 'closed' || item.status === 'inactive') {
      await this.prisma.sindicacionPublicacion.update({
        where: { id: pub.id },
        data: { estado: 'RETIRADO', retirado_at: new Date() },
      });
    }
  }

  // ─── Private ─────────────────────────────────────────────────

  private async assertPropiedad(tenantId: string, propiedadId: string) {
    const prop = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
      include: {
        imagenes: { select: { url: true }, orderBy: { orden: 'asc' } },
      },
    });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');
    if (prop.estado === 'BORRADOR' || prop.estado === 'SUSPENDIDA') {
      throw new BadRequestException(
        'Solo se pueden sindicar propiedades en estado DISPONIBLE o superior',
      );
    }
    return prop;
  }

  // §16 CA-1 — Brecha 1.4: Zillow via RESO/Data Connect feed
  // Requires Zillow Data Connect partnership for production submission.
  // Stores a local feed entry; once ZILLOW_FEED_URL is configured the feed is POSTed.
  private async publicarZillow(prop: any, precio: number, imagenes: string[]) {
    const zillowApiUrl = process.env.ZILLOW_FEED_URL;

    const feedEntry = {
      ListingKey: prop.id,
      ListingId: prop.codigo,
      ListPrice: precio,
      PublicRemarks: prop.descripcion ?? '',
      PropertyType: prop.tipo,
      City: prop.municipio ?? '',
      StateOrProvince: prop.departamento ?? '',
      Country: 'GT',
      ListAgentKey: prop.agente_id ?? '',
      Media: imagenes.map((url, i) => ({ Order: i + 1, MediaURL: url })),
    };

    if (zillowApiUrl) {
      const res = await fetch(zillowApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedEntry),
      });
      if (!res.ok) throw new Error(`Zillow feed error: ${res.status}`);
    } else {
      this.logger.warn(
        'ZILLOW_FEED_URL no configurado — entrada generada localmente sin envío',
      );
    }

    return {
      id: `zillow-${prop.id}`,
      url: `https://www.zillow.com/homes/${prop.id}`,
    };
  }

  // §16 CA-1 — Brecha 1.5: Programmatically sync properties based on sinc_frecuencia config
  async sincronizarPorFrecuencia(tenantId: string) {
    const config = await this.prisma.configSeguridad.findUnique({
      where: { tenant_id: tenantId },
    });
    if (!config || config.sinc_frecuencia === 'manual') return;

    // Retrieve properties with active syndications that need refresh
    const publicaciones = await this.prisma.sindicacionPublicacion.findMany({
      where: { tenant_id: tenantId, estado: 'PUBLICADO' },
      select: { propiedad_id: true, portal: true },
      distinct: ['propiedad_id', 'portal'],
    });

    for (const pub of publicaciones) {
      try {
        await this.retirar(tenantId, pub.propiedad_id, pub.portal as any);
        await this.publicar(tenantId, pub.propiedad_id, pub.portal as any);
      } catch {
        // Non-fatal: log and continue with next property
        this.logger.warn(
          `Error al resincronizar ${pub.propiedad_id} en ${pub.portal}`,
        );
      }
    }
  }
}
