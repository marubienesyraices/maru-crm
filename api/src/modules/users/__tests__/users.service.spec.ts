import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
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
        {
          provide: EmailService,
          useValue: {
            send: jest.fn().mockResolvedValue(undefined),
            sendClientEmail: jest.fn().mockResolvedValue(undefined),
            sendSystemEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') },
        },
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
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        limite_usuarios: 2,
      });
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

      await expect(service.findOne('tenant-1', 'no-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── HIERARCHY ────────────────────────────────────────────

  describe('getHierarchyTree', () => {
    it('debe construir árbol jerárquico correcto', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'senior',
          nombre: 'Carlos',
          email: 'c@t.com',
          rol: 'SENIOR',
          id_supervisor: null,
        },
        {
          id: 'jr1',
          nombre: 'Ana',
          email: 'a@t.com',
          rol: 'JUNIOR',
          id_supervisor: 'senior',
        },
        {
          id: 'jr2',
          nombre: 'Pedro',
          email: 'p@t.com',
          rol: 'JUNIOR',
          id_supervisor: 'senior',
        },
        {
          id: 'admin',
          nombre: 'María',
          email: 'm@t.com',
          rol: 'ADMIN',
          id_supervisor: null,
        },
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
      prisma.$queryRaw.mockResolvedValue([
        { id: 'user-2', nombre: 'Child', nivel: 0 },
      ]);

      await expect(
        service.update('tenant-1', 'user-1', { idSupervisor: 'user-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si se intenta asignar a sí mismo como supervisor', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.update('tenant-1', 'user-1', { idSupervisor: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── P-01: DESBLOQUEO MANUAL ───────────────────────────────

  describe('desbloquear', () => {
    it('debe limpiar intentos_login y bloqueado_hasta', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        intentos_login: 0,
        bloqueado_hasta: null,
      });

      const result = await service.desbloquear('tenant-1', 'user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { intentos_login: 0, bloqueado_hasta: null },
      });
      expect(result.message).toContain('desbloqueada');
    });

    it('debe lanzar NotFoundException si el usuario no existe en el tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.desbloquear('tenant-1', 'no-existe'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ─── P-03: RESET 2FA POR ADMIN ─────────────────────────────

  describe('resetTotp', () => {
    it('debe apagar totp_habilitado y borrar el secret', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        totp_habilitado: true,
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        totp_habilitado: false,
      });

      const result = await service.resetTotp('tenant-1', 'user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totp_secret: null, totp_habilitado: false },
      });
      expect(result.message).toContain('2FA desactivado');
    });

    it('debe lanzar NotFoundException si el usuario no existe en el tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetTotp('tenant-1', 'no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── SUPER_ADMIN: GESTIÓN DE ADMINISTRADORES ───────────────

  describe('findAllAdmins', () => {
    it('debe retornar los admins con su tenant', async () => {
      prisma.user.findMany.mockResolvedValue([
        { ...mockUser, rol: 'ADMIN', tenant: { nombre: 'Test Corp' } },
      ]);

      const result = await service.findAllAdmins();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rol: 'ADMIN' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('createAdmin', () => {
    const dto = {
      tenantId: 'tenant-1',
      email: 'nuevo-admin@test.com',
      nombre: 'Nuevo Admin',
    };

    it('debe crear el admin cuando el tenant no tiene uno todavía', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        id: 'user-admin',
        rol: 'ADMIN',
      });

      const result = await service.createAdmin(dto);

      expect(result.rol).toBe('ADMIN');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('debe rechazar si el tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.createAdmin(dto)).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si el tenant ya tiene un administrador', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findFirst.mockResolvedValue({
        nombre: 'Admin Existente',
        email: 'admin@test.com',
      });

      await expect(service.createAdmin(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('updateAdmin', () => {
    it('debe rechazar si el admin no existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAdmin('no-existe', { nombre: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar mover el admin a un tenant que ya tiene uno', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({
          ...mockUser,
          rol: 'ADMIN',
          tenant_id: 'tenant-1',
        }) // el admin editado
        .mockResolvedValueOnce({
          nombre: 'Otro Admin',
          email: 'otro@test.com',
        }); // ya existe en tenant-2
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        id: 'tenant-2',
      });

      await expect(
        service.updateAdmin('user-admin', { tenantId: 'tenant-2' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('debe actualizar el admin cuando el tenant destino no tiene uno', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({
          ...mockUser,
          rol: 'ADMIN',
          tenant_id: 'tenant-1',
        })
        .mockResolvedValueOnce(null);
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        id: 'tenant-2',
      });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        tenant_id: 'tenant-2',
      });

      const result = await service.updateAdmin('user-admin', {
        tenantId: 'tenant-2',
      });

      expect(result.tenant_id).toBe('tenant-2');
    });
  });
});
