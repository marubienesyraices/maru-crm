import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientesService } from '../clientes.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

const mockCliente = {
  id: 'cli-001',
  tenant_id: TENANT_ID,
  nombre: 'Carlos López',
  email: 'carlos@example.com',
  telefono: '50255551234',
  dpi: null,
  origen: 'REFERIDO',
  notas: null,
  agente_id: USER_ID,
  agente: { id: USER_ID, nombre: 'Admin' },
  _count: { intereses: 2 },
};

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<ClientesService>(ClientesService);
  });

  describe('create', () => {
    it('debe crear cliente exitosamente', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);
      prisma.cliente.create.mockResolvedValue(mockCliente);

      const result = await service.create(
        TENANT_ID,
        {
          nombre: 'Carlos López',
          email: 'carlos@example.com',
          origen: 'REFERIDO',
        },
        USER_ID,
      );

      expect(result.nombre).toBe('Carlos López');
      expect(prisma.cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenant_id: TENANT_ID,
            agente_id: USER_ID,
          }),
        }),
      );
    });

    it('debe rechazar email duplicado dentro del tenant', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);

      await expect(
        service.create(
          TENANT_ID,
          { nombre: 'Otro', email: 'carlos@example.com' },
          USER_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('debe crear sin email (sin validación de duplicados)', async () => {
      prisma.cliente.create.mockResolvedValue({ ...mockCliente, email: null });

      const result = await service.create(
        TENANT_ID,
        { nombre: 'Sin email' },
        USER_ID,
      );

      expect(result).toBeDefined();
      expect(prisma.cliente.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debe retornar clientes paginados', async () => {
      prisma.cliente.findMany.mockResolvedValue([mockCliente]);
      prisma.cliente.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('debe aplicar búsqueda por nombre', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { busqueda: 'Carlos' });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { nombre: { contains: 'Carlos', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('debe filtrar por origen', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { origen: 'WHATSAPP' });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ origen: 'WHATSAPP' }),
        }),
      );
    });

    it('no debe restringir por agente cuando visibleUserIds es null (ADMIN/SUPER_ADMIN)', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, {}, null);

      const where = prisma.cliente.findMany.mock.calls[0][0].where;
      expect(where.agente_id).toBeUndefined();
    });

    it('debe restringir a los agentes visibles cuando visibleUserIds está definido (JUNIOR/SENIOR)', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, {}, ['agente-1', 'agente-2']);

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agente_id: { in: ['agente-1', 'agente-2'] },
          }),
        }),
      );
    });

    it('no debe permitir que filtros.agenteId amplíe la visibilidad de un JUNIOR/SENIOR a un agente ajeno', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      // "agente-ajeno" no está en la lista de visibles del usuario
      await service.findAll(TENANT_ID, { agenteId: 'agente-ajeno' }, [
        'agente-1',
        'agente-2',
      ]);

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agente_id: { in: [] } }),
        }),
      );
    });

    it('debe permitir que filtros.agenteId acote dentro de los agentes visibles', async () => {
      prisma.cliente.findMany.mockResolvedValue([]);
      prisma.cliente.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { agenteId: 'agente-1' }, [
        'agente-1',
        'agente-2',
      ]);

      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agente_id: { in: ['agente-1'] } }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar cliente con intereses', async () => {
      prisma.cliente.findFirst.mockResolvedValue({
        ...mockCliente,
        intereses: [],
      });

      const result = await service.findOne(TENANT_ID, 'cli-001');

      expect(result.nombre).toBe('Carlos López');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'no')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('debe actualizar cliente existente', async () => {
      prisma.cliente.findFirst
        .mockResolvedValueOnce({ ...mockCliente, intereses: [] })
        .mockResolvedValueOnce(null);
      prisma.cliente.update.mockResolvedValue({
        ...mockCliente,
        telefono: '99999999',
      });

      const result = await service.update(TENANT_ID, 'cli-001', {
        telefono: '99999999',
        email: 'carlos@example.com',
      });

      expect(result.telefono).toBe('99999999');
    });

    it('debe rechazar email duplicado en update', async () => {
      prisma.cliente.findFirst
        .mockResolvedValueOnce({ ...mockCliente, intereses: [] })
        .mockResolvedValueOnce({ id: 'cli-other' });

      await expect(
        service.update(TENANT_ID, 'cli-001', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getStats', () => {
    it('debe retornar estadísticas por origen', async () => {
      prisma.cliente.count.mockResolvedValue(5);
      prisma.cliente.groupBy.mockResolvedValue([
        { origen: 'REFERIDO', _count: 3 },
        { origen: 'WHATSAPP', _count: 2 },
      ]);

      const result = await service.getStats(TENANT_ID);

      expect(result.total).toBe(5);
      expect(result.porOrigen).toHaveLength(2);
    });

    it('debe restringir las estadísticas a los agentes visibles cuando aplica', async () => {
      prisma.cliente.count.mockResolvedValue(0);
      prisma.cliente.groupBy.mockResolvedValue([]);

      await service.getStats(TENANT_ID, ['agente-1']);

      expect(prisma.cliente.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agente_id: { in: ['agente-1'] },
          }),
        }),
      );
      expect(prisma.cliente.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            agente_id: { in: ['agente-1'] },
          }),
        }),
      );
    });
  });
});
