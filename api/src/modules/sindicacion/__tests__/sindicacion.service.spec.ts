import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SindicacionService } from '../sindicacion.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const PROP_ID = 'prop-001';

const CONFIG_VALUES: Record<string, string> = {
  ENCUENTRA24_API_KEY: 'e24-key',
  ML_ACCESS_TOKEN: 'ml-token',
};

function buildConfigService(
  overrides: Record<string, string | undefined> = {},
) {
  const values = { ...CONFIG_VALUES, ...overrides };
  return { get: jest.fn((key: string) => values[key]) };
}

const mockPropDisponible = {
  id: PROP_ID,
  tenant_id: TENANT_ID,
  estado: 'DISPONIBLE',
  tipo: 'CASA',
  gestion: 'VENTA',
  titulo: 'Casa en Zona 14',
  descripcion: 'Bonita casa',
  moneda: 'GTQ',
  precio_venta: 500000,
  precio_renta: null,
  departamento: 'Guatemala',
  municipio: 'Guatemala',
  habitaciones: 3,
  banos: 2,
  parqueos: 1,
  area_construccion_m2: 150,
  agente_id: 'agent-1',
  codigo: 'CASA-0001',
  imagenes: [{ url: 'https://cdn/img1.jpg' }],
};

describe('SindicacionService', () => {
  let service: SindicacionService;
  let prisma: MockPrismaService;
  const originalFetch = global.fetch;

  async function buildService(
    configOverrides: Record<string, string | undefined> = {},
  ) {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SindicacionService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: buildConfigService(configOverrides),
        },
      ],
    }).compile();
    service = module.get<SindicacionService>(SindicacionService);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ─── getEstado ───────────────────────────────────────────────────

  describe('getEstado', () => {
    it('lanza NotFoundException si la propiedad no pertenece al tenant', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);

      await expect(service.getEstado(TENANT_ID, PROP_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve el historial de publicaciones', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findMany.mockResolvedValue([
        { id: 'pub-1', portal: 'ENCUENTRA24' },
      ]);

      const result = await service.getEstado(TENANT_ID, PROP_ID);

      expect(result).toHaveLength(1);
    });
  });

  // ─── publicar ────────────────────────────────────────────────────

  describe('publicar', () => {
    it('lanza BadRequestException si la propiedad está en BORRADOR', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropDisponible,
        estado: 'BORRADOR',
      });

      await expect(
        service.publicar(TENANT_ID, PROP_ID, 'ENCUENTRA24'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si ya está publicado en ese portal', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue({
        id: 'pub-1',
        estado: 'PUBLICADO',
      });

      await expect(
        service.publicar(TENANT_ID, PROP_ID, 'ENCUENTRA24'),
      ).rejects.toThrow(BadRequestException);
    });

    it('publica en Encuentra24 exitosamente y marca PUBLICADO', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);
      prisma.sindicacionPublicacion.upsert.mockResolvedValue({ id: 'pub-1' });
      prisma.sindicacionPublicacion.update.mockResolvedValue({
        id: 'pub-1',
        estado: 'PUBLICADO',
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'e24-123', url: 'https://e24.com/123' }),
      }) as any;

      await service.publicar(TENANT_ID, PROP_ID, 'ENCUENTRA24');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/classifieds'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'pub-1' },
        data: expect.objectContaining({
          estado: 'PUBLICADO',
          external_id: 'e24-123',
          external_url: 'https://e24.com/123',
        }),
      });
    });

    it('publica en MercadoLibre exitosamente', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);
      prisma.sindicacionPublicacion.upsert.mockResolvedValue({ id: 'pub-2' });
      prisma.sindicacionPublicacion.update.mockResolvedValue({});
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'ML-999', permalink: 'https://ml.com/999' }),
      }) as any;

      await service.publicar(TENANT_ID, PROP_ID, 'MERCADOLIBRE');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/items'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'pub-2' },
        data: expect.objectContaining({
          external_id: 'ML-999',
          external_url: 'https://ml.com/999',
        }),
      });
    });

    it('marca ERROR y relanza BadRequestException si falta la API key configurada', async () => {
      await buildService({ ENCUENTRA24_API_KEY: undefined });
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);
      prisma.sindicacionPublicacion.upsert.mockResolvedValue({ id: 'pub-3' });
      prisma.sindicacionPublicacion.update.mockResolvedValue({});

      await expect(
        service.publicar(TENANT_ID, PROP_ID, 'ENCUENTRA24'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'pub-3' },
        data: expect.objectContaining({ estado: 'ERROR' }),
      });
    });

    it('marca ERROR si el portal externo responde con error HTTP', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);
      prisma.sindicacionPublicacion.upsert.mockResolvedValue({ id: 'pub-4' });
      prisma.sindicacionPublicacion.update.mockResolvedValue({});
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Datos inválidos' }),
      }) as any;

      await expect(
        service.publicar(TENANT_ID, PROP_ID, 'ENCUENTRA24'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ERROR',
            error_msg: 'Datos inválidos',
          }),
        }),
      );
    });
  });

  // ─── retirar ─────────────────────────────────────────────────────

  describe('retirar', () => {
    it('lanza NotFoundException si no hay publicación activa', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);

      await expect(
        service.retirar(TENANT_ID, PROP_ID, 'ENCUENTRA24'),
      ).rejects.toThrow(NotFoundException);
    });

    it('retira de Encuentra24 y marca RETIRADO', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue({
        id: 'pub-1',
        external_id: 'e24-123',
      });
      prisma.sindicacionPublicacion.update.mockResolvedValue({
        estado: 'RETIRADO',
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

      const result = await service.retirar(TENANT_ID, PROP_ID, 'ENCUENTRA24');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/classifieds/e24-123'),
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'RETIRADO' }),
        }),
      );
      expect(result.estado).toBe('RETIRADO');
    });

    it('marca RETIRADO igualmente aunque falle la llamada externa (no bloqueante)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue({
        id: 'pub-1',
        external_id: 'e24-123',
      });
      prisma.sindicacionPublicacion.update.mockResolvedValue({
        estado: 'RETIRADO',
      });
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('network down')) as any;

      const result = await service.retirar(TENANT_ID, PROP_ID, 'ENCUENTRA24');

      expect(result.estado).toBe('RETIRADO');
    });
  });

  // ─── handleMlWebhook ─────────────────────────────────────────────

  describe('handleMlWebhook', () => {
    it('ignora tópicos que no sean "items"', async () => {
      await service.handleMlWebhook('orders', '/orders/1');
      expect(prisma.sindicacionPublicacion.findFirst).not.toHaveBeenCalled();
    });

    it('ignora si no encuentra una publicación asociada al item', async () => {
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);
      global.fetch = jest.fn() as any;

      await service.handleMlWebhook('items', '/items/ML-999');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('marca RETIRADO cuando el item aparece cerrado en MercadoLibre', async () => {
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue({
        id: 'pub-1',
      });
      prisma.sindicacionPublicacion.update.mockResolvedValue({});
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'closed' }),
      }) as any;

      await service.handleMlWebhook('items', '/items/ML-999');

      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pub-1' },
          data: expect.objectContaining({ estado: 'RETIRADO' }),
        }),
      );
    });

    it('no actualiza nada si el item sigue activo', async () => {
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue({
        id: 'pub-1',
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'active' }),
      }) as any;

      await service.handleMlWebhook('items', '/items/ML-999');

      expect(prisma.sindicacionPublicacion.update).not.toHaveBeenCalled();
    });
  });

  // ─── sincronizarPorFrecuencia ────────────────────────────────────

  describe('sincronizarPorFrecuencia', () => {
    it('no hace nada si no hay configuración o la frecuencia es manual', async () => {
      prisma.configSeguridad.findUnique.mockResolvedValue({
        sinc_frecuencia: 'manual',
      });

      await service.sincronizarPorFrecuencia(TENANT_ID);

      expect(prisma.sindicacionPublicacion.findMany).not.toHaveBeenCalled();
    });

    it('resincroniza (retira + publica) cada publicación activa', async () => {
      prisma.configSeguridad.findUnique.mockResolvedValue({
        sinc_frecuencia: 'diario',
      });
      prisma.sindicacionPublicacion.findMany.mockResolvedValue([
        { propiedad_id: PROP_ID, portal: 'ENCUENTRA24' },
      ]);
      prisma.propiedad.findFirst.mockResolvedValue(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst
        .mockResolvedValueOnce({ id: 'pub-1', external_id: 'e24-123' }) // retirar
        .mockResolvedValueOnce(null); // publicar: no hay publicación PUBLICADO previa
      prisma.sindicacionPublicacion.update.mockResolvedValue({});
      prisma.sindicacionPublicacion.upsert.mockResolvedValue({ id: 'pub-1' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'e24-123', url: 'https://e24.com/123' }),
      }) as any;

      await service.sincronizarPorFrecuencia(TENANT_ID);

      expect(prisma.sindicacionPublicacion.update).toHaveBeenCalled();
    });

    it('continúa con la siguiente propiedad si una falla al resincronizar', async () => {
      prisma.configSeguridad.findUnique.mockResolvedValue({
        sinc_frecuencia: 'diario',
      });
      prisma.sindicacionPublicacion.findMany.mockResolvedValue([
        { propiedad_id: 'prop-a', portal: 'ENCUENTRA24' },
        { propiedad_id: 'prop-b', portal: 'ENCUENTRA24' },
      ]);
      // prop-a: assertPropiedad falla (no encontrada) → catch y continúa
      // prop-b: assertPropiedad ok → sigue el flujo normal
      prisma.propiedad.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPropDisponible)
        .mockResolvedValueOnce(mockPropDisponible);
      prisma.sindicacionPublicacion.findFirst.mockResolvedValue(null);
      prisma.sindicacionPublicacion.upsert.mockResolvedValue({ id: 'pub-b' });
      prisma.sindicacionPublicacion.update.mockResolvedValue({});
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'e24-1', url: 'https://e24.com/1' }),
      }) as any;

      await expect(
        service.sincronizarPorFrecuencia(TENANT_ID),
      ).resolves.not.toThrow();
    });
  });
});
