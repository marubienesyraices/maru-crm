import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TareasService } from '../tareas.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('TareasService', () => {
  let service: TareasService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).tarea = {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new TareasService(prisma as any);
  });

  describe('findAll', () => {
    it('debe listar las tareas del usuario en el tenant', async () => {
      (prisma as any).tarea.findMany.mockResolvedValue([{ id: 't1' }]);
      const result = await service.findAll('t1', 'u1');
      expect(result).toHaveLength(1);
      expect((prisma as any).tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenant_id: 't1', user_id: 'u1' } }),
      );
    });
  });

  describe('create', () => {
    it('debe crear la tarea con fecha límite convertida a Date', async () => {
      (prisma as any).tarea.create.mockResolvedValue({});
      await service.create('t1', 'u1', {
        titulo: 'Llamar cliente',
        fechaLimite: '2026-08-01',
      });
      const data = (prisma as any).tarea.create.mock.calls[0][0].data;
      expect(data.fecha_limite).toBeInstanceOf(Date);
    });

    it('debe crear la tarea sin fecha límite si no se especifica', async () => {
      (prisma as any).tarea.create.mockResolvedValue({});
      await service.create('t1', 'u1', { titulo: 'x' });
      const data = (prisma as any).tarea.create.mock.calls[0][0].data;
      expect(data.fecha_limite).toBeUndefined();
    });
  });

  describe('update', () => {
    it('debe lanzar NotFoundException si la tarea no existe', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue(null);
      await expect(service.update('t1', 'u1', 'x', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ForbiddenException si la tarea pertenece a otro usuario', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'otro-usuario',
        estado: 'PENDIENTE',
      });
      await expect(
        service.update('t1', 'u1', 'tarea-1', { titulo: 'x' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe fijar completed_at al pasar de PENDIENTE a COMPLETADA', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'u1',
        estado: 'PENDIENTE',
      });
      (prisma as any).tarea.update.mockResolvedValue({});

      await service.update('t1', 'u1', 'tarea-1', {
        estado: 'COMPLETADA',
      } as any);

      const data = (prisma as any).tarea.update.mock.calls[0][0].data;
      expect(data.completed_at).toBeInstanceOf(Date);
    });

    it('debe limpiar completed_at al reabrir una tarea COMPLETADA', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'u1',
        estado: 'COMPLETADA',
      });
      (prisma as any).tarea.update.mockResolvedValue({});

      await service.update('t1', 'u1', 'tarea-1', {
        estado: 'PENDIENTE',
      } as any);

      const data = (prisma as any).tarea.update.mock.calls[0][0].data;
      expect(data.completed_at).toBeNull();
    });

    it('NO debe tocar completed_at si el update no incluye "estado" (ej. solo cambiar el título)', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'u1',
        estado: 'COMPLETADA',
      });
      (prisma as any).tarea.update.mockResolvedValue({});

      await service.update('t1', 'u1', 'tarea-1', {
        titulo: 'Nuevo título',
      });

      const data = (prisma as any).tarea.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('completed_at');
    });

    it('no debe reescribir completed_at si la tarea ya estaba COMPLETADA y sigue COMPLETADA', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'u1',
        estado: 'COMPLETADA',
      });
      (prisma as any).tarea.update.mockResolvedValue({});

      await service.update('t1', 'u1', 'tarea-1', {
        estado: 'COMPLETADA',
        titulo: 'x',
      } as any);

      const data = (prisma as any).tarea.update.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('completed_at');
    });
  });

  describe('remove', () => {
    it('debe lanzar NotFoundException si la tarea no existe', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue(null);
      await expect(service.remove('t1', 'u1', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ForbiddenException si la tarea pertenece a otro usuario', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'otro',
      });
      await expect(service.remove('t1', 'u1', 'tarea-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe eliminar la tarea propia', async () => {
      (prisma as any).tarea.findFirst.mockResolvedValue({
        id: 'tarea-1',
        user_id: 'u1',
      });
      (prisma as any).tarea.delete.mockResolvedValue({});

      const result = await service.remove('t1', 'u1', 'tarea-1');

      expect(result).toEqual({ deleted: true });
    });
  });
});
