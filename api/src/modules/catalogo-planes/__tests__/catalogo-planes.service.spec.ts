import { NotFoundException } from '@nestjs/common';
import { CatalogoPlanesService } from '../catalogo-planes.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('CatalogoPlanesService', () => {
  let service: CatalogoPlanesService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).catalogoPlan.update = jest.fn();
    service = new CatalogoPlanesService(prisma as any);
  });

  describe('findAll', () => {
    it('debe listar los planes ordenados alfabéticamente', async () => {
      prisma.catalogoPlan.findMany.mockResolvedValue([
        { plan: 'BASIC' },
        { plan: 'FREE' },
      ]);
      const result = await service.findAll();
      expect(prisma.catalogoPlan.findMany).toHaveBeenCalledWith({
        orderBy: { plan: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException si el plan no existe en el catálogo', async () => {
      prisma.catalogoPlan.findUnique.mockResolvedValue(null);
      await expect(service.findOne('INEXISTENTE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe retornar la configuración del plan', async () => {
      prisma.catalogoPlan.findUnique.mockResolvedValue({
        plan: 'PRO',
        tiene_portal: true,
      });
      const result = await service.findOne('PRO');
      expect(result.tiene_portal).toBe(true);
    });
  });

  describe('update', () => {
    it('debe lanzar NotFoundException si se intenta actualizar un plan inexistente', async () => {
      prisma.catalogoPlan.findUnique.mockResolvedValue(null);
      await expect(
        service.update('INEXISTENTE', { tiene_portal: true } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe actualizar el plan existente', async () => {
      prisma.catalogoPlan.findUnique.mockResolvedValue({ plan: 'PRO' });
      (prisma as any).catalogoPlan.update.mockResolvedValue({
        plan: 'PRO',
        tiene_portal: true,
      });

      const result = await service.update('PRO', { tiene_portal: true });

      expect(result.tiene_portal).toBe(true);
      expect((prisma as any).catalogoPlan.update).toHaveBeenCalledWith({
        where: { plan: 'PRO' },
        data: { tiene_portal: true },
      });
    });
  });
});
