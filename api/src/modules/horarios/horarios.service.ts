import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertHorarioDto } from './horarios.dto';

@Injectable()
export class HorariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(tenantId: string, userId: string) {
    return this.prisma.horarioLaboral.findMany({
      where: { tenant_id: tenantId, user_id: userId },
      orderBy: { dia_semana: 'asc' },
    });
  }

  async bulkUpsert(tenantId: string, userId: string, horarios: UpsertHorarioDto[]) {
    const ops = horarios.map((h) =>
      this.prisma.horarioLaboral.upsert({
        where: {
          tenant_id_user_id_dia_semana: {
            tenant_id: tenantId,
            user_id: userId,
            dia_semana: h.diaSemana,
          },
        },
        create: {
          tenant_id: tenantId,
          user_id: userId,
          dia_semana: h.diaSemana,
          hora_inicio: h.horaInicio,
          hora_fin: h.horaFin,
          activo: h.activo ?? true,
        },
        update: {
          hora_inicio: h.horaInicio,
          hora_fin: h.horaFin,
          activo: h.activo ?? true,
        },
      }),
    );
    await this.prisma.$transaction(ops);
    return this.findByUser(tenantId, userId);
  }

  /** Returns true if the given ISO datetime falls within the user's working hours */
  async isWithinSchedule(tenantId: string, userId: string, fecha: Date): Promise<boolean> {
    const diaSemana = fecha.getDay(); // 0=Sun … 6=Sat
    const hhmm = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;

    const horario = await this.prisma.horarioLaboral.findFirst({
      where: { tenant_id: tenantId, user_id: userId, dia_semana: diaSemana, activo: true },
    });

    if (!horario) return false; // no schedule for this day → outside hours
    return hhmm >= horario.hora_inicio && hhmm <= horario.hora_fin;
  }
}
