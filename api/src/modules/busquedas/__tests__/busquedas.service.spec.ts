import { NotFoundException } from '@nestjs/common';
import { BusquedasService } from '../busquedas.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('BusquedasService', () => {
  let service: BusquedasService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).busquedaGuardada = {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    };
    service = new BusquedasService(prisma as any);
  });

  describe('list', () => {
    it('debe listar las búsquedas del cliente ordenadas por fecha descendente', async () => {
      (prisma as any).busquedaGuardada.findMany.mockResolvedValue([
        { id: 'b1' },
      ]);
      const result = await service.list('t1', 'cliente-1');
      expect(result).toHaveLength(1);
      expect((prisma as any).busquedaGuardada.findMany).toHaveBeenCalledWith({
        where: { tenant_id: 't1', cliente_id: 'cliente-1' },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('debe crear la búsqueda guardada con los filtros y alertas por defecto activas', async () => {
      (prisma as any).busquedaGuardada.create.mockResolvedValue({ id: 'b1' });

      await service.create('t1', 'cliente-1', 'Casas en zona 10', {
        zona: '10',
        tipo: 'CASA',
      });

      const data = (prisma as any).busquedaGuardada.create.mock.calls[0][0]
        .data;
      expect(data.nombre).toBe('Casas en zona 10');
      expect(data.filtros).toEqual({ zona: '10', tipo: 'CASA' });
      expect(data.alertas).toBe(true);
    });

    it('debe permitir desactivar las alertas', async () => {
      (prisma as any).busquedaGuardada.create.mockResolvedValue({});
      await service.create('t1', 'cliente-1', 'x', {}, false);
      const data = (prisma as any).busquedaGuardada.create.mock.calls[0][0]
        .data;
      expect(data.alertas).toBe(false);
    });
  });

  describe('delete', () => {
    it('debe lanzar NotFoundException si la búsqueda no existe o no pertenece al cliente', async () => {
      (prisma as any).busquedaGuardada.findFirst.mockResolvedValue(null);
      await expect(service.delete('t1', 'cliente-1', 'b1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe eliminar la búsqueda si pertenece al tenant y cliente', async () => {
      (prisma as any).busquedaGuardada.findFirst.mockResolvedValue({
        id: 'b1',
      });
      (prisma as any).busquedaGuardada.delete.mockResolvedValue({});

      const result = await service.delete('t1', 'cliente-1', 'b1');

      expect(result).toEqual({ deleted: true });
      expect((prisma as any).busquedaGuardada.delete).toHaveBeenCalledWith({
        where: { id: 'b1' },
      });
    });
  });
});
