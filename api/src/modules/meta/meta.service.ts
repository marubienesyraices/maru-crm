import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMetaPublicacionDto, UpdateMetaPublicacionDto } from './dto';
import { META_QUEUE, MetaJobData } from './meta.constants';
import { MetaPlataforma } from '@prisma/client';

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly pageToken: string | null;
  private readonly pageId: string | null;
  private readonly igUserId: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(META_QUEUE) private readonly queue: Queue<MetaJobData>,
  ) {
    this.pageToken = config.get<string>('META_PAGE_ACCESS_TOKEN') ?? null;
    this.pageId    = config.get<string>('META_PAGE_ID') ?? null;
    this.igUserId  = config.get<string>('META_IG_USER_ID') ?? null;
  }

  get isConfigured(): boolean { return !!(this.pageToken && this.pageId); }
  get igConfigured(): boolean  { return !!(this.pageToken && this.igUserId); }

  // ─── CRUD ────────────────────────────────────────────────────

  async list(tenantId: string) {
    return this.prisma.metaPublicacion.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      include: {
        propiedad: { select: { id: true, codigo: true, titulo: true } },
        agente:    { select: { id: true, nombre: true } },
      },
    });
  }

  async get(tenantId: string, id: string) {
    const p = await this.prisma.metaPublicacion.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        propiedad: { select: { id: true, codigo: true, titulo: true } },
        agente:    { select: { id: true, nombre: true } },
      },
    });
    if (!p) throw new NotFoundException('Publicación no encontrada');
    return p;
  }

  async create(tenantId: string, agenteId: string, dto: CreateMetaPublicacionDto) {
    if (dto.propiedad_id) {
      const prop = await this.prisma.propiedad.findFirst({ where: { id: dto.propiedad_id, tenant_id: tenantId } });
      if (!prop) throw new NotFoundException('Propiedad no encontrada');
    }

    return this.prisma.metaPublicacion.create({
      data: {
        id: randomUUID(),
        tenant_id:    tenantId,
        agente_id:    agenteId,
        propiedad_id: dto.propiedad_id ?? null,
        plataforma:   dto.plataforma as MetaPlataforma,
        mensaje:      dto.mensaje,
        imagen_url:   dto.imagen_url ?? null,
      },
      include: {
        propiedad: { select: { id: true, codigo: true, titulo: true } },
        agente:    { select: { id: true, nombre: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateMetaPublicacionDto) {
    const pub = await this.get(tenantId, id);
    if (pub.estado !== 'BORRADOR') throw new BadRequestException('Solo se pueden editar publicaciones en estado BORRADOR');
    const data: Record<string, unknown> = {};
    if (dto.plataforma  !== undefined) data.plataforma  = dto.plataforma;
    if (dto.mensaje     !== undefined) data.mensaje     = dto.mensaje;
    if (dto.imagen_url  !== undefined) data.imagen_url  = dto.imagen_url;
    return this.prisma.metaPublicacion.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const pub = await this.get(tenantId, id);
    if (pub.estado === 'PUBLICADA') throw new BadRequestException('No se puede eliminar una publicación ya publicada');
    return this.prisma.metaPublicacion.delete({ where: { id } });
  }

  // ─── Preview text from property ──────────────────────────────

  async previewTexto(tenantId: string, propiedadId: string): Promise<{ mensaje: string; imagen_url: string | null }> {
    const prop = await this.prisma.propiedad.findFirst({
      where: { id: propiedadId, tenant_id: tenantId },
      include: {
        imagenes: { orderBy: [{ tipo: 'desc' }, { orden: 'asc' }], take: 1 },
        agente:   { select: { nombre: true } },
      },
    });
    if (!prop) throw new NotFoundException('Propiedad no encontrada');

    const lines: string[] = [`🏠 ${prop.titulo}`, ''];
    if (prop.tipo) lines.push(`Tipo: ${prop.tipo}`);
    if (prop.gestion) lines.push(`Gestión: ${prop.gestion}`);
    if (prop.departamento) lines.push(`Zona: ${prop.departamento}${prop.municipio ? ', ' + prop.municipio : ''}`);
    lines.push('');
    if (prop.precio_venta)  lines.push(`💰 Venta: ${prop.moneda} ${Number(prop.precio_venta).toLocaleString('es-GT')}`);
    if (prop.precio_renta)  lines.push(`🔑 Renta: ${prop.moneda} ${Number(prop.precio_renta).toLocaleString('es-GT')}`);
    if (prop.habitaciones)  lines.push(`🛏 ${prop.habitaciones} habitaciones`);
    if (prop.banos)         lines.push(`🚿 ${prop.banos} baños`);
    if (prop.area_terreno_m2)      lines.push(`📐 Terreno: ${Number(prop.area_terreno_m2).toLocaleString()} m²`);
    if (prop.area_construccion_m2) lines.push(`🏗 Construcción: ${Number(prop.area_construccion_m2).toLocaleString()} m²`);
    lines.push('');
    lines.push('📞 Contáctanos para más información o para agendar una visita.');
    if (prop.agente?.nombre) lines.push(`Agente: ${prop.agente.nombre}`);

    const imagen_url = prop.imagenes[0]?.url ?? null;
    return { mensaje: lines.join('\n'), imagen_url };
  }

  // ─── Publish now ─────────────────────────────────────────────

  async publicar(tenantId: string, id: string) {
    const pub = await this.get(tenantId, id);
    if (!['BORRADOR', 'FALLIDA'].includes(pub.estado)) {
      throw new BadRequestException('Solo se pueden publicar posts en estado BORRADOR o FALLIDA');
    }

    await this.prisma.metaPublicacion.update({ where: { id }, data: { estado: 'PROGRAMADA' } });
    return this.ejecutarPublicacion(id, tenantId);
  }

  // ─── Schedule ────────────────────────────────────────────────

  async programar(tenantId: string, id: string, programadoPara: Date) {
    const pub = await this.get(tenantId, id);
    if (pub.estado !== 'BORRADOR') throw new BadRequestException('Solo borradores pueden programarse');

    const minTime = new Date(Date.now() + 10 * 60 * 1000);
    if (programadoPara < minTime) throw new BadRequestException('La fecha debe ser al menos 10 minutos en el futuro');

    const delay = programadoPara.getTime() - Date.now();
    await this.queue.add('publish', { publicacionId: id, tenantId }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 60000 } });

    return this.prisma.metaPublicacion.update({
      where: { id },
      data:  { estado: 'PROGRAMADA', programado_para: programadoPara },
    });
  }

  // ─── Core publish logic (called by controller + processor) ───

  async ejecutarPublicacion(id: string, tenantId: string) {
    const pub = await this.get(tenantId, id);
    const plataforma = pub.plataforma as string;

    let fbPostId: string | null = null;
    let igPostId: string | null = null;
    let error: string | null = null;

    try {
      if ((plataforma === 'FACEBOOK' || plataforma === 'AMBAS') && this.isConfigured) {
        fbPostId = await this.publishFacebook(pub.mensaje, pub.imagen_url);
      }
      if ((plataforma === 'INSTAGRAM' || plataforma === 'AMBAS') && this.igConfigured && pub.imagen_url) {
        igPostId = await this.publishInstagram(pub.mensaje, pub.imagen_url);
      } else if ((plataforma === 'INSTAGRAM' || plataforma === 'AMBAS') && this.igConfigured && !pub.imagen_url) {
        this.logger.warn(`Instagram post ${id} skipped — no image URL (Instagram requires an image)`);
      }

      if (!fbPostId && !igPostId) {
        throw new Error(!this.isConfigured ? 'Credenciales de Meta no configuradas en el servidor' : 'No se pudo publicar en ninguna plataforma');
      }

      return this.prisma.metaPublicacion.update({
        where: { id },
        data: { estado: 'PUBLICADA', publicado_at: new Date(), fb_post_id: fbPostId, ig_post_id: igPostId, error_msg: null },
      });
    } catch (err: any) {
      error = String(err?.message ?? err);
      this.logger.error(`Meta publish ${id} failed: ${error}`);
      await this.prisma.metaPublicacion.update({ where: { id }, data: { estado: 'FALLIDA', error_msg: error } });
      throw new BadRequestException(`Error al publicar: ${error}`);
    }
  }

  // ─── Graph API helpers ───────────────────────────────────────

  private async publishFacebook(mensaje: string, imagenUrl: string | null): Promise<string> {
    const token = this.pageToken!;
    const pageId = this.pageId!;

    if (imagenUrl) {
      const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: imagenUrl, caption: mensaje }),
        signal:  AbortSignal.timeout(20_000),
      });
      const json: any = await res.json();
      if (!res.ok || !json.id) throw new Error(json.error?.message ?? `Facebook photos HTTP ${res.status}`);
      return json.id;
    }

    const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: mensaje }),
      signal:  AbortSignal.timeout(15_000),
    });
    const json: any = await res.json();
    if (!res.ok || !json.id) throw new Error(json.error?.message ?? `Facebook feed HTTP ${res.status}`);
    return json.id;
  }

  private async publishInstagram(caption: string, imagenUrl: string): Promise<string> {
    const token  = this.pageToken!;
    const userId = this.igUserId!;

    // Step 1: create media container
    const step1 = await fetch(`${GRAPH_BASE}/${userId}/media`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image_url: imagenUrl, caption }),
      signal:  AbortSignal.timeout(20_000),
    });
    const container: any = await step1.json();
    if (!step1.ok || !container.id) throw new Error(container.error?.message ?? `IG container HTTP ${step1.status}`);

    // Step 2: publish container
    const step2 = await fetch(`${GRAPH_BASE}/${userId}/media_publish`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ creation_id: container.id }),
      signal:  AbortSignal.timeout(15_000),
    });
    const pub: any = await step2.json();
    if (!step2.ok || !pub.id) throw new Error(pub.error?.message ?? `IG publish HTTP ${step2.status}`);
    return pub.id;
  }
}
