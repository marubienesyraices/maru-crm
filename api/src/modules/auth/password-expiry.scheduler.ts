import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const EXPIRY_DAYS = 90;
const WARN_DAYS = 7;

@Injectable()
export class PasswordExpiryScheduler {
  private readonly logger = new Logger(PasswordExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkPasswordExpiry() {
    const warnCutoff = new Date(
      Date.now() - (EXPIRY_DAYS - WARN_DAYS) * 86_400_000,
    );

    const users = await this.prisma.user.findMany({
      where: {
        estado: 'ACTIVO',
        password_expiry_warned: false,
        password_changed_at: { lte: warnCutoff },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        password_changed_at: true,
        tenant_id: true,
      },
    });

    if (!users.length) return;

    let warned = 0;
    for (const user of users) {
      const age = user.password_changed_at
        ? Math.floor(
            (Date.now() - user.password_changed_at.getTime()) / 86_400_000,
          )
        : EXPIRY_DAYS;
      const daysLeft = Math.max(0, EXPIRY_DAYS - age);

      this.email
        .sendSystemEmail({
          to: user.email,
          subject: `Tu contraseña expira en ${daysLeft} día(s) — GestProp CRM`,
          heading: 'Actualiza tu contraseña',
          body: `Hola ${user.nombre}, tu contraseña de GestProp CRM expirará en <strong>${daysLeft} día(s)</strong>. Te recomendamos cambiarla desde tu perfil para evitar interrupciones.`,
          cta: {
            label: 'Cambiar contraseña',
            url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/settings/perfil`,
          },
        })
        .catch(() => {});

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password_expiry_warned: true },
      });
      warned++;
    }

    if (warned > 0)
      this.logger.warn(
        `🔐 Password expiry: ${warned} usuario(s) notificado(s)`,
      );
  }
}
