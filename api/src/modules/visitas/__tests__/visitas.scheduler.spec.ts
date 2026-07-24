import { VisitasScheduler } from '../visitas.scheduler';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('VisitasScheduler', () => {
  let scheduler: VisitasScheduler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notificaciones: { create: jest.Mock };
  let email: { sendClientEmail: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    notificaciones = { create: jest.fn().mockResolvedValue({}) };
    email = { sendClientEmail: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue('http://localhost:5173') };
    scheduler = new VisitasScheduler(
      prisma as any,
      notificaciones as any,
      email as any,
      config as any,
    );

    prisma.notificacion.findFirst.mockResolvedValue(null);
  });

  it('debe usar http://localhost:5173 como FRONTEND_URL por defecto si no está configurada', () => {
    const bareConfig = { get: jest.fn().mockReturnValue(undefined) };
    const bareScheduler = new VisitasScheduler(
      prisma as any,
      notificaciones as any,
      email as any,
      bareConfig as any,
    );
    expect((bareScheduler as any).frontendUrl).toBe('http://localhost:5173');
  });

  const propiedad = {
    id: 'prop-1',
    titulo: 'Casa X',
    codigo: 'CASA-0001',
    tenant_id: 't1',
  };

  // ─── checkVisitasPostReporte ────────────────────────────────

  describe('checkVisitasPostReporte', () => {
    it('no debe notificar si no hay visitas finalizadas sin reporte', async () => {
      prisma.visita.findMany.mockResolvedValue([]);

      await scheduler.checkVisitasPostReporte();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe notificar al agente cuando una visita finalizó sin reporte', async () => {
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v1',
          interes: {
            cliente: { nombre: 'Juan Pérez' },
            propiedad,
          },
          agente: { id: 'agente-1' },
        },
      ]);

      await scheduler.checkVisitasPostReporte();

      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't1',
          userId: 'agente-1',
          tipo: 'SISTEMA',
          entidad: 'visita',
          entidadId: 'v1',
          mensaje: expect.stringContaining('Juan Pérez'),
        }),
      );
    });

    it('no debe notificar de nuevo si ya se notificó esta visita recientemente', async () => {
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v2',
          interes: {
            cliente: { nombre: 'Ana' },
            propiedad,
          },
          agente: { id: 'agente-1' },
        },
      ]);
      prisma.notificacion.findFirst.mockResolvedValue({ id: 'existing' });

      await scheduler.checkVisitasPostReporte();

      expect(notificaciones.create).not.toHaveBeenCalled();
    });

    it('debe notificar cada visita pendiente de reporte por separado', async () => {
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v3',
          interes: { cliente: { nombre: 'A' }, propiedad },
          agente: { id: 'agente-1' },
        },
        {
          id: 'v4',
          interes: { cliente: { nombre: 'B' }, propiedad },
          agente: { id: 'agente-2' },
        },
      ]);

      await scheduler.checkVisitasPostReporte();

      expect(notificaciones.create).toHaveBeenCalledTimes(2);
    });
  });

  // ─── checkRecordatorios24h ───────────────────────────────────

  describe('checkRecordatorios24h', () => {
    it('no debe enviar correos si no hay visitas mañana', async () => {
      prisma.visita.findMany.mockResolvedValue([]);

      await scheduler.checkRecordatorios24h();

      expect(email.sendClientEmail).not.toHaveBeenCalled();
    });

    it('debe enviar el recordatorio al cliente con el link de reprogramación', async () => {
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v10',
          fecha_inicio: new Date(),
          reschedule_token: 'tok-123',
          interes: {
            cliente: { nombre: 'Carlos', email: 'carlos@test.com' },
            propiedad,
          },
          agente: { nombre: 'Agente Uno' },
        },
      ]);

      await scheduler.checkRecordatorios24h();

      expect(email.sendClientEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'carlos@test.com',
          tenantId: 't1',
          cta: expect.objectContaining({
            url: 'http://localhost:5173/portal/reprogramar/tok-123',
          }),
        }),
      );
    });

    it('no debe enviar correo si el cliente no tiene email registrado', async () => {
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v11',
          fecha_inicio: new Date(),
          reschedule_token: 'tok-456',
          interes: {
            cliente: { nombre: 'Sin Email', email: null },
            propiedad,
          },
          agente: { nombre: 'Agente Uno' },
        },
      ]);

      await scheduler.checkRecordatorios24h();

      expect(email.sendClientEmail).not.toHaveBeenCalled();
    });

    it('debe enviar un recordatorio por cada visita del día siguiente', async () => {
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v12',
          fecha_inicio: new Date(),
          reschedule_token: 't1',
          interes: {
            cliente: { nombre: 'A', email: 'a@test.com' },
            propiedad,
          },
          agente: { nombre: 'Agente' },
        },
        {
          id: 'v13',
          fecha_inicio: new Date(),
          reschedule_token: 't2',
          interes: {
            cliente: { nombre: 'B', email: 'b@test.com' },
            propiedad,
          },
          agente: { nombre: 'Agente' },
        },
      ]);

      await scheduler.checkRecordatorios24h();

      expect(email.sendClientEmail).toHaveBeenCalledTimes(2);
    });

    it('no debe lanzar si el envío de correo falla', async () => {
      email.sendClientEmail.mockRejectedValue(new Error('Resend down'));
      prisma.visita.findMany.mockResolvedValue([
        {
          id: 'v14',
          fecha_inicio: new Date(),
          reschedule_token: 'tok-789',
          interes: {
            cliente: { nombre: 'Carlos', email: 'carlos@test.com' },
            propiedad,
          },
          agente: { nombre: 'Agente Uno' },
        },
      ]);

      await expect(scheduler.checkRecordatorios24h()).resolves.not.toThrow();
      // Deja que se resuelva/rechace la promesa fire-and-forget del email
      await new Promise((resolve) => setImmediate(resolve));
    });
  });
});
