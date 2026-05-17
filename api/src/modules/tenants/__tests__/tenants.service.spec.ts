import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from '../tenants.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockRedis = { get: jest.fn(), set: jest.fn(), deleteByPattern: jest.fn() };
  const mockTenant = { id: 'tenant-1', nombre: 'Test', plan: 'PRO', estado: 'ACTIVA', created_at: new Date() };

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
    prisma.catalogoPlan.findUnique.mockResolvedValue({ limite_usuarios: 1, limite_propiedades: 5 });
    prisma.tenant.create.mockResolvedValue(mockTenant);
    prisma.configSeguridad.create.mockResolvedValue({});
    prisma.user.create.mockResolvedValue({ id: 'a1', email: 'a@b.com' });
    const r = await service.create({ nombre: 'X', adminEmail: 'a@b.com', adminNombre: 'A' });
    expect(r).toHaveProperty('tenant');
    expect(r).toHaveProperty('admin');
  });

  it('debe lanzar NotFoundException en findOne si no existe', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });

  it('debe actualizar tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue(mockTenant);
    prisma.tenant.update.mockResolvedValue({ ...mockTenant, nombre: 'Updated' });
    const r = await service.update('tenant-1', { nombre: 'Updated' });
    expect(r.nombre).toBe('Updated');
  });
});
