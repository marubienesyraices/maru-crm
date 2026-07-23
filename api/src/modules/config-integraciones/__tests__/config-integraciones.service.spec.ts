import { ConfigIntegracionesService } from '../config-integraciones.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('ConfigIntegracionesService', () => {
  let service: ConfigIntegracionesService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let enc: { encrypt: jest.Mock; decrypt: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).configIntegraciones = {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    };
    enc = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) => v.replace(/^enc\(|\)$/g, '')),
    };
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new ConfigIntegracionesService(
      prisma as any,
      enc as any,
      config as any,
    );
  });

  describe('findOrCreate', () => {
    it('debe enmascarar los campos sensibles de una fila existente', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        tenant_id: 't1',
        resend_api_key: 'enc(secret)',
        email_from: 'a@x.com',
      });

      const result = await service.findOrCreate('t1');

      expect(result.resend_api_key).toBe('••••••••');
      expect(result.email_from).toBe('a@x.com');
      expect((prisma as any).configIntegraciones.create).not.toHaveBeenCalled();
    });

    it('debe crear la fila si no existe', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue(null);
      (prisma as any).configIntegraciones.create.mockResolvedValue({
        tenant_id: 't1',
      });

      const result = await service.findOrCreate('t1');

      expect(result.tenant_id).toBe('t1');
      expect((prisma as any).configIntegraciones.create).toHaveBeenCalledWith({
        data: { tenant_id: 't1' },
      });
    });

    it('no debe enmascarar campos sensibles que están vacíos', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        tenant_id: 't1',
        resend_api_key: null,
      });

      const result = await service.findOrCreate('t1');

      expect(result.resend_api_key).toBeNull();
    });
  });

  describe('update', () => {
    it('debe cifrar los campos sensibles antes de guardar', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({
        tenant_id: 't1',
        resend_api_key: 'enc(re_123)',
      });

      await service.update('t1', {
        resend_api_key: 're_123',
        email_from: 'a@x.com',
      });

      expect(enc.encrypt).toHaveBeenCalledWith('re_123');
      const data = (prisma as any).configIntegraciones.upsert.mock.calls[0][0]
        .update;
      expect(data.resend_api_key).toBe('enc(re_123)');
      expect(data.email_from).toBe('a@x.com'); // no cifrado, es un campo plano
    });

    it('no debe intentar cifrar un campo sensible que viene null', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({
        tenant_id: 't1',
      });

      await service.update('t1', { resend_api_key: null } as any);

      expect(enc.encrypt).not.toHaveBeenCalled();
    });

    it('debe retornar la respuesta enmascarada', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({
        tenant_id: 't1',
        resend_api_key: 'enc(re_123)',
      });

      const result = await service.update('t1', {
        resend_api_key: 're_123',
      });

      expect(result.resend_api_key).toBe('••••••••');
    });
  });

  describe('getCredentials', () => {
    it('debe descifrar los campos cifrados almacenados en el tenant', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        resend_api_key: 'enc(re_stored)',
        email_from: 'tenant@x.com',
      });

      const creds = await service.getCredentials('t1');

      expect(creds.resend_api_key).toBe('re_stored');
      expect(creds.email_from).toBe('tenant@x.com');
    });

    it('debe usar la variable de entorno global si el tenant no configuró el campo', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue(null);
      config.get.mockImplementation((key: string) =>
        key === 'RESEND_API_KEY' ? 'env-key' : undefined,
      );

      const creds = await service.getCredentials('t1');

      expect(creds.resend_api_key).toBe('env-key');
    });

    it('debe retornar null si ni el tenant ni el env tienen el valor configurado', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue(null);

      const creds = await service.getCredentials('t1');

      expect(creds.zoom_account_id).toBeNull();
      expect(creds.docusign_rsa_private_key).toBeNull();
    });

    it('los campos planos (no cifrados) del tenant deben tener prioridad sobre el env', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        zoom_account_id: 'tenant-acc',
      });
      config.get.mockImplementation((key: string) =>
        key === 'ZOOM_ACCOUNT_ID' ? 'env-acc' : undefined,
      );

      const creds = await service.getCredentials('t1');

      expect(creds.zoom_account_id).toBe('tenant-acc');
    });
  });

  describe('getCartaConfig', () => {
    it('debe retornar la configuración de carta existente', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        carta_color_primario: '#123456',
        carta_tagline: 'Tu aliado',
        carta_logo_url: null,
        carta_clausulas_custom: null,
      });

      const result = await service.getCartaConfig('t1');

      expect(result.carta_color_primario).toBe('#123456');
    });

    it('debe retornar valores null por defecto si no existe configuración', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue(null);

      const result = await service.getCartaConfig('t1');

      expect(result).toEqual({
        carta_color_primario: null,
        carta_tagline: null,
        carta_logo_url: null,
        carta_clausulas_custom: null,
      });
    });
  });

  describe('updateCartaConfig', () => {
    it('solo debe actualizar los campos explícitamente enviados', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({});
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        carta_color_primario: '#000000',
        carta_tagline: null,
        carta_logo_url: null,
        carta_clausulas_custom: null,
      });

      await service.updateCartaConfig('t1', {
        carta_color_primario: '#000000',
      });

      const data = (prisma as any).configIntegraciones.upsert.mock.calls[0][0]
        .update;
      expect(data).toEqual({ carta_color_primario: '#000000' });
    });

    it('debe convertir cadenas vacías a null', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({});
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({});

      await service.updateCartaConfig('t1', { carta_tagline: '' });

      const data = (prisma as any).configIntegraciones.upsert.mock.calls[0][0]
        .update;
      expect(data.carta_tagline).toBeNull();
    });
  });
});
