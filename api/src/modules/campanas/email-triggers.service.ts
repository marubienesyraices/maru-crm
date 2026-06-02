import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomUUID } from 'crypto';

// §14 CA-2: Configurable email trigger events
export const EVENTOS_TRIGGER = [
  'on_nuevo_interesado',    // Client shows interest in a property
  'on_cambio_estado',       // Pipeline state changes
  'on_propiedad_nueva_match', // New property matches client preferences
  'on_cita_agendada',       // Visit appointment scheduled
  'on_inactividad',         // Lead inactive beyond threshold
] as const;

export type EventoTrigger = typeof EVENTOS_TRIGGER[number];

@Injectable()
export class EmailTriggersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async listTriggers(tenantId: string) {
    const existing = await this.prisma.emailTrigger.findMany({
      where: { tenant_id: tenantId },
      include: { plantilla: { select: { id: true, nombre: true, asunto: true } } },
    });

    // Return all event types with current config (default: inactive if not set)
    return EVENTOS_TRIGGER.map((evento) => {
      const found = existing.find((t) => t.evento === evento);
      return found ?? {
        id: null,
        tenant_id: tenantId,
        evento,
        activo: false,
        plantilla_id: null,
        plantilla: null,
      };
    });
  }

  async upsertTrigger(tenantId: string, evento: string, activo: boolean, plantillaId?: string | null) {
    if (!EVENTOS_TRIGGER.includes(evento as EventoTrigger)) {
      throw new Error(`Evento no válido: ${evento}. Valores permitidos: ${EVENTOS_TRIGGER.join(', ')}`);
    }

    return this.prisma.emailTrigger.upsert({
      where: { tenant_id_evento: { tenant_id: tenantId, evento } },
      create: {
        id: randomUUID(),
        tenant_id: tenantId,
        evento,
        activo,
        plantilla_id: plantillaId ?? null,
      },
      update: {
        activo,
        plantilla_id: plantillaId ?? null,
      },
      include: { plantilla: { select: { id: true, nombre: true, asunto: true } } },
    });
  }

  // Called by pipeline/visitas services to fire a trigger event
  async fireTrigger(tenantId: string, evento: EventoTrigger, vars: {
    clienteEmail?: string | null;
    clienteNombre?: string;
    propiedadTitulo?: string;
    propiedadId?: string;
    nuevoEstado?: string;
  }) {
    const trigger = await this.prisma.emailTrigger.findUnique({
      where: { tenant_id_evento: { tenant_id: tenantId, evento } },
      include: { plantilla: true },
    });

    if (!trigger?.activo || !trigger.plantilla || !vars.clienteEmail) return;

    const interpolated = trigger.plantilla.cuerpo_html
      .replace(/\{\{nombre_cliente\}\}/g, vars.clienteNombre ?? '')
      .replace(/\{\{titulo_propiedad\}\}/g, vars.propiedadTitulo ?? '')
      .replace(/\{\{nuevo_estado\}\}/g, vars.nuevoEstado ?? '');

    await this.email.sendClientEmail({
      to: vars.clienteEmail,
      subject: trigger.plantilla.asunto,
      heading: trigger.plantilla.asunto,
      body: interpolated,
      tenantId,
    }).catch(() => {});
  }
}
