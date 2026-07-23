import { ConfigPortalService } from '../config-portal.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('ConfigPortalService', () => {
  let service: ConfigPortalService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: { get: jest.Mock; set: jest.Mock; deleteByPattern: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).configPortal = {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(undefined),
    };
    service = new ConfigPortalService(prisma as any, redis as any);
  });

  describe('findOrCreate', () => {
    it('debe retornar la fila existente sin crear una nueva', async () => {
      (prisma as any).configPortal.findUnique.mockResolvedValue({
        tenant_id: 't1',
        nombre_empresa: 'Maru',
      });

      const result = await service.findOrCreate('t1');

      expect(result.nombre_empresa).toBe('Maru');
      expect((prisma as any).configPortal.create).not.toHaveBeenCalled();
    });

    it('debe crear la fila si no existe', async () => {
      (prisma as any).configPortal.findUnique.mockResolvedValue(null);
      (prisma as any).configPortal.create.mockResolvedValue({
        tenant_id: 't1',
      });

      const result = await service.findOrCreate('t1');

      expect(result.tenant_id).toBe('t1');
      expect((prisma as any).configPortal.create).toHaveBeenCalledWith({
        data: { tenant_id: 't1' },
      });
    });
  });

  describe('update', () => {
    it('debe quitar subdominio/dominio_personalizado si el plan no incluye sitio propio', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ plan: 'BASIC' });
      prisma.catalogoPlan.findUnique.mockResolvedValue({
        tiene_sitio_propio: false,
      });
      (prisma as any).configPortal.upsert.mockResolvedValue({
        tenant_id: 't1',
        dominio_personalizado: null,
        subdominio: null,
      });

      await service.update('t1', {
        subdominio: 'maru',
        dominio_personalizado: 'maru.com',
        nombre_empresa: 'Maru',
      });

      const call = (prisma as any).configPortal.upsert.mock.calls[0][0];
      expect(call.update.subdominio).toBeUndefined();
      expect(call.update.dominio_personalizado).toBeUndefined();
      expect(call.update.nombre_empresa).toBe('Maru');
    });

    it('debe conservar subdominio/dominio_personalizado si el plan sí incluye sitio propio', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      prisma.catalogoPlan.findUnique.mockResolvedValue({
        tiene_sitio_propio: true,
      });
      (prisma as any).configPortal.upsert.mockResolvedValue({
        tenant_id: 't1',
      });

      await service.update('t1', { subdominio: 'maru' });

      const call = (prisma as any).configPortal.upsert.mock.calls[0][0];
      expect(call.update.subdominio).toBe('maru');
    });

    it('no debe modificar el dto si el tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      (prisma as any).configPortal.upsert.mockResolvedValue({
        tenant_id: 't1',
      });

      await service.update('t1', { subdominio: 'maru' });

      const call = (prisma as any).configPortal.upsert.mock.calls[0][0];
      expect(call.update.subdominio).toBe('maru');
    });

    it('debe invalidar la caché de dominio/subdominio y la del default tras actualizar', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ plan: 'PRO' });
      prisma.catalogoPlan.findUnique.mockResolvedValue({
        tiene_sitio_propio: true,
      });
      (prisma as any).configPortal.upsert.mockResolvedValue({
        tenant_id: 't1',
        dominio_personalizado: 'maru.com',
        subdominio: 'maru',
      });

      await service.update('t1', {});

      const setKeys = redis.set.mock.calls.map((c) => c[0]);
      expect(setKeys).toEqual(
        expect.arrayContaining([
          'portal:domain:__default__',
          'portal:domain:maru.com',
          'portal:domain:maru',
        ]),
      );
      expect(redis.deleteByPattern).toHaveBeenCalledWith('portal:domain:*');
    });
  });

  describe('findByDomain', () => {
    function mockTransaction(results: any[][]) {
      let i = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $executeRawUnsafe: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue(results[i++]),
        };
        return cb(tx);
      });
    }

    it('debe retornar el resultado cacheado sin consultar la base de datos', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ tenant_id: 't1' }));

      const result = await service.findByDomain('maru.com');

      expect(result).toEqual({ tenant_id: 't1' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('debe priorizar el match exacto de dominio personalizado sobre el de subdominio', async () => {
      mockTransaction([
        [{ tenant_id: 't1', tipo: 'dominio' }],
        [{ tenant_id: 't2', tipo: 'subdominio' }],
      ]);

      const result = await service.findByDomain('maru.com');

      expect(result).toEqual({ tenant_id: 't1', tipo: 'dominio' });
      expect(redis.set).toHaveBeenCalledWith(
        'portal:domain:maru.com',
        JSON.stringify(result),
        300,
      );
    });

    it('debe usar el match de subdominio si no hay match de dominio personalizado', async () => {
      mockTransaction([[], [{ tenant_id: 't2', tipo: 'subdominio' }]]);

      const result = await service.findByDomain('maru.crm.gestprop.net');

      expect(result).toEqual({ tenant_id: 't2', tipo: 'subdominio' });
    });

    it('debe retornar null y no cachear si no hay ningún match', async () => {
      mockTransaction([[], []]);

      const result = await service.findByDomain('desconocido.com');

      expect(result).toBeNull();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('resolvePortalBaseUrl', () => {
    it('debe retornar la URL con el dominio personalizado si está configurado', async () => {
      (prisma as any).configPortal.findUnique.mockResolvedValue({
        dominio_personalizado: 'maru.com',
      });

      const url = await service.resolvePortalBaseUrl(
        't1',
        'https://fallback.gestprop.net',
      );

      expect(url).toBe('https://maru.com');
    });

    it('debe retornar el fallback si no hay dominio personalizado', async () => {
      (prisma as any).configPortal.findUnique.mockResolvedValue({
        dominio_personalizado: null,
      });

      const url = await service.resolvePortalBaseUrl(
        't1',
        'https://fallback.gestprop.net',
      );

      expect(url).toBe('https://fallback.gestprop.net');
    });

    it('debe retornar el fallback si no existe configuración de portal para el tenant', async () => {
      (prisma as any).configPortal.findUnique.mockResolvedValue(null);

      const url = await service.resolvePortalBaseUrl(
        't1',
        'https://fallback.gestprop.net',
      );

      expect(url).toBe('https://fallback.gestprop.net');
    });
  });

  describe('findDefault', () => {
    it('debe retornar el resultado cacheado sin consultar la base de datos', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ tenant_id: 't1' }));

      const result = await service.findDefault();

      expect(result).toEqual({ tenant_id: 't1' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('debe consultar, cachear y retornar el primer tenant activo con portal', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $executeRawUnsafe: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([{ tenant_id: 't1' }]),
        };
        return cb(tx);
      });

      const result = await service.findDefault();

      expect(result).toEqual({ tenant_id: 't1' });
      expect(redis.set).toHaveBeenCalledWith(
        'portal:domain:__default__',
        JSON.stringify(result),
        300,
      );
    });

    it('debe retornar null si no hay ningún tenant activo con portal', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          $executeRawUnsafe: jest.fn(),
          $queryRaw: jest.fn().mockResolvedValue([]),
        };
        return cb(tx);
      });

      expect(await service.findDefault()).toBeNull();
    });
  });
});
