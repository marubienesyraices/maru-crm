import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EstadoInteres, NivelInteres } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { ConfigPortalService } from '../config-portal/config-portal.service';
import { CreateInteresDto, CambiarEstadoInteresDto, UpdateInteresDto, FiltrosPipelineDto } from './dto';

// ─── Helpers comisiones CBR ──────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Tabla CBR Guatemala — honorarios sugeridos para alquiler:
 *  ≤ 1 mes          → 10% del monto total del contrato
 *  > 1 mes < 1 año  → proporcional: (meses/12) × 1 renta mensual
 *  1–5 años         → 1 mes de renta (100% primera renta)
 *  > 5 años         → 1 renta por cada 5 años: ⌈años/5⌉ rentas
 */
function calcularComisionRentaCBR(rentaMensual: number, meses: number): number {
  if (meses <= 1)   return rentaMensual * meses * 0.10;
  if (meses < 12)   return rentaMensual * (meses / 12);
  const años = meses / 12;
  if (años <= 5)    return rentaMensual;
  return rentaMensual * Math.ceil(años / 5);
}

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  NUEVO: ['CONTACTADO', 'PERDIDO'],
  CONTACTADO: ['INTERESADO', 'PERDIDO'],
  INTERESADO: ['EN_NEGOCIACION', 'PERDIDO'],
  EN_NEGOCIACION: ['CIERRE', 'PERDIDO'],
  CIERRE: ['GANADO', 'PERDIDO'],
  GANADO: [],      // terminal
  PERDIDO: ['NUEVO'], // reapertura
};

