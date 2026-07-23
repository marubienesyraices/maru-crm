import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { EmailService } from '../../email/email.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    deleteByPattern: jest.Mock;
    client: { multi: jest.Mock; del: jest.Mock };
  };

  const mockUser = {
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'test@marubr.com',
    password_hash: '',
    nombre: 'Test User',
    rol: 'ADMIN',
    estado: 'ACTIVO',
    totp_habilitado: false,
    totp_secret: null,
    intentos_login: 0,
    bloqueado_hasta: null,
    ultimo_login: null,
    tenant: { id: 'tenant-1', estado: 'ACTIVA' },
  };

  beforeAll(async () => {
    mockUser.password_hash = await bcrypt.hash('Test@2026', 12);
  });

  beforeEach(async () => {
    prisma = createMockPrismaService();
    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
      verify: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('test-secret') };
    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
      client: {
        multi: jest.fn().mockReturnValue({
          incr: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }),
        del: jest.fn().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
        {
          provide: EmailService,
          useValue: {
            sendSystemEmail: jest.fn().mockResolvedValue(undefined),
            sendTransactionalEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── LOGIN ────────────────────────────────────────────────

  describe('login', () => {
    it('debe retornar tokens con credenciales válidas', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.session.findMany.mockResolvedValue([]);
      prisma.session.create.mockResolvedValue({ id: 's-1' });

      const result = await service.login(
        { email: 'test@marubr.com', password: 'Test@2026' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('debe lanzar UnauthorizedException con usuario no encontrado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'noexiste@x.com', password: 'x' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException con contraseña incorrecta', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'WrongPass' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar ForbiddenException si tenant está suspendido', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        tenant: { id: 'tenant-1', estado: 'SUSPENDIDA' },
      });

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Test@2026' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si cuenta bloqueada', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        bloqueado_hasta: new Date(Date.now() + 60000), // blocked for 1 more minute
      });

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Test@2026' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si cuenta suspendida', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        estado: 'SUSPENDIDO',
      });

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Test@2026' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe retornar requires2FA si 2FA está habilitado', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        totp_habilitado: true,
      });
      prisma.configSeguridad.findUnique.mockResolvedValue(null);

      const result = await service.login(
        { email: 'test@marubr.com', password: 'Test@2026' },
        '127.0.0.1',
        '',
      );

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).toHaveProperty('tempToken');
    });
  });

  // ─── BLOQUEO PROGRESIVO ──────────────────────────────────

  describe('bloqueo progresivo', () => {
    it('debe bloquear 15min después de 3 intentos fallidos', async () => {
      const userWith2Attempts = { ...mockUser, intentos_login: 2 };
      prisma.user.findFirst.mockResolvedValue(userWith2Attempts);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(userWith2Attempts);
      prisma.user.update.mockResolvedValue(userWith2Attempts);
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Wrong' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);

      // Verify update was called with bloqueado_hasta set
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.intentos_login).toBe(3);
      expect(updateCall.data.bloqueado_hasta).toBeInstanceOf(Date);
    });
  });

  // ─── SESIONES CONCURRENTES ────────────────────────────────

  describe('sesiones concurrentes', () => {
    it('debe eliminar la sesión más antigua cuando hay 2+', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.session.findMany.mockResolvedValue([
        { id: 'old-session', created_at: new Date('2024-01-01') },
        { id: 'recent-session', created_at: new Date('2024-01-02') },
      ]);
      prisma.session.delete.mockResolvedValue({});
      prisma.session.create.mockResolvedValue({ id: 'new-session' });

      await service.login(
        { email: 'test@marubr.com', password: 'Test@2026' },
        '127.0.0.1',
        '',
      );

      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: 'old-session' },
      });
    });
  });

  // ─── REFRESH TOKEN ────────────────────────────────────────

  describe('refreshToken', () => {
    it('debe retornar nuevo accessToken con refresh válido', async () => {
      prisma.session.findUnique.mockResolvedValue({
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh');

      expect(result).toHaveProperty('accessToken');
    });

    it('debe lanzar UnauthorizedException si sesión expirada', async () => {
      prisma.session.findUnique.mockResolvedValue({
        user_id: 'user-1',
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.refreshToken('expired')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('debe lanzar UnauthorizedException si sesión no existe', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── FORGOT / RESET PASSWORD ──────────────────────────────

  describe('forgotPassword', () => {
    it('debe retornar mensaje genérico siempre (user existe)', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('test@marubr.com');

      expect(result.message).toContain('Si el correo existe');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('debe retornar mensaje genérico cuando user NO existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.forgotPassword('noexiste@x.com');

      expect(result.message).toContain('Si el correo existe');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('debe rechazar reutilización de contraseñas previas', async () => {
      const oldHash = await bcrypt.hash('OldPass@123', 12);
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        reset_token: 'valid-token',
        reset_token_expires: new Date(Date.now() + 60000),
        password_history: [oldHash],
      });

      await expect(
        service.resetPassword({
          token: 'valid-token',
          newPassword: 'OldPass@123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error con token inválido/expirado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'New@2026' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── LOGOUT ───────────────────────────────────────────────

  describe('logout', () => {
    it('debe eliminar sesión y crear log de auditoría', async () => {
      prisma.session.deleteMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.logout(
        'refresh-token',
        'user-1',
        'tenant-1',
        '127.0.0.1',
        'agent',
      );

      expect(result.message).toBe('Sesión cerrada');
      expect(prisma.session.deleteMany).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  // ─── VERIFY 2FA ───────────────────────────────────────────

  describe('verify2FA', () => {
    const totpSecret = new OTPAuth.Secret();
    const totpUser = {
      ...mockUser,
      id: 'user-2fa',
      totp_secret: totpSecret.base32,
      totp_habilitado: true,
    };
    const validPayload = { sub: 'user-2fa', tenantId: 'tenant-1', step: '2fa' };

    function validCode() {
      return new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(totpSecret.base32),
      }).generate();
    }

    it('debe lanzar UnauthorizedException si el tempToken es inválido/expirado', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(
        service.verify2FA(
          { tempToken: 'bad', totpCode: '123456' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el payload no tiene step "2fa"', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-2fa',
        tenantId: 'tenant-1',
        step: 'other',
      });

      await expect(
        service.verify2FA(
          { tempToken: 'x', totpCode: '123456' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el usuario no existe o no tiene 2FA configurado', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verify2FA(
          { tempToken: 'x', totpCode: '123456' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar ForbiddenException tras 5 intentos fallidos de TOTP', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(totpUser);
      redisService.get.mockResolvedValue('5');

      await expect(
        service.verify2FA(
          { tempToken: 'x', totpCode: '000000' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar un código TOTP inválido e incrementar el contador de fallos', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      prisma.user.findUnique.mockResolvedValue(totpUser);
      redisService.get.mockResolvedValue('1');

      await expect(
        service.verify2FA(
          { tempToken: 'x', totpCode: '000000' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(redisService.client.multi).toHaveBeenCalled();
    });

    it('debe emitir tokens con un código TOTP válido y limpiar el contador de fallos', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      prisma.user.findUnique.mockResolvedValue({
        ...totpUser,
        password_changed_at: new Date(),
      });
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});
      prisma.session.findMany.mockResolvedValue([]);
      prisma.session.create.mockResolvedValue({ id: 's-1' });

      const result = await service.verify2FA(
        { tempToken: 'x', totpCode: validCode() },
        '127.0.0.1',
        '',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect((result as any).passwordExpiresIn).toBeUndefined();
      expect(redisService.client.del).toHaveBeenCalled();
    });

    it('debe incluir passwordExpiresIn=0 si la contraseña ya expiró (90+ días)', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      prisma.user.findUnique.mockResolvedValue({
        ...totpUser,
        password_changed_at: new Date(Date.now() - 100 * 86_400_000),
      });
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});
      prisma.session.findMany.mockResolvedValue([]);
      prisma.session.create.mockResolvedValue({ id: 's-1' });

      const result = await service.verify2FA(
        { tempToken: 'x', totpCode: validCode() },
        '127.0.0.1',
        '',
      );

      expect((result as any).passwordExpiresIn).toBe(0);
    });

    it('debe incluir passwordExpiresIn con los días restantes si está cerca de expirar', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      prisma.user.findUnique.mockResolvedValue({
        ...totpUser,
        password_changed_at: new Date(Date.now() - 85 * 86_400_000), // 5 días restantes
      });
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});
      prisma.session.findMany.mockResolvedValue([]);
      prisma.session.create.mockResolvedValue({ id: 's-1' });

      const result = await service.verify2FA(
        { tempToken: 'x', totpCode: validCode() },
        '127.0.0.1',
        '',
      );

      expect((result as any).passwordExpiresIn).toBe(5);
    });
  });

  // ─── SETUP / CONFIRM / DISABLE 2FA ────────────────────────

  describe('setup2FA', () => {
    it('debe lanzar BadRequestException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setup2FA('no-existe')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe generar un secreto y un QR, y guardarlo en el usuario', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});

      const result = await service.setup2FA('user-1');

      expect(result).toHaveProperty('secret');
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totp_secret: result.secret },
      });
    });
  });

  describe('confirm2FA', () => {
    const secret = new OTPAuth.Secret();
    const userWithSecret = { ...mockUser, totp_secret: secret.base32 };

    it('debe lanzar BadRequestException si el usuario no configuró 2FA aún', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        totp_secret: null,
      });
      await expect(service.confirm2FA('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException con un código inválido', async () => {
      prisma.user.findUnique.mockResolvedValue(userWithSecret);
      await expect(service.confirm2FA('user-1', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe activar el 2FA con un código válido', async () => {
      prisma.user.findUnique.mockResolvedValue(userWithSecret);
      prisma.user.update.mockResolvedValue({});
      const code = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret.base32),
      }).generate();

      const result = await service.confirm2FA('user-1', code);

      expect(result.message).toContain('activado');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totp_habilitado: true },
      });
    });
  });

  describe('disable2FA', () => {
    const secret = new OTPAuth.Secret();
    const userWithSecret = {
      ...mockUser,
      totp_secret: secret.base32,
      totp_habilitado: true,
    };

    it('debe lanzar BadRequestException si 2FA no está habilitado', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        totp_habilitado: false,
        totp_secret: null,
      });
      await expect(service.disable2FA('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException con un código inválido', async () => {
      prisma.user.findUnique.mockResolvedValue(userWithSecret);
      await expect(service.disable2FA('user-1', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe desactivar el 2FA con un código válido', async () => {
      prisma.user.findUnique.mockResolvedValue(userWithSecret);
      prisma.user.update.mockResolvedValue({});
      const code = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret.base32),
      }).generate();

      const result = await service.disable2FA('user-1', code);

      expect(result.message).toContain('desactivado');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totp_habilitado: false, totp_secret: null },
      });
    });
  });

  // ─── CHANGE PASSWORD ──────────────────────────────────────

  describe('changePassword', () => {
    it('debe lanzar BadRequestException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('no-existe', 'x', 'y'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la contraseña actual es incorrecta', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.changePassword('user-1', 'ContraseñaIncorrecta', 'Nueva@2026'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar reutilizar una de las últimas 5 contraseñas', async () => {
      const oldHash = await bcrypt.hash('Reutilizada@2026', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password_history: [oldHash],
      });

      await expect(
        service.changePassword('user-1', 'Test@2026', 'Reutilizada@2026'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar la contraseña y el historial con datos válidos', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password_history: [],
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword(
        'user-1',
        'Test@2026',
        'NuevaSegura@2026',
      );

      expect(result.message).toContain('actualizada');
      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.password_history).toHaveLength(1);
    });
  });

  // ─── ONBOARDING ───────────────────────────────────────────

  describe('onboarding', () => {
    it('debe lanzar BadRequestException con token inválido/expirado', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.onboarding({ token: 'invalido', password: 'Nueva@2026' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe activar la cuenta y establecer la contraseña con un token válido', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        activation_token: 'valid-token',
        activation_expires: new Date(Date.now() + 60000),
        estado: 'PENDIENTE',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.onboarding({
        token: 'valid-token',
        password: 'Nueva@2026',
      });

      expect(result.message).toContain('activada');
      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.estado).toBe('ACTIVO');
      expect(data.activation_token).toBeNull();
    });
  });

  // ─── REFRESH TOKEN: TENANT SUSPENDIDO ─────────────────────

  describe('refreshToken — tenant suspendido', () => {
    it('debe eliminar la sesión y lanzar UnauthorizedException si el tenant está suspendido', async () => {
      prisma.session.findUnique.mockResolvedValue({
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        tenant: { estado: 'SUSPENDIDA' },
      });
      prisma.session.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.refreshToken('valid-refresh')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { refresh_token: 'valid-refresh' },
      });
    });

    it('debe lanzar UnauthorizedException si el usuario de la sesión ya no existe', async () => {
      prisma.session.findUnique.mockResolvedValue({
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('valid-refresh')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── BLOQUEO PROGRESIVO: NIVELES SUPERIORES ───────────────

  describe('bloqueo progresivo — niveles superiores', () => {
    it('debe bloquear 1 hora tras 6 intentos fallidos', async () => {
      const userWith5Attempts = { ...mockUser, intentos_login: 5 };
      prisma.user.findFirst.mockResolvedValue(userWith5Attempts);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(userWith5Attempts);
      prisma.user.update.mockResolvedValue(userWith5Attempts);
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Wrong' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.intentos_login).toBe(6);
      const blockedMs = updateCall.data.bloqueado_hasta.getTime() - Date.now();
      expect(blockedMs).toBeGreaterThan(55 * 60 * 1000);
      expect(blockedMs).toBeLessThanOrEqual(60 * 60 * 1000);
    });

    it('debe bloquear indefinidamente tras 9 intentos fallidos (requiere desbloqueo manual)', async () => {
      const userWith8Attempts = { ...mockUser, intentos_login: 8 };
      prisma.user.findFirst.mockResolvedValue(userWith8Attempts);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(userWith8Attempts);
      prisma.user.update.mockResolvedValue(userWith8Attempts);
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Wrong' },
          '127.0.0.1',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.intentos_login).toBe(9);
      expect(updateCall.data.bloqueado_hasta.getUTCFullYear()).toBe(2099);
    });
  });

  // ─── GEOFENCE ──────────────────────────────────────────────

  describe('geofence', () => {
    const externalIp = '203.0.113.5'; // TEST-NET-3, tratada como IP externa (no local)

    it('debe rechazar accesos desde una IP fuera de la whitelist configurada', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue({
        ips_permitidas: ['198.51.100.1'],
        geo_paises: null,
      });

      await expect(
        service.login(
          { email: 'test@marubr.com', password: 'Test@2026' },
          externalIp,
          '',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir accesos desde una IP incluida en la whitelist', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue({
        ips_permitidas: [externalIp],
        geo_paises: null,
      });
      prisma.session.findMany.mockResolvedValue([]);
      prisma.session.create.mockResolvedValue({ id: 's-1' });

      const result = await service.login(
        { email: 'test@marubr.com', password: 'Test@2026' },
        externalIp,
        '',
      );

      expect(result).toHaveProperty('accessToken');
    });

    it('sin restricciones configuradas (ips_permitidas/geo_paises vacíos), debe permitir el acceso', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue({
        ips_permitidas: [],
        geo_paises: [],
      });
      prisma.session.findMany.mockResolvedValue([]);
      prisma.session.create.mockResolvedValue({ id: 's-1' });

      const result = await service.login(
        { email: 'test@marubr.com', password: 'Test@2026' },
        externalIp,
        '',
      );

      expect(result).toHaveProperty('accessToken');
    });
  });
});
