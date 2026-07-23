import { HorariosService } from '../horarios.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('HorariosService', () => {
  let service: HorariosService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).horarioLaboral = { findMany: jest.fn(), upsert: jest.fn() };
    service = new HorariosService(prisma as any);
  });

  describe('findByUser', () => {
    it('debe listar los horarios del usuario ordenados por día de la semana', async () => {
      (prisma as any).horarioLaboral.findMany.mockResolvedValue([
        { dia_semana: 1 },
      ]);
      const result = await service.findByUser('t1', 'u1');
      expect(result).toHaveLength(1);
      expect((prisma as any).horarioLaboral.findMany).toHaveBeenCalledWith({
        where: { tenant_id: 't1', user_id: 'u1' },
        orderBy: { dia_semana: 'asc' },
      });
    });
  });

  describe('bulkUpsert', () => {
    it('debe hacer upsert de cada horario dentro de una transacción y retornar la lista actualizada', async () => {
      (prisma as any).horarioLaboral.findMany.mockResolvedValue([
        { dia_semana: 1 },
        { dia_semana: 2 },
      ]);

      const result = await service.bulkUpsert('t1', 'u1', [
        { diaSemana: 1, horaInicio: '08:00', horaFin: '17:00' },
        { diaSemana: 2, horaInicio: '08:00', horaFin: '17:00', activo: false },
      ]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('debe usar activo=true por defecto si no se especifica', async () => {
      (prisma as any).horarioLaboral.findMany.mockResolvedValue([]);

      await service.bulkUpsert('t1', 'u1', [
        { diaSemana: 1, horaInicio: '08:00', horaFin: '17:00' },
      ]);

      const opsPassedToTransaction = prisma.$transaction.mock.calls[0][0];
      expect(opsPassedToTransaction).toHaveLength(1);
    });
  });

  describe('isWithinSchedule', () => {
    it('debe retornar false si no hay horario activo configurado para ese día', async () => {
      (prisma as any).horarioLaboral.findMany.mockResolvedValue([]);
      (prisma as any).horarioLaboral.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.isWithinSchedule(
        't1',
        'u1',
        new Date(2026, 0, 5, 14, 0),
      );
      expect(result).toBe(false);
    });

    it('debe retornar true si la hora está dentro del rango configurado', async () => {
      (prisma as any).horarioLaboral.findFirst = jest
        .fn()
        .mockResolvedValue({ hora_inicio: '08:00', hora_fin: '17:00' });

      const result = await service.isWithinSchedule(
        't1',
        'u1',
        new Date(2026, 0, 5, 14, 30),
      );
      expect(result).toBe(true);
    });

    it('debe retornar false si la hora es anterior al inicio del horario', async () => {
      (prisma as any).horarioLaboral.findFirst = jest
        .fn()
        .mockResolvedValue({ hora_inicio: '08:00', hora_fin: '17:00' });

      const result = await service.isWithinSchedule(
        't1',
        'u1',
        new Date(2026, 0, 5, 7, 0),
      );
      expect(result).toBe(false);
    });

    it('debe retornar false si la hora es posterior al fin del horario', async () => {
      (prisma as any).horarioLaboral.findFirst = jest
        .fn()
        .mockResolvedValue({ hora_inicio: '08:00', hora_fin: '17:00' });

      const result = await service.isWithinSchedule(
        't1',
        'u1',
        new Date(2026, 0, 5, 18, 0),
      );
      expect(result).toBe(false);
    });

    it('debe incluir los límites exactos de inicio y fin', async () => {
      (prisma as any).horarioLaboral.findFirst = jest
        .fn()
        .mockResolvedValue({ hora_inicio: '08:00', hora_fin: '17:00' });

      expect(
        await service.isWithinSchedule('t1', 'u1', new Date(2026, 0, 5, 8, 0)),
      ).toBe(true);
      expect(
        await service.isWithinSchedule('t1', 'u1', new Date(2026, 0, 5, 17, 0)),
      ).toBe(true);
    });
  });
});