@Injectable()
export class PipelineService {
  private readonly portalUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly configPortal: ConfigPortalService,
  ) {
    const portalBase = config.get<string>('PORTAL_URL');
    this.portalUrl = portalBase ? portalBase.replace(/\/$/, '') : '';
  }

  async crearInteres(tenantId: string, dto: CreateInteresDto, userId?: string) {
    // Verify client belongs to tenant
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, tenant_id: tenantId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    // If client has no agent, assign the one who is creating the interest
    if (!cliente.agente_id && userId) {
      await this.prisma.cliente.update({
        where: { id: cliente.id },
        data: { agente_id: userId },
      });
    }

    // Verify property belongs to tenant
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: dto.propiedadId, tenant_id: tenantId },
    });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada');

    // Check uniqueness
    const existing = await this.prisma.clientePropiedad.findFirst({
      where: { cliente_id: dto.clienteId, propiedad_id: dto.propiedadId },
    });
    if (existing) throw new ConflictException('Este cliente ya tiene un interés registrado en esta propiedad');

    return this.prisma.clientePropiedad.create({
      data: {
        cliente_id: dto.clienteId,
        propiedad_id: dto.propiedadId,
        nivel_interes: (dto.nivelInteres as NivelInteres) || 'MEDIO',
        presupuesto: dto.presupuesto,
        notas: dto.notas,
      },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
        propiedad: { select: { id: true, titulo: true, codigo: true, tipo: true, precio_venta: true } },
      },
    });
  }

  async cambiarEstado(
    tenantId: string,
    id: string,
    dto: CambiarEstadoInteresDto,
    usuarioRol: string,
    usuarioId: string,
    visibleUserIds: string[] | null,
  ) {
    const interes = await this.findOneWithTenantCheck(tenantId, id);

    // ─── RBAC ─────────────────────────────────────────────────
    const clienteAgenteId = interes.cliente?.agente_id ?? null;
    if (usuarioRol === 'JUNIOR') {
      if (clienteAgenteId !== usuarioId)
        throw new ForbiddenException('Solo puedes modificar trámites de tus propios clientes');
      if (dto.nuevoEstado === 'GANADO')
        throw new ForbiddenException('JUNIOR no puede cerrar trámites como Ganados. Solicita aprobación a tu supervisor.');
    } else if (usuarioRol === 'SENIOR') {
      if (visibleUserIds && clienteAgenteId && !visibleUserIds.includes(clienteAgenteId))
        throw new ForbiddenException('No tienes permiso para modificar este trámite');
    }

    // ─── State machine ─────────────────────────────────────────
    const estadoActual = interes.estado;
    const nuevoEstado = dto.nuevoEstado;

    const permitidas = TRANSICIONES_VALIDAS[estadoActual] || [];
    if (!permitidas.includes(nuevoEstado)) {
      throw new BadRequestException(
        `Transición inválida: ${estadoActual} → ${nuevoEstado}. Permitidas: ${permitidas.join(', ') || 'ninguna (estado terminal)'}`,
      );
    }

    if (nuevoEstado === 'PERDIDO' && !dto.motivoPerdida) {
      throw new BadRequestException('Debe indicar el motivo de pérdida');
    }

    if (nuevoEstado === 'CIERRE') {
      const docs = dto.cierreDocumentos ?? [];
      if (!docs.length) {
        throw new BadRequestException(
          'Debe adjuntar al menos un documento de soporte para pasar a Cierre (promesa de compraventa, comprobante de pago, etc.).',
        );
      }
    }

    // ─── Pipeline data ─────────────────────────────────────────
    const pipelineData: any = { estado: nuevoEstado as EstadoInteres };
    if (nuevoEstado === 'CIERRE' && dto.cierreDocumentos?.length) {
      pipelineData.cierre_documentos = dto.cierreDocumentos;
    }
    if (nuevoEstado === 'CONTACTADO' && !interes.fecha_contacto) {
      pipelineData.fecha_contacto = new Date();
    }
    if (nuevoEstado === 'GANADO' || nuevoEstado === 'PERDIDO') {
      pipelineData.fecha_cierre = new Date();
    }
    if (dto.motivoPerdida) pipelineData.motivo_perdida = dto.motivoPerdida;
    if (nuevoEstado === 'NUEVO') {
      pipelineData.motivo_perdida = null;
      pipelineData.fecha_cierre = null;
    }

    const pipelineInclude = {
      cliente: { select: { id: true, nombre: true } },
      propiedad: { select: { id: true, titulo: true, codigo: true } },
    };

    const propiedadId = interes.propiedad_id;

    // ─── Execute state transition (capture result for post-commit email) ──
    let updated: Awaited<ReturnType<typeof this.prisma.clientePropiedad.update>>;

    if (estadoActual === 'INTERESADO' && nuevoEstado === 'EN_NEGOCIACION') {
      updated = await this.prisma.$transaction(async (tx) => {
        const prop = await tx.propiedad.findUnique({
          where: { id: propiedadId },
          select: { estado: true },
        });

        if (!prop) throw new NotFoundException('Propiedad no encontrada');

        // §11 CA-2 / RN-11: Competitive offer logic
        if (prop.estado === 'RESERVADA') {
          // JUNIOR cannot compete on a reserved property
          if (usuarioRol === 'JUNIOR') {
            throw new ForbiddenException('JUNIOR no puede presentar oferta competitiva sobre una propiedad en negociación.');
          }
          // Only one competitive offer allowed at a time
          const competitivaExistente = await tx.clientePropiedad.count({
            where: { propiedad_id: propiedadId, estado: 'EN_NEGOCIACION', es_oferta_competitiva: true },
          });
          if (competitivaExistente > 0) {
            throw new ConflictException('Ya existe una oferta competitiva activa para esta propiedad. Solo se permite una a la vez.');
          }
          // Mark as competitive offer; property stays RESERVADA
          pipelineData.es_oferta_competitiva = true;
          return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
        }

        if (prop.estado !== 'DISPONIBLE') {
          throw new ConflictException(
            `La propiedad ya está en "${prop.estado}" y no puede entrar en negociación`,
          );
        }

        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: 'RESERVADA' } });
        return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
      });
    } else if (nuevoEstado === 'GANADO') {
      // CIERRE → GANADO: finalize deal and update property
      updated = await this.prisma.$transaction(async (tx) => {
        const prop = await tx.propiedad.findUnique({
          where: { id: propiedadId },
          select: { gestion: true, precio_venta: true, precio_renta: true, comision_porcentaje: true, tenant_id: true },
        });

        // Resolve tipo operacion for AMBAS properties
        const tipoOp: string = prop?.gestion === 'AMBAS'
          ? (dto.tipoOperacionCierre ?? 'VENTA')
          : (prop?.gestion ?? 'VENTA');

        const estadoPropFinal = tipoOp === 'RENTA' ? 'RENTADA' : 'VENDIDA';

        // Precio de cierre
        const precioLista = tipoOp === 'RENTA' ? prop?.precio_renta : prop?.precio_venta;
        const precioCierre = dto.precioAcordado != null
          ? dto.precioAcordado
          : precioLista != null ? Number(precioLista) : null;

        if (precioCierre != null) pipelineData.precio_cierre = precioCierre;
        if (prop?.gestion === 'AMBAS') pipelineData.tipo_operacion_cierre = tipoOp;

        // Duración contrato para RENTA
        const meses = dto.duracionContratoMeses ?? null;
        if (meses != null) pipelineData.duracion_contrato_meses = meses;

        // Obtener % default del tenant para VENTA
        const configSeg = await tx.configSeguridad.findUnique({
          where: { tenant_id: prop?.tenant_id },
          select: { comision_pct_venta_default: true },
        });
        const pctVentaDefault = configSeg?.comision_pct_venta_default
          ? Number(configSeg.comision_pct_venta_default)
          : 5.6;

        // ── Calcular comisiones sugeridas (CBR) ──────────────────
        const precioVenta = prop?.precio_venta ? Number(prop.precio_venta) : null;
        const precioRenta = prop?.precio_renta ? Number(prop.precio_renta) : null;
        const pctVenta = prop?.comision_porcentaje ? Number(prop.comision_porcentaje) : pctVentaDefault;

        // Sugerida VENTA: precio_cierre (o precio_venta) × %
        if (precioVenta != null || precioCierre != null) {
          const baseVenta = tipoOp === 'VENTA' && precioCierre != null ? precioCierre : (precioVenta ?? 0);
          pipelineData.comision_sugerida_venta = round2(baseVenta * (pctVenta / 100));
        }

        // Sugerida RENTA: tabla CBR
        if (precioRenta != null && meses != null) {
          pipelineData.comision_sugerida_renta = round2(calcularComisionRentaCBR(precioRenta, meses));
        }

        // ── Comisión final (acordada) ─────────────────────────────
        if (dto.comisionAcordada != null) {
          // Agente/cliente pactaron un valor diferente
          pipelineData.comision_calculada = round2(dto.comisionAcordada);
        } else {
          // Usar la sugerida del tipo de operación real
          if (tipoOp === 'RENTA' && pipelineData.comision_sugerida_renta != null) {
            pipelineData.comision_calculada = pipelineData.comision_sugerida_renta;
          } else if (pipelineData.comision_sugerida_venta != null) {
            pipelineData.comision_calculada = pipelineData.comision_sugerida_venta;
          }
        }

        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: estadoPropFinal } });
        return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
      });
    } else if (nuevoEstado === 'PERDIDO' && ['EN_NEGOCIACION', 'CIERRE'].includes(estadoActual)) {
      // Release reservation when deal falls through
      updated = await this.prisma.$transaction(async (tx) => {
        await tx.propiedad.update({ where: { id: propiedadId }, data: { estado: 'DISPONIBLE' } });
        return tx.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
      });
    } else {
      updated = await this.prisma.clientePropiedad.update({ where: { id }, data: pipelineData, include: pipelineInclude });
    }

    // §12 CA-1: Auto-entry in timeline for every state change
    this.crearInteraccionSistema(id, usuarioId, `Estado actualizado: ${estadoActual} → ${nuevoEstado}`).catch(() => {});

    // Fire-and-forget: email + invalidar caché BI
    if (interes.cliente.email) {
      this.sendPipelineEmail(nuevoEstado, interes).catch(() => {});
    }
    this.redis.deleteByPattern(`bi:${tenantId}:*`).catch(() => {});

    return updated;
  }

  private async sendPipelineEmail(
    nuevoEstado: string,
    interes: { cliente: { email: string | null; nombre: string; tenant_id: string }; propiedad: { id: string; titulo: string; codigo: string } | null },
  ) {
    const { email, nombre, tenant_id: tenantId } = interes.cliente;
    if (!email) return;
    const propiedad = interes.propiedad;
    if (!propiedad) return;

    const portalBase = await this.configPortal.resolvePortalBaseUrl(tenantId, this.portalUrl);
    const propLabel = `<strong>${propiedad.titulo}</strong> (${propiedad.codigo})`;
    const portalPropUrl = portalBase
      ? `${portalBase}/propiedades/${propiedad.id}`
      : undefined;

    if (nuevoEstado === 'GANADO') {
      await this.email.sendClientEmail({
        to: email,
        subject: `¡Felicitaciones! Tu trámite fue cerrado exitosamente`,
        heading: `🎉 ¡Felicitaciones, ${nombre}!`,
        body: `Nos complace informarte que tu trámite para ${propLabel} ha sido completado exitosamente. Gracias por confiar en nosotros.`,
        tenantId,
      });
    } else if (nuevoEstado === 'EN_NEGOCIACION') {
      await this.email.sendClientEmail({
        to: email,
        subject: `¡Tu solicitud está avanzando! — ${propiedad.titulo}`,
        heading: `¡Tu solicitud está avanzando!`,
        body: `Tu interés en ${propLabel} ha entrado en etapa de negociación. Nuestro equipo está trabajando para ofrecerte las mejores condiciones. Pronto nos pondremos en contacto contigo.`,
        cta: portalPropUrl ? { label: 'Ver propiedad', url: portalPropUrl } : undefined,
        tenantId,
      });
    } else if (nuevoEstado === 'PERDIDO') {
      await this.email.sendClientEmail({
        to: email,
        subject: `Actualización sobre tu solicitud — ${propiedad.titulo}`,
        heading: `Actualización sobre tu solicitud`,
        body: `Lamentamos informarte que tu solicitud para ${propLabel} no pudo concretarse en esta ocasión. Estamos a tu disposición para ayudarte a encontrar la propiedad ideal.`,
        cta: portalBase ? { label: 'Ver otras propiedades', url: portalBase } : undefined,
        tenantId,
      });
    }
  }

  async updateInteres(tenantId: string, id: string, dto: UpdateInteresDto) {
    await this.findOneWithTenantCheck(tenantId, id);

    return this.prisma.clientePropiedad.update({
      where: { id },
      data: {
        nivel_interes: dto.nivelInteres as NivelInteres | undefined,
        presupuesto: dto.presupuesto,
        notas: dto.notas,
      },
    });
  }

  async deleteInteres(tenantId: string, id: string) {
    await this.findOneWithTenantCheck(tenantId, id);
    await this.prisma.clientePropiedad.delete({ where: { id } });
    return { deleted: true };
  }

  async getPipeline(tenantId: string, visibleUserIds: string[] | null = null) {
    const clienteFilter: any = { tenant_id: tenantId };
    if (visibleUserIds) {
      clienteFilter.OR = [
        { agente_id: { in: visibleUserIds } },
        { agente_id: null },
      ];
    }

    const items = await this.prisma.clientePropiedad.findMany({
      where: { cliente: clienteFilter },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true, origen: true } },
        propiedad: {
          select: {
            id: true, titulo: true, codigo: true, tipo: true, gestion: true,
            precio_venta: true, precio_renta: true, comision_porcentaje: true, moneda: true,
          },
        },
        _count: { select: { interacciones: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Group by estado for Kanban columns
    const pipeline: Record<string, typeof items> = {
      NUEVO: [], CONTACTADO: [], INTERESADO: [], EN_NEGOCIACION: [], CIERRE: [], GANADO: [], PERDIDO: [],
    };
    for (const item of items) {
      pipeline[item.estado]?.push(item);
    }

    return pipeline;
  }

  async getByPropiedad(tenantId: string, propiedadId: string) {
    return this.prisma.clientePropiedad.findMany({
      where: {
        propiedad_id: propiedadId,
        cliente: { tenant_id: tenantId },
      },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getStats(tenantId: string, visibleUserIds: string[] | null = null) {
    const clienteFilter: any = { tenant_id: tenantId };
    if (visibleUserIds) clienteFilter.agente_id = { in: visibleUserIds };

    const items = await this.prisma.clientePropiedad.findMany({
      where: { cliente: clienteFilter },
      select: { estado: true, nivel_interes: true },
    });

    const porEstado: Record<string, number> = {};
    const porNivel: Record<string, number> = {};
    for (const item of items) {
      porEstado[item.estado] = (porEstado[item.estado] || 0) + 1;
      porNivel[item.nivel_interes] = (porNivel[item.nivel_interes] || 0) + 1;
    }

    return { total: items.length, porEstado, porNivel };
  }

  private async findOneWithTenantCheck(tenantId: string, id: string) {
    const interes = await this.prisma.clientePropiedad.findFirst({
      where: { id },
      include: {
        cliente: { select: { tenant_id: true, agente_id: true, email: true, nombre: true } },
        propiedad: { select: { id: true, titulo: true, codigo: true } },
      },
    });
    if (!interes || interes.cliente.tenant_id !== tenantId) {
      throw new NotFoundException('Interés no encontrado');
    }
    return interes;
  }

  // §12 CA-1: Create automatic SISTEMA timeline entry after state changes
  private async crearInteraccionSistema(interesId: string, usuarioId: string, notas: string) {
    await this.prisma.interaccion.create({
      data: {
        interes_id: interesId,
        usuario_id: usuarioId,
        tipo: 'SISTEMA' as any,
        resultado: 'NEUTRO',
        notas,
      },
    });
  }
}
