import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from '../tenants.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    deleteByPattern: jest.fn(),
  };
  const mockTenant = {
    id: 'tenant-1',
    nombre: 'Test',
    plan: 'PRO',
    estado: 'ACTIVA',
    created_at: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();
    service = module.get<TenantsService>(TenantsService);
  });

  it('debe crear tenant con admin', async () => {
    prisma.catalogoPlan.findUnique.mockResolvedValue({
      limite_usuarios: 1,
      limite_propiedades: 5,
    });
    prisma.tenant.create.mockResolvedValue(mockTenant);
    prisma.configSeguridad.create.mockResolvedValue({});
    prisma.user.create.mockResolvedValue({ id: 'a1', email: 'a@b.com' });
    const r = await service.create({
      nombre: 'X',
      adminEmail: 'a@b.com',
      adminNombre: 'A',
    });
    expect(r).toHaveProperty('tenant');
    expect(r).toHaveProperty('admin');
  });

  it('debe lanzar NotFoundException en findOne si no existe', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });

  it('debe actualizar tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    prisma.tenant.update.mockResolvedValue({
      ...mockTenant,
      nombre: 'Updated',
    });
    const r = await service.update('tenant-1', { nombre: 'Updated' });
    expect(r.nombre).toBe('Updated');
  });

  describe('cancelTenant', () => {
    it('debe cancelar el tenant, matar sesiones activas e invalidar el cache de Redis', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        estado: 'CANCELADA',
      });

      const result = await service.cancelTenant('tenant-1');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'tenant:status:tenant-1',
        'CANCELADA',
        60,
      );
      expect(result.estado).toBe('CANCELADA');
    });

    it('debe lanzar NotFoundException si el tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.cancelTenant('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('updateConfigSeguridad', () => {
    it('debe hacer upsert con los valores por defecto en create', async () => {
      prisma.configSeguridad.upsert.mockResolvedValue({
        tenant_id: 'tenant-1',
        dias_inactividad_lead: 21,
      });

      await service.updateConfigSeguridad('tenant-1', {});

      expect(prisma.configSeguridad.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: 'tenant-1' },
          create: expect.objectContaining({
            tenant_id: 'tenant-1',
            dias_inactividad_lead: 21,
            buffer_entre_citas_min: 30,
          }),
        }),
      );
    });

    it('debe actualizar solo los campos provistos en update', async () => {
      prisma.configSeguridad.upsert.mockResolvedValue({});

      await service.updateConfigSeguridad('tenant-1', {
        dias_inactividad_lead: 10,
      });

      expect(prisma.configSeguridad.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { dias_inactividad_lead: 10 },
        }),
      );
    });
  });

  describe('hardDeleteTenant', () => {
    it('debe ejecutar la transacción completa y borrar el tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      const txMock = {
        ...prisma,
        tenant: { ...prisma.tenant, delete: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await service.hardDeleteTenant('tenant-1');

      expect(txMock.tenant.delete).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        timeout: 30000,
      });
    });

    it('debe lanzar NotFoundException si el tenant no existe y no debe iniciar la transacción', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.hardDeleteTenant('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
