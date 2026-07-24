import { PropiedadesScheduler } from '../propiedades.scheduler';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('PropiedadesScheduler', () => {
  let scheduler: PropiedadesScheduler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notificaciones: { create: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    prisma.propiedad.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    notificaciones = { create: jest.fn().mockResolvedValue({}) };
    scheduler = new PropiedadesScheduler(prisma as any, notificaciones as any);

    prisma.notificacion.findMany.mockResolvedValue([]);
  });

  function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 86_400_000);
  }

  // ─── autoPublicarBorradores ─────────────────────────────────

  describe('autoPublicarBorradores', () => {
    it('no debe hacer nada si no hay borradores vencidos', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);

      await scheduler.autoPublicarBorradores();

      expect(prisma.propiedad.updateMany).not.toHaveBeenCalled();
      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe pasar los borradores vencidos a DISPONIBLE y notificar al agente', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p1',
          titulo: 'Casa X',
          codigo: 'CASA-0001',
          tenant_id: 't1',
          agente_id: 'agente-1',
        },
      ]);

      await scheduler.autoPublicarBorradores();

      expect(prisma.propiedad.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['p1'] } },
        data: { estado: 'DISPONIBLE' },
      });
      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'agente-1',
          tipo: 'SISTEMA',
          entidad: 'propiedad',
          entidadId: 'p1',
          mensaje: expect.stringContaining('CASA-0001'),
        }),
      );
    });

    it('debe actualizar el estado aunque la propiedad no tenga agente, pero sin notificar', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p2',
          titulo: 'Terreno Y',
          codigo: 'TERR-0002',
          tenant_id: 't1',
          agente_id: null,
        },
      ]);

      await scheduler.autoPublicarBorradores();

      expect(prisma.propiedad.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['p2'] } },
        data: { estado: 'DISPONIBLE' },
      });
      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe notificar a cada agente cuando hay varios borradores vencidos', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p3',
          titulo: 'A',
          codigo: 'A-1',
          tenant_id: 't1',
          agente_id: 'agente-1',
        },
        {
          id: 'p4',
          titulo: 'B',
          codigo: 'B-1',
          tenant_id: 't1',
          agente_id: 'agente-2',
        },
      ]);

      await scheduler.autoPublicarBorradores();

      expect(notificaciones.create).toHaveBeenCalledTimes(2);
    });
  });

  // ─── checkPropiedadesEstancadas ─────────────────────────────

  describe('checkPropiedadesEstancadas', () => {
    it('no debe hacer nada si no hay propiedades disponibles/reservadas', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('no debe notificar si la inactividad está por debajo del umbral mínimo (30 días)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p1',
          titulo: 'Casa X',
          codigo: 'CASA-0001',
          tenant_id: 't1',
          agente_id: 'agente-1',
          updated_at: daysAgo(10),
          interesados: [],
        },
      ]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe notificar con la sugerencia de 30 días cuando la inactividad está entre 30 y 44 días', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p2',
          titulo: 'Casa X',
          codigo: 'CASA-0002',
          tenant_id: 't1',
          agente_id: 'agente-1',
          updated_at: daysAgo(32),
          interesados: [],
        },
      ]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining('mejorar las fotografías'),
        }),
      );
    });

    it('debe escalar a la sugerencia de 45 días cuando la inactividad está entre 45 y 59 días', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p3',
          titulo: 'Casa X',
          codigo: 'CASA-0003',
          tenant_id: 't1',
          agente_id: 'agente-1',
          updated_at: daysAgo(50),
          interesados: [],
        },
      ]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining('recorrido virtual'),
        }),
      );
    });

    it('debe escalar a la sugerencia de 60 días cuando la inactividad alcanza o supera los 60 días', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p4',
          titulo: 'Casa X',
          codigo: 'CASA-0004',
          tenant_id: 't1',
          agente_id: 'agente-1',
          updated_at: daysAgo(65),
          interesados: [],
        },
      ]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mensaje: expect.stringContaining('pausar la publicación'),
        }),
      );
    });

    it('debe considerar la actividad de los interesados (interacciones/visitas), no solo updated_at de la propiedad', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p5',
          titulo: 'Casa X',
          codigo: 'CASA-0005',
          tenant_id: 't1',
          agente_id: 'agente-1',
          updated_at: daysAgo(90), // la propiedad en sí está vieja...
          interesados: [
            {
              updated_at: daysAgo(90),
              // ...pero hubo interacción y visita recientes
              interacciones: [{ fecha: daysAgo(1) }],
              visitas: [{ fecha_inicio: daysAgo(2) }],
            },
          ],
        },
      ]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('no debe notificar si ya se notificó esta propiedad en los últimos 7 días (dedup)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p6',
          titulo: 'Casa X',
          codigo: 'CASA-0006',
          tenant_id: 't1',
          agente_id: 'agente-1',
          updated_at: daysAgo(40),
          interesados: [],
        },
      ]);
      prisma.notificacion.findMany.mockResolvedValue([{ entidad_id: 'p6' }]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('no debe notificar si la propiedad no tiene agente asignado', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p7',
          titulo: 'Casa X',
          codigo: 'CASA-0007',
          tenant_id: 't1',
          agente_id: null,
          updated_at: daysAgo(40),
          interesados: [],
        },
      ]);

      await scheduler.checkPropiedadesEstancadas();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });
  });
});
