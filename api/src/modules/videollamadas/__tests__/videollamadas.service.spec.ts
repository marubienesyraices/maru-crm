import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VideollamadasService } from '../videollamadas.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('VideollamadasService', () => {
  let service: VideollamadasService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let integraciones: { getCredentials: jest.Mock };
  let fetchMock: jest.Mock;

  const creds = {
    zoom_account_id: 'acc-1',
    zoom_client_id: 'cid',
    zoom_client_secret: 'secret',
  };

  const visita = {
    id: 'visita-1',
    zoom_meeting_id: null,
    fecha_inicio: new Date('2026-08-01T15:00:00Z'),
    fecha_fin: new Date('2026-08-01T16:00:00Z'),
    interes: {
      cliente: { tenant_id: 't1', nombre: 'Juan Cliente' },
      propiedad: { titulo: 'Casa X' },
    },
    agente: { nombre: 'Ana Agente' },
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    integraciones = { getCredentials: jest.fn().mockResolvedValue(creds) };
    service = new VideollamadasService(prisma as any, integraciones as any);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  function mockOAuthOk(token = 'tok-123') {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: token, expires_in: 3600 }),
    });
  }

  function mockCreateMeetingOk(id = 111, joinUrl = 'https://zoom.us/j/111') {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id, join_url: joinUrl }),
    });
  }

  describe('crearMeeting', () => {
    it('debe lanzar BadRequestException si Zoom no está configurado', async () => {
      integraciones.getCredentials.mockResolvedValue({ zoom_account_id: null });
      await expect(service.crearMeeting('t1', 'visita-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar NotFoundException si la visita no existe o pertenece a otro tenant', async () => {
      prisma.visita.findFirst.mockResolvedValue(null);
      await expect(service.crearMeeting('t1', 'visita-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar NotFoundException si la visita pertenece a otro tenant', async () => {
      prisma.visita.findFirst.mockResolvedValue({
        ...visita,
        interes: { ...visita.interes, cliente: { tenant_id: 't2' } },
      });
      await expect(service.crearMeeting('t1', 'visita-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si la visita ya tiene una videollamada asociada', async () => {
      prisma.visita.findFirst.mockResolvedValue({
        ...visita,
        zoom_meeting_id: 'existing-id',
      });
      await expect(service.crearMeeting('t1', 'visita-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe crear la reunión en Zoom y guardar el meeting_id/join_url en la visita', async () => {
      prisma.visita.findFirst.mockResolvedValue(visita);
      mockOAuthOk();
      mockCreateMeetingOk(222, 'https://zoom.us/j/222');
      prisma.visita.update.mockResolvedValue({
        id: 'visita-1',
        zoom_meeting_id: '222',
        zoom_join_url: 'https://zoom.us/j/222',
      });

      const result = await service.crearMeeting('t1', 'visita-1');

      expect(result.zoom_meeting_id).toBe('222');
      const [, opts] = fetchMock.mock.calls[1];
      const body = JSON.parse(opts.body);
      expect(body.topic).toBe('Visita — Casa X');
      expect(body.duration).toBe(60); // 1 hora exacta
      expect(body.agenda).toContain('Juan Cliente');
      expect(body.agenda).toContain('Ana Agente');
    });

    it('debe usar una duración mínima de 30 minutos para visitas más cortas', async () => {
      prisma.visita.findFirst.mockResolvedValue({
        ...visita,
        fecha_inicio: new Date('2026-08-01T15:00:00Z'),
        fecha_fin: new Date('2026-08-01T15:15:00Z'), // 15 min
      });
      mockOAuthOk();
      mockCreateMeetingOk();
      prisma.visita.update.mockResolvedValue({});

      await service.crearMeeting('t1', 'visita-1');

      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.duration).toBe(30);
    });

    it('debe lanzar BadRequestException si Zoom rechaza la creación de la reunión', async () => {
      prisma.visita.findFirst.mockResolvedValue(visita);
      mockOAuthOk();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Plan sin soporte de video' }),
      });

      await expect(service.crearMeeting('t1', 'visita-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe reutilizar el token de acceso en caché para el mismo tenant', async () => {
      prisma.visita.findFirst.mockResolvedValue(visita);
      prisma.visita.update.mockResolvedValue({});
      mockOAuthOk();
      mockCreateMeetingOk(1);
      await service.crearMeeting('t1', 'visita-1');

      prisma.visita.findFirst.mockResolvedValue({
        ...visita,
        id: 'visita-2',
        zoom_meeting_id: null,
      });
      mockCreateMeetingOk(2);
      await service.crearMeeting('t1', 'visita-2');

      const oauthCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('zoom.us/oauth/token'),
      );
      expect(oauthCalls).toHaveLength(1);
    });

    it('debe propagar el error si Zoom OAuth falla', async () => {
      prisma.visita.findFirst.mockResolvedValue(visita);
      fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(service.crearMeeting('t1', 'visita-1')).rejects.toThrow(
        'Zoom OAuth error',
      );
    });
  });

  describe('eliminarMeeting', () => {
    const visitaConMeeting = {
      id: 'visita-1',
      zoom_meeting_id: 'meeting-1',
      interes: { cliente: { tenant_id: 't1' } },
    };

    it('debe lanzar NotFoundException si la visita no existe o es de otro tenant', async () => {
      prisma.visita.findFirst.mockResolvedValue(null);
      await expect(service.eliminarMeeting('t1', 'visita-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar BadRequestException si la visita no tiene videollamada asociada', async () => {
      prisma.visita.findFirst.mockResolvedValue({
        ...visitaConMeeting,
        zoom_meeting_id: null,
      });
      await expect(service.eliminarMeeting('t1', 'visita-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe eliminar la reunión en Zoom y limpiar los campos en la visita', async () => {
      prisma.visita.findFirst.mockResolvedValue(visitaConMeeting);
      mockOAuthOk();
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      prisma.visita.update.mockResolvedValue({
        id: 'visita-1',
        zoom_meeting_id: null,
        zoom_join_url: null,
      });

      const result = await service.eliminarMeeting('t1', 'visita-1');

      expect(result.zoom_meeting_id).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/meetings/meeting-1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('debe limpiar los campos en la visita aunque falle la eliminación en Zoom (best-effort)', async () => {
      prisma.visita.findFirst.mockResolvedValue(visitaConMeeting);
      integraciones.getCredentials.mockRejectedValue(
        new Error('Zoom no configurado'),
      );
      prisma.visita.update.mockResolvedValue({
        id: 'visita-1',
        zoom_meeting_id: null,
        zoom_join_url: null,
      });

      const result = await service.eliminarMeeting('t1', 'visita-1');

      expect(result.zoom_meeting_id).toBeNull();
      expect(prisma.visita.update).toHaveBeenCalledWith({
        where: { id: 'visita-1' },
        data: { zoom_meeting_id: null, zoom_join_url: null },
        select: expect.any(Object),
      });
    });
  });
});
