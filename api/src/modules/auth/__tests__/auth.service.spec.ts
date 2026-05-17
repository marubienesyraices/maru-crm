import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };

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
    jwtService = { sign: jest.fn().mockReturnValue('jwt-token'), verify: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('test-secret') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined), deleteByPattern: jest.fn().mockResolvedValue(undefined) } },
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
        service.login({ email: 'noexiste@x.com', password: 'x' }, '127.0.0.1', ''),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException con contraseña incorrecta', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.auditLog.create.mockResolvedValue({});

      await expect(
        service.login({ email: 'test@marubr.com', password: 'WrongPass' }, '127.0.0.1', ''),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar ForbiddenException si tenant está suspendido', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        tenant: { id: 'tenant-1', estado: 'SUSPENDIDA' },
      });

      await expect(
        service.login({ email: 'test@marubr.com', password: 'Test@2026' }, '127.0.0.1', ''),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si cuenta bloqueada', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        bloqueado_hasta: new Date(Date.now() + 60000), // blocked for 1 more minute
      });

      await expect(
        service.login({ email: 'test@marubr.com', password: 'Test@2026' }, '127.0.0.1', ''),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si cuenta suspendida', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        estado: 'SUSPENDIDO',
      });

      await expect(
        service.login({ email: 'test@marubr.com', password: 'Test@2026' }, '127.0.0.1', ''),
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
        service.login({ email: 'test@marubr.com', password: 'Wrong' }, '127.0.0.1', ''),
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

      await expect(service.refreshToken('expired')).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si sesión no existe', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid')).rejects.toThrow(UnauthorizedException);
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
        service.resetPassword({ token: 'valid-token', newPassword: 'OldPass@123' }),
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

      const result = await service.logout('refresh-token', 'user-1', 'tenant-1', '127.0.0.1', 'agent');

      expect(result.message).toBe('Sesión cerrada');
      expect(prisma.session.deleteMany).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
