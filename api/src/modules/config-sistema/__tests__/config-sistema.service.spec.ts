import { ConfigSistemaService } from '../config-sistema.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('ConfigSistemaService', () => {
  let service: ConfigSistemaService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let enc: { encrypt: jest.Mock; decrypt: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).configSistema = {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    };
    enc = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) =>
        v.replace(/^enc\(/, '').replace(/\)$/, ''),
      ),
    };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new ConfigSistemaService(
      prisma as any,
      enc as any,
      config as any,
    );
  });

  // ─── findOrCreate ────────────────────────────────────────────

  describe('findOrCreate', () => {
    it('debe devolver la fila existente enmascarando la api key', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue({
        id: 'singleton',
        resend_api_key: 'enc(re_123)',
        email_from: 'a@b.com',
      });

      const result = await service.findOrCreate();

      expect((prisma as any).configSistema.create).not.toHaveBeenCalled();
      expect(result.resend_api_key).toBe('••••••••');
      expect(result.email_from).toBe('a@b.com');
    });

    it('debe crear el singleton si no existe', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue(null);
      (prisma as any).configSistema.create.mockResolvedValue({
        id: 'singleton',
        resend_api_key: null,
        email_from: null,
      });

      const result = await service.findOrCreate();

      expect((prisma as any).configSistema.create).toHaveBeenCalledWith({
        data: { id: 'singleton' },
      });
      expect(result.resend_api_key).toBeNull();
    });

    it('no debe enmascarar la api key si es null', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue({
        id: 'singleton',
        resend_api_key: null,
        email_from: null,
      });

      const result = await service.findOrCreate();

      expect(result.resend_api_key).toBeNull();
    });
  });

  // ─── update ──────────────────────────────────────────────────

  describe('update', () => {
    it('debe cifrar la api key antes de guardarla', async () => {
      (prisma as any).configSistema.upsert.mockResolvedValue({
        id: 'singleton',
        resend_api_key: 'enc(re_new)',
        email_from: 'x@y.com',
      });

      const result = await service.update(
        { resend_api_key: 're_new' },
        'user-1',
      );

      expect(enc.encrypt).toHaveBeenCalledWith('re_new');
      expect((prisma as any).configSistema.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'singleton' },
          update: expect.objectContaining({
            resend_api_key: 'enc(re_new)',
            updated_by: 'user-1',
          }),
        }),
      );
      expect(result.resend_api_key).toBe('••••••••');
    });

    it('debe guardar null cuando la api key se envía vacía (des-configurar)', async () => {
      (prisma as any).configSistema.upsert.mockResolvedValue({
        id: 'singleton',
        resend_api_key: null,
        email_from: null,
      });

      await service.update({ resend_api_key: '' }, 'user-1');

      expect(enc.encrypt).not.toHaveBeenCalled();
      expect((prisma as any).configSistema.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ resend_api_key: null }),
        }),
      );
    });

    it('no debe tocar resend_api_key si no viene en el DTO', async () => {
      (prisma as any).configSistema.upsert.mockResolvedValue({
        id: 'singleton',
        email_from: 'nuevo@x.com',
      });

      await service.update({ email_from: 'nuevo@x.com' }, 'user-1');

      expect(enc.encrypt).not.toHaveBeenCalled();
      const call = (prisma as any).configSistema.upsert.mock.calls[0][0];
      expect(call.update).not.toHaveProperty('resend_api_key');
      expect(call.update.email_from).toBe('nuevo@x.com');
    });

    it('debe invalidar el caché luego de actualizar', async () => {
      (prisma as any).configSistema.upsert.mockResolvedValue({
        id: 'singleton',
        resend_api_key: null,
        email_from: null,
      });
      (prisma as any).configSistema.findUnique.mockResolvedValue({
        resend_api_key: null,
        email_from: null,
      });

      // Llena el caché
      await service.getSystemCredentials();
      // update() debe invalidarlo
      await service.update({ email_from: 'x@y.com' }, 'user-1');
      // Esta llamada debe volver a golpear la DB, no servir del caché viejo
      await service.getSystemCredentials();

      expect((prisma as any).configSistema.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getSystemCredentials ────────────────────────────────────

  describe('getSystemCredentials', () => {
    it('debe descifrar la api key guardada en DB', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue({
        resend_api_key: 'enc(re_stored)',
        email_from: 'stored@x.com',
      });

      const result = await service.getSystemCredentials();

      expect(enc.decrypt).toHaveBeenCalledWith('enc(re_stored)');
      expect(result.resend_api_key).toBe('re_stored');
      expect(result.email_from).toBe('stored@x.com');
    });

    it('debe usar RESEND_API_KEY de env si no hay fila o está vacía', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue(null);
      config.get.mockImplementation((key: string) =>
        key === 'RESEND_API_KEY' ? 'env-key' : undefined,
      );

      const result = await service.getSystemCredentials();

      expect(enc.decrypt).not.toHaveBeenCalled();
      expect(result.resend_api_key).toBe('env-key');
    });

    it('debe usar el remitente por defecto si no hay fila ni EMAIL_FROM en env', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue(null);

      const result = await service.getSystemCredentials();

      expect(result.email_from).toBe('GestProp CRM <onboarding@resend.dev>');
    });

    it('debe cachear el resultado y no volver a consultar la DB dentro del TTL', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue({
        resend_api_key: null,
        email_from: 'cached@x.com',
      });

      const first = await service.getSystemCredentials();
      const second = await service.getSystemCredentials();

      expect((prisma as any).configSistema.findUnique).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });
  });

  // ─── invalidateCache ─────────────────────────────────────────

  describe('invalidateCache', () => {
    it('debe forzar una nueva consulta a la DB en la siguiente llamada', async () => {
      (prisma as any).configSistema.findUnique.mockResolvedValue({
        resend_api_key: null,
        email_from: 'a@b.com',
      });

      await service.getSystemCredentials();
      service.invalidateCache();
      await service.getSystemCredentials();

      expect((prisma as any).configSistema.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
