import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WhatsappService } from '../whatsapp.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let config: { get: jest.Mock };
  let brochure: { generateBuffer: jest.Mock };
  let fetchMock: jest.Mock;

  const propiedad = {
    titulo: 'Casa X',
    codigo: 'CASA-0001',
    gestion: 'VENTA',
    moneda: 'USD',
    precio_venta: 100000,
    precio_renta: null,
    agente: { nombre: 'Ana Agente', email: 'ana@x.com' },
  };

  function setup(configured: boolean) {
    config = {
      get: jest.fn((key: string) => {
        if (!configured) return undefined;
        if (key === 'WHATSAPP_API_TOKEN') return 'tok-123';
        if (key === 'WHATSAPP_PHONE_NUMBER_ID') return 'phone-1';
        return undefined;
      }),
    };
    prisma = createMockPrismaService();
    (prisma as any).whatsappEnvio = {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn(),
    };
    brochure = {
      generateBuffer: jest.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF'),
        codigo: 'CASA-0001',
      }),
    };
    service = new WhatsappService(
      config as any,
      prisma as any,
      brochure as any,
    );

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  }

  describe('normalizePhone (vía enviarBrochure sin configuración)', () => {
    beforeEach(() => setup(false));

    it('debe lanzar BadRequestException si el teléfono no tiene dígitos', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);
      await expect(
        service.enviarBrochure('t1', 'u1', 'prop-1', {
          telefono: 'abc',
          mensaje: undefined,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe despojar el prefijo internacional 00', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);
      const result = await service.enviarBrochure('t1', 'u1', 'prop-1', {
        telefono: '0050212345678',
      });
      expect(result.telefono).toBe('50212345678');
    });
  });

  describe('enviarBrochure', () => {
    beforeEach(() => setup(false));

    it('debe lanzar NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);
      await expect(
        service.enviarBrochure('t1', 'u1', 'prop-x', {
          telefono: '50212345678',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('sin configuración (fallback wa.me)', () => {
    beforeEach(() => setup(false));

    it('debe generar un link wa.me con el texto por defecto y registrar el envío como LINK', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);

      const result = await service.enviarBrochure('t1', 'u1', 'prop-1', {
        telefono: '50212345678',
      });

      expect(result.status).toBe('LINK_GENERADO');
      expect((result as any).wa_link).toContain(
        'https://wa.me/50212345678?text=',
      );
      expect(
        decodeURIComponent((result as any).wa_link.split('text=')[1]),
      ).toContain('Casa X');
      expect((prisma as any).whatsappEnvio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'LINK',
            telefono_destino: '50212345678',
          }),
        }),
      );
    });

    it('debe usar el mensaje personalizado si se proporciona, en vez del texto generado', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);

      const result = await service.enviarBrochure('t1', 'u1', 'prop-1', {
        telefono: '50212345678',
        mensaje: 'Hola, mira esta propiedad',
      });

      expect(
        decodeURIComponent((result as any).wa_link.split('text=')[1]),
      ).toBe('Hola, mira esta propiedad');
    });

    it('no debe fallar el envío si el registro en BD falla (best-effort)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);
      (prisma as any).whatsappEnvio.create.mockRejectedValue(
        new Error('DB caída'),
      );

      await expect(
        service.enviarBrochure('t1', 'u1', 'prop-1', {
          telefono: '50212345678',
        } as any),
      ).resolves.toHaveProperty('status', 'LINK_GENERADO');
    });
  });

  describe('con Cloud API configurada', () => {
    beforeEach(() => setup(true));

    it('debe subir el PDF, enviar el documento y registrar el envío como ENVIADO', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'media-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [{ id: 'msg-1' }] }),
        });

      const result = await service.enviarBrochure('t1', 'u1', 'prop-1', {
        telefono: '50212345678',
      });

      expect(result).toEqual({
        status: 'ENVIADO',
        message_id: 'msg-1',
        telefono: '50212345678',
      });
      expect((prisma as any).whatsappEnvio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ENVIADO',
            waba_message_id: 'msg-1',
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException y registrar FALLIDO si la subida del PDF falla', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'token expirado' } }),
      });

      await expect(
        service.enviarBrochure('t1', 'u1', 'prop-1', {
          telefono: '50212345678',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect((prisma as any).whatsappEnvio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FALLIDO',
            error: 'token expirado',
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException y registrar FALLIDO si el envío del mensaje falla', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(propiedad);
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'media-1' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: { message: 'número inválido' } }),
        });

      await expect(
        service.enviarBrochure('t1', 'u1', 'prop-1', {
          telefono: '50212345678',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect((prisma as any).whatsappEnvio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FALLIDO',
            error: 'número inválido',
          }),
        }),
      );
    });
  });

  describe('getEnvios', () => {
    beforeEach(() => setup(false));

    it('debe retornar el total y la lista de envíos', async () => {
      (prisma as any).whatsappEnvio.findMany.mockResolvedValue([
        { id: '1' },
        { id: '2' },
      ]);

      const result = await service.getEnvios('t1', 'prop-1');

      expect(result.total).toBe(2);
      expect(result.envios).toHaveLength(2);
    });
  });
});
