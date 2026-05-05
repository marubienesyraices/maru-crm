import { Test, TestingModule } from '@nestjs/testing';
import { NotificacionesService } from '../notificaciones.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

const mockNotificacion = {
  id: 'notif-001',
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  tipo: 'SISTEMA',
  titulo: 'Test',
  mensaje: 'Mensaje de prueba',
  leida: false,
  entidad: null,
  entidad_id: null,
  created_at: new Date(),
};

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let prisma: MockPrismaService;
  let emailSend: jest.Mock;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emailSend = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: EmailService,
          useValue: { isConfigured: true, send: emailSend },
        },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  // ─── CREATE ────────────────────────────────────────────────

  describe('create', () => {
    it('crea la notificación en BD', async () => {
      prisma.notificacion.create.mockResolvedValue(mockNotificacion);
      prisma.user.findUnique.mockResolvedValue({ email: 'agente@maru.com' });

      const result = await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        tipo: 'SISTEMA',
        titulo: 'Test',
        mensaje: 'Mensaje de prueba',
      });

      expect(result.id).toBe('notif-001');
      expect(prisma.notificacion.create).toHaveBeenCalledTimes(1);
    });

    it('dispara email al agente después de crear (fire-and-forget)', async () => {
      prisma.notificacion.create.mockResolvedValue(mockNotificacion);
      prisma.user.findUnique.mockResolvedValue({ email: 'agente@maru.com' });

      await service.create({
        tenantId: TENANT_ID,
        userId: USER_ID,
        tipo: 'DOCUMENTO_POR_VENCER',
        titulo: 'Doc por vencer',
        mensaje: 'Vence en 10 días',
      });

      // Allow micro-task queue to flush
      await new Promise((r) => setImmediate(r));

      expect(emailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'agente@maru.com',
          tipo: 'DOCUMENTO_POR_VENCER',
          titulo: 'Doc por vencer',
        }),
      );
    });

    it('no envía email si el usuario no tiene email', async () => {
      prisma.notificacion.create.mockResolvedValue(mockNotificacion);
      prisma.user.findUnique.mockResolvedValue({ email: null });

      await service.create({
        tenantId: TENANT_ID, userId: USER_ID, tipo: 'SISTEMA', titulo: 'T', mensaje: 'M',
      });

      await new Promise((r) => setImmediate(r));

      expect(emailSend).not.toHaveBeenCalled();
    });

    it('no envía email cuando EmailService no está configurado', async () => {
      const moduleNoEmail: TestingModule = await Test.createTestingModule({
        providers: [
          NotificacionesService,
          { provide: PrismaService, useValue: prisma },
          { provide: EmailService, useValue: { isConfigured: false, send: emailSend } },
        ],
      }).compile();

      const svcNoEmail = moduleNoEmail.get<NotificacionesService>(NotificacionesService);
      prisma.notificacion.create.mockResolvedValue(mockNotificacion);

      await svcNoEmail.create({
        tenantId: TENANT_ID, userId: USER_ID, tipo: 'SISTEMA', titulo: 'T', mensaje: 'M',
      });

      await new Promise((r) => setImmediate(r));

      expect(emailSend).not.toHaveBeenCalled();
    });
  });

  // ─── MARK READ ─────────────────────────────────────────────

  describe('marcarLeida / marcarTodasLeidas', () => {
    it('marcarLeida actualiza una notificación', async () => {
      prisma.notificacion.updateMany.mockResolvedValue({ count: 1 });
      await service.marcarLeida('notif-001', USER_ID);
      expect(prisma.notificacion.updateMany).toHaveBeenCalled();
    });

    it('marcarTodasLeidas devuelve count actualizado', async () => {
      prisma.notificacion.updateMany.mockResolvedValue({ count: 5 });
      const result = await service.marcarTodasLeidas(USER_ID, TENANT_ID);
      expect(result.updated).toBe(5);
    });
  });
});
