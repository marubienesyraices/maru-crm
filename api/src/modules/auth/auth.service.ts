import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import * as geoip from 'geoip-lite';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailService } from '../email/email.service';
import { LoginDto, Verify2FADto, ResetPasswordDto, OnboardingDto } from './dto';
import { randomUUID } from 'crypto';



@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
    private email: EmailService,
  ) {}

  // ─── LOGIN STEP 1: Email + Password ──────────────────────

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.tenant.estado === 'SUSPENDIDA' || user.tenant.estado === 'CANCELADA') {
      throw new ForbiddenException('La empresa se encuentra suspendida o cancelada');
    }

    if (user.bloqueado_hasta && user.bloqueado_hasta > new Date()) {
      const minutesLeft = Math.ceil(
        (user.bloqueado_hasta.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Cuenta bloqueada. Intente en ${minutesLeft} minutos`,
      );
    }

    if (user.estado === 'SUSPENDIDO' || user.estado === 'INACTIVO') {
      throw new ForbiddenException('Su cuenta se encuentra deshabilitada');
    }

    await this.validateGeofence(ip, user.tenant_id);

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      await this.handleFailedLogin(user.id, user.tenant_id, ip, userAgent);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.totp_habilitado) {
      const tempToken = this.jwt.sign(
        { sub: user.id, tenantId: user.tenant_id, step: '2fa' },
        { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: 300 },
      );
      return { requires2FA: true, tempToken };
    }

    return this.issueTokens(user.id, user.tenant_id, user.email, user.rol, ip, userAgent);
  }

  // ─── LOGIN STEP 2: TOTP Verification ─────────────────────

  async verify2FA(dto: Verify2FADto, ip: string, userAgent: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(dto.tempToken, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token temporal expirado');
    }

    if (payload.step !== '2fa') {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.totp_secret) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const totpFailKey = `totp_fail:${user.id}`;
    const MAX_TOTP_ATTEMPTS = 5;
    const TOTP_LOCKOUT_SECONDS = 900; // 15 min

    const failCount = parseInt((await this.redis.get(totpFailKey)) ?? '0', 10);
    if (failCount >= MAX_TOTP_ATTEMPTS) {
      throw new ForbiddenException('Demasiados intentos fallidos. Intente en 15 minutos.');
    }

    const totpInstance = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(user.totp_secret) });
    const isValid = totpInstance.validate({ token: dto.totpCode, window: 1 }) !== null;

    if (!isValid) {
      await this.redis.client.multi()
        .incr(totpFailKey)
        .expire(totpFailKey, TOTP_LOCKOUT_SECONDS)
        .exec();
      throw new UnauthorizedException('Código 2FA inválido');
    }

    await this.redis.client.del(totpFailKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { intentos_login: 0, bloqueado_hasta: null, ultimo_login: new Date() },
    });

    await this.auditLog(user.tenant_id, user.id, user.nombre, 'LOGIN', 'Auth', 'User', user.id, ip, userAgent);

    return this.issueTokens(user.id, user.tenant_id, user.email, user.rol, ip, userAgent);
  }

  // ─── SETUP 2FA ────────────────────────────────────────────

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const secret = new OTPAuth.Secret();
    const totpInstance = new OTPAuth.TOTP({
      issuer: 'GestPro',
      label: user.email,
      secret,
    });
    const otpauthUrl = totpInstance.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    const secretBase32 = secret.base32;

    await this.prisma.user.update({
      where: { id: userId },
      data: { totp_secret: secretBase32 },
    });

    return { secret: secretBase32, qrCodeDataUrl };
  }

  async confirm2FA(userId: string, totpCode: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totp_secret) {
      throw new BadRequestException('Configure 2FA primero');
    }

    const totpInstance = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(user.totp_secret) });
    const isValid = totpInstance.validate({ token: totpCode, window: 1 }) !== null;
    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { totp_habilitado: true },
    });

    return { message: '2FA activado exitosamente' };
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refresh_token: refreshToken },
    });

    if (!session || session.expires_at < new Date()) {
      throw new UnauthorizedException('Sesión expirada');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.user_id },
      include: { tenant: { select: { estado: true } } },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (user.tenant.estado !== 'ACTIVA' && user.tenant.estado !== 'TRIAL') {
      await this.prisma.session.deleteMany({ where: { refresh_token: refreshToken } });
      throw new UnauthorizedException('La empresa se encuentra suspendida o cancelada');
    }

    const accessToken = this.jwt.sign(
      { sub: user.id, tenantId: user.tenant_id, email: user.email, rol: user.rol },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 900,
      },
    );

    return { accessToken };
  }

  // ─── LOGOUT ───────────────────────────────────────────────

  async logout(refreshToken: string, userId: string, tenantId: string, ip: string, userAgent: string) {
    await this.prisma.session.deleteMany({ where: { refresh_token: refreshToken } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.auditLog(tenantId, userId, user.nombre, 'LOGOUT', 'Auth', 'User', userId, ip, userAgent);
    }
    return { message: 'Sesión cerrada' };
  }

  // ─── FORGOT PASSWORD ─────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) return { message: 'Si el correo existe, recibirá un enlace de recuperación' };

    const token = randomUUID();
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expires: expires },
    });

    const resetUrl = `${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'}/reset-password?token=${token}`;

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Reset link: ${resetUrl}`);
    }

    this.email.sendSystemEmail({
      to: user.email,
      subject: 'Recuperación de contraseña — GestPro CRM',
      heading: 'Restablecer contraseña',
      body: `Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente enlace (válido por 30 minutos). Si no solicitaste este cambio, puedes ignorar este correo.`,
      cta: { label: 'Restablecer contraseña', url: resetUrl },
    }).catch(() => {});

    return { message: 'Si el correo existe, recibirá un enlace de recuperación' };
  }

  // ─── RESET PASSWORD ──────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        reset_token: dto.token,
        reset_token_expires: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Token inválido o expirado');

    const history: string[] = (user.password_history as string[]) || [];
    for (const oldHash of history) {
      if (await bcrypt.compare(dto.newPassword, oldHash)) {
        throw new BadRequestException('No puede reutilizar las últimas 5 contraseñas');
      }
    }

    const hash = await bcrypt.hash(dto.newPassword, 12);
    const newHistory = [hash, ...history].slice(0, 5);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hash,
        password_history: newHistory,
        password_changed_at: new Date(),
        reset_token: null,
        reset_token_expires: null,
        intentos_login: 0,
        bloqueado_hasta: null,
      },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  // ─── ONBOARDING ──────────────────────────────────────────

  async onboarding(dto: OnboardingDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        activation_token: dto.token,
        activation_expires: { gt: new Date() },
        estado: 'PENDIENTE',
      },
    });

    if (!user) throw new BadRequestException('Token de activación inválido o expirado');

    const hash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hash,
        password_history: [hash],
        password_changed_at: new Date(),
        estado: 'ACTIVO',
        activation_token: null,
        activation_expires: null,
      },
    });

    return { message: 'Cuenta activada exitosamente. Puede iniciar sesión.' };
  }

  // ─── PRIVATE HELPERS ─────────────────────────────────────

  private async issueTokens(
    userId: string, tenantId: string, email: string, rol: string,
    ip: string, userAgent: string,
  ) {
    const payload = { sub: userId, tenantId, email, rol };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900,
    });

    const refreshToken = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.session.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });

    if (sessions.length >= 2) {
      await this.prisma.session.delete({ where: { id: sessions[0].id } });
    }

    await this.prisma.session.create({
      data: {
        user_id: userId,
        tenant_id: tenantId,
        refresh_token: refreshToken,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async handleFailedLogin(userId: string, tenantId: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const attempts = user.intentos_login + 1;
    let blockedUntil: Date | null = null;

    if (attempts >= 9) {
      blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } else if (attempts >= 6) {
      blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
    } else if (attempts >= 3) {
      blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { intentos_login: attempts, bloqueado_hasta: blockedUntil },
    });

    await this.auditLog(tenantId, userId, user.nombre, 'LOGIN', 'Auth', 'User', userId, ip, userAgent, {
      resultado: 'FALLIDO', intentos: attempts, bloqueado: !!blockedUntil,
    });
  }

  private async validateGeofence(ip: string, tenantId: string) {
    // Skip geofence for local/private IPs (development)
    const localPatterns = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
    if (localPatterns.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return;
    }

    const config = await this.prisma.configSeguridad.findUnique({
      where: { tenant_id: tenantId },
    });

    if (!config) return;

    // IP Whitelist: if configured, only allow listed IPs
    if (config.ips_permitidas) {
      const allowedIps = config.ips_permitidas as string[];
      if (allowedIps.length > 0 && !allowedIps.includes(ip)) {
        throw new ForbiddenException('Acceso denegado: su dirección IP no está autorizada');
      }
    }

    // Country-based geofence
    if (config.geo_paises) {
      const geo = geoip.lookup(ip);
      const allowedCountries = config.geo_paises as string[];
      if (allowedCountries.length > 0 && (!geo || !allowedCountries.includes(geo.country))) {
        throw new ForbiddenException('Acceso denegado desde su ubicación');
      }
    }
  }

  private async auditLog(
    tenantId: string, userId: string, nombre: string,
    accion: string, modulo: string, entidad: string,
    entidadId: string, ip: string, userAgent: string,
    payload?: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenant_id: tenantId, user_id: userId, nombre_usuario: nombre,
        accion: accion as any, modulo, entidad, entidad_id: entidadId,
        ip_address: ip, user_agent: userAgent,
        payload_cambio: payload || undefined,
      },
    });
  }
}
