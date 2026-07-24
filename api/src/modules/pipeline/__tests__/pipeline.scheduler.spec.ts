import { PipelineScheduler } from '../pipeline.scheduler';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('PipelineScheduler', () => {
  let scheduler: PipelineScheduler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notificaciones: { create: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    notificaciones = { create: jest.fn().mockResolvedValue({}) };
    scheduler = new PipelineScheduler(prisma as any, notificaciones as any);

    prisma.configSeguridad.findMany = jest.fn().mockResolvedValue([]);
    prisma.notificacion.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
  });

  function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 86_400_000);
  }

  // ─── checkLeadInactivity ────────────────────────────────────

  describe('checkLeadInactivity', () => {
    it('no debe hacer nada si no hay trámites activos', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([]);

      await scheduler.checkLeadInactivity();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe notificar al agente cuando el trámite supera el umbral por defecto (21 días)', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-1',
          estado: 'CONTACTADO',
          updated_at: daysAgo(25),
          cliente: {
            id: 'cli-1',
            nombre: 'Juan Pérez',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          interacciones: [],
          visitas: [],
        },
      ]);

      await scheduler.checkLeadInactivity();

      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'agente-1',
          tipo: 'LEAD_INACTIVO',
          entidad: 'clientePropiedad',
          entidadId: 'cp-1',
          mensaje: expect.stringContaining('Juan Pérez'),
        }),
      );
    });

    it('no debe notificar si la última actividad está dentro del umbral', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-2',
          estado: 'NUEVO',
          updated_at: daysAgo(5),
          cliente: {
            id: 'cli-2',
            nombre: 'Ana',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          interacciones: [],
          visitas: [],
        },
      ]);

      await scheduler.checkLeadInactivity();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe respetar el umbral configurado por tenant en vez del default de 21 días', async () => {
      prisma.configSeguridad.findMany = jest
        .fn()
        .mockResolvedValue([{ tenant_id: 't1', dias_inactividad_lead: 10 }]);
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-3',
          estado: 'INTERESADO',
          updated_at: daysAgo(12),
          cliente: {
            id: 'cli-3',
            nombre: 'Luis',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          interacciones: [],
          visitas: [],
        },
      ]);

      await scheduler.checkLeadInactivity();

      // 12 días > umbral de 10 configurado para t1 (aunque esté bajo el default de 21)
      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({ entidadId: 'cp-3' }),
      );
    });

    it('debe usar la interacción o visita más reciente como última actividad, no solo updated_at', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-4',
          estado: 'NUEVO',
          updated_at: daysAgo(40), // muy vieja
          cliente: {
            id: 'cli-4',
            nombre: 'Marta',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          interacciones: [{ fecha: daysAgo(2) }], // pero hubo actividad reciente
          visitas: [],
        },
      ]);

      await scheduler.checkLeadInactivity();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('no debe notificar si ya se notificó este trámite en los últimos 7 días (dedup)', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-5',
          estado: 'NUEVO',
          updated_at: daysAgo(25),
          cliente: {
            id: 'cli-5',
            nombre: 'Pedro',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          interacciones: [],
          visitas: [],
        },
      ]);
      prisma.notificacion.findMany.mockResolvedValue([{ entidad_id: 'cp-5' }]);

      await scheduler.checkLeadInactivity();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('no debe notificar si el trámite no tiene agente asignado', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-6',
          estado: 'NUEVO',
          updated_at: daysAgo(25),
          cliente: {
            id: 'cli-6',
            nombre: 'Sin Agente',
            agente_id: null,
            tenant_id: 't1',
          },
          interacciones: [],
          visitas: [],
        },
      ]);

      await scheduler.checkLeadInactivity();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });
  });

  // ─── checkNegociacionTimeout ────────────────────────────────

  describe('checkNegociacionTimeout', () => {
    it('no debe hacer nada si no hay trámites estancados en negociación', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([]);

      await scheduler.checkNegociacionTimeout();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe notificar al agente y a los ADMIN del tenant cuando la negociación lleva 30+ días sin cambios', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-10',
          estado: 'EN_NEGOCIACION',
          updated_at: daysAgo(35),
          cliente: {
            id: 'cli-10',
            nombre: 'Carlos',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          propiedad: { id: 'p1', titulo: 'Casa X', codigo: 'CASA-0001' },
        },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', tenant_id: 't1' },
      ]);

      await scheduler.checkNegociacionTimeout();

      const userIds = notificaciones.create.mock.calls.map(
        (c: any[]) => c[0].userId,
      );
      expect(userIds.sort()).toEqual(['admin-1', 'agente-1']);
      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'NEGOCIACION_TIMEOUT',
          entidadId: 'cp-10',
          mensaje: expect.stringContaining('CASA-0001'),
        }),
      );
    });

    it('no debe duplicar la notificación si el agente también es admin del tenant', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-11',
          estado: 'CIERRE',
          updated_at: daysAgo(31),
          cliente: {
            id: 'cli-11',
            nombre: 'Diana',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          propiedad: null,
        },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'agente-1', tenant_id: 't1' }, // mismo id que el agente
      ]);

      await scheduler.checkNegociacionTimeout();

      expect(notificaciones.create).toHaveBeenCalledTimes(1);
    });

    it('no debe notificar si ya se notificó este trámite en los últimos 7 días (dedup)', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-12',
          estado: 'EN_NEGOCIACION',
          updated_at: daysAgo(40),
          cliente: {
            id: 'cli-12',
            nombre: 'Elena',
            agente_id: 'agente-1',
            tenant_id: 't1',
          },
          propiedad: null,
        },
      ]);
      prisma.notificacion.findMany.mockResolvedValue([{ entidad_id: 'cp-12' }]);

      await scheduler.checkNegociacionTimeout();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe resolver administradores por separado para cada tenant', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        {
          id: 'cp-13',
          estado: 'EN_NEGOCIACION',
          updated_at: daysAgo(35),
          cliente: {
            id: 'cli-13',
            nombre: 'Fede',
            agente_id: null,
            tenant_id: 't1',
          },
          propiedad: null,
        },
        {
          id: 'cp-14',
          estado: 'EN_NEGOCIACION',
          updated_at: daysAgo(35),
          cliente: {
            id: 'cli-14',
            nombre: 'Gina',
            agente_id: null,
            tenant_id: 't2',
          },
          propiedad: null,
        },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-t1', tenant_id: 't1' },
        { id: 'admin-t2', tenant_id: 't2' },
      ]);

      await scheduler.checkNegociacionTimeout();

      const calls = notificaciones.create.mock.calls.map((c: any[]) => c[0]);
      expect(calls.find((c) => c.entidadId === 'cp-13')?.userId).toBe(
        'admin-t1',
      );
      expect(calls.find((c) => c.entidadId === 'cp-14')?.userId).toBe(
        'admin-t2',
      );
    });
  });
});
