import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('debe crear un registro de auditoría', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
      const r = await service.log({
        tenantId: 't1',
        userId: 'u1',
        nombreUsuario: 'Test',
        accion: 'LOGIN',
        modulo: 'Auth',
        entidad: 'User',
        ipAddress: '127.0.0.1',
      });
      expect(r).toHaveProperty('id');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accion: 'LOGIN' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('debe retornar logs paginados', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      prisma.auditLog.count.mockResolvedValue(2);
      const r = await service.findAll('t1', { page: 1, limit: 10 });
      expect(r.data).toHaveLength(2);
      expect(r.meta.total).toBe(2);
    });

    it('debe filtrar por módulo y acción', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);
      await service.findAll('t1', { modulo: 'Auth', accion: 'LOGIN' });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.modulo).toBe('Auth');
      expect(call.where.accion).toBe('LOGIN');
    });

    it('debe filtrar por rango de fechas', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);
      await service.findAll('t1', {
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-12-31',
      });
      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.created_at).toHaveProperty('gte');
      expect(call.where.created_at).toHaveProperty('lte');
    });
  });
});
