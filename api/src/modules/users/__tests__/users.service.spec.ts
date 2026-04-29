import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const mockTenant = {
    id: 'tenant-1',
    nombre: 'Test Corp',
    limite_usuarios: 5,
  };

  const mockUser = {
    id: 'user-1',
    tenant_id: 'tenant-1',
    email: 'carlos@test.com',
    nombre: 'Carlos',
    rol: 'SENIOR',
    estado: 'ACTIVO',
    id_supervisor: null,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── CREATE USER ──────────────────────────────────────────

  describe('create', () => {
    it('debe crear un usuario correctamente', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.count.mockResolvedValue(2);
      prisma.user.create.mockResolvedValue({ ...mockUser, id: 'new-user' });

      const result = await service.create('tenant-1', {
        email: 'nuevo@test.com',
        nombre: 'Nuevo User',
        rol: 'SENIOR',
      });

      expect(result).toHaveProperty('id');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('debe rechazar si se excede el límite de usuarios', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, limite_usuarios: 2 });
      prisma.user.count.mockResolvedValue(2);

      await expect(
        service.create('tenant-1', {
          email: 'extra@test.com',
          nombre: 'Extra',
          rol: 'JUNIOR',
          idSupervisor: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create('no-exist', {
          email: 'x@test.com',
          nombre: 'X',
          rol: 'JUNIOR',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar JUNIOR sin supervisor', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.count.mockResolvedValue(1);

      await expect(
        service.create('tenant-1', {
          email: 'jr@test.com',
          nombre: 'Junior',
          rol: 'JUNIOR',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si supervisor es JUNIOR', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        rol: 'JUNIOR',
      });

      await expect(
        service.create('tenant-1', {
          email: 'jr2@test.com',
          nombre: 'Junior 2',
          rol: 'JUNIOR',
          idSupervisor: 'junior-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FIND ALL ─────────────────────────────────────────────

  describe('findAll', () => {
    it('debe retornar usuarios del tenant', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2', nombre: 'Ana' }];
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll('tenant-1');

      expect(result).toHaveLength(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: 'tenant-1' },
        }),
      );
    });
  });

  // ─── FIND ONE ─────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar usuario con supervisor y subordinados', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        supervisor: null,
        subordinados: [],
      });

      const result = await service.findOne('tenant-1', 'user-1');

      expect(result.id).toBe('user-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('tenant-1', 'no-exist')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── HIERARCHY ────────────────────────────────────────────

  describe('getHierarchyTree', () => {
    it('debe construir árbol jerárquico correcto', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'senior', nombre: 'Carlos', email: 'c@t.com', rol: 'SENIOR', id_supervisor: null },
        { id: 'jr1', nombre: 'Ana', email: 'a@t.com', rol: 'JUNIOR', id_supervisor: 'senior' },
        { id: 'jr2', nombre: 'Pedro', email: 'p@t.com', rol: 'JUNIOR', id_supervisor: 'senior' },
        { id: 'admin', nombre: 'María', email: 'm@t.com', rol: 'ADMIN', id_supervisor: null },
      ]);

      const tree = await service.getHierarchyTree('tenant-1');

      // 2 nodos raíz: Carlos (Senior) y María (Admin)
      expect(tree).toHaveLength(2);

      const carlos = tree.find((n: any) => n.id === 'senior');
      expect(carlos).toBeDefined();
      expect(carlos!.subordinados).toHaveLength(2);

      const maria = tree.find((n: any) => n.id === 'admin');
      expect(maria).toBeDefined();
      expect(maria!.subordinados).toHaveLength(0);
    });
  });

  // ─── UPDATE: CIRCULAR REFERENCE ───────────────────────────

  describe('update - prevención de referencias circulares', () => {
    it('debe rechazar si nuevo supervisor crearía ciclo', async () => {
      // user-1 is the parent, user-2 is the child
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, id: 'user-1' });
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'user-2', nombre: 'Child', nivel: 0 },
      ]);

      await expect(
        service.update('tenant-1', 'user-1', { idSupervisor: 'user-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si se intenta asignar a sí mismo como supervisor', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(
        service.update('tenant-1', 'user-1', { idSupervisor: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
