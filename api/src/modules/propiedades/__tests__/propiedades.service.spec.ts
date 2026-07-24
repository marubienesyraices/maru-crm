import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PropiedadesService } from '../propiedades.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { StorageService } from '../../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/mocks/prisma.mock';

const mockNotificacionesService = { create: jest.fn().mockResolvedValue({}) };
const mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
const mockStorageService = { remove: jest.fn().mockResolvedValue(undefined) };

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

const mockTenant = {
  id: TENANT_ID,
  nombre: 'Maru Test',
  plan: 'PRO',
  limite_propiedades: 100,
  limite_usuarios: 10,
};

const mockAgenteSenior = { id: USER_ID, nombre: 'Admin', rol: 'SENIOR' };

const mockPropiedad = {
  id: 'prop-001',
  tenant_id: TENANT_ID,
  codigo: 'CASA-0001',
  titulo: 'Casa Moderna en Zona 14',
  descripcion: null,
  tipo: 'CASA',
  gestion: 'VENTA',
  estado: 'BORRADOR',
  precio_venta: 2500000,
  precio_renta: null,
  moneda: 'GTQ',
  departamento: 'Guatemala',
  municipio: 'Guatemala',
  zona: '14',
  habitaciones: 4,
  banos: 3,
  parqueos: 2,
  propietario: null,
  agente: { id: USER_ID, nombre: 'Admin', email: 'admin@test.com' },
  imagenes: [],
  documentos: [],
};

describe('PropiedadesService', () => {
  let service: PropiedadesService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    prisma.$transaction.mockImplementation(async (opsOrFn: any) => {
      if (typeof opsOrFn === 'function') return opsOrFn(prisma);
      return Promise.all(opsOrFn);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropiedadesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificacionesService, useValue: mockNotificacionesService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<PropiedadesService>(PropiedadesService);
  });

  // ─── CREATE ─────────────────────────────────────────────────

  describe('create', () => {
    it('debe crear propiedad con código auto-generado', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findFirst.mockResolvedValue(mockAgenteSenior);
      prisma.user.count.mockResolvedValue(1);
      prisma.propiedad.count.mockResolvedValue(0);
      prisma.propiedad.create.mockResolvedValue({
        ...mockPropiedad,
        codigo: 'CASA-0001',
      });

      const result = await service.create(
        TENANT_ID,
        {
          titulo: 'Casa Moderna en Zona 14',
          tipo: 'CASA',
          gestion: 'VENTA',
          precioVenta: 2500000,
        },
        USER_ID,
      );

      expect(result.codigo).toBe('CASA-0001');
      expect(prisma.propiedad.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenant_id: TENANT_ID,
            codigo: 'CASA-0001',
            titulo: 'Casa Moderna en Zona 14',
            agente_id: USER_ID,
          }),
        }),
      );
    });

    it('debe rechazar si se alcanzó el límite de propiedades', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        limite_propiedades: 5,
      });
      prisma.propiedad.count.mockResolvedValue(5);

      await expect(
        service.create(
          TENANT_ID,
          { titulo: 'Test', tipo: 'CASA', gestion: 'VENTA' },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          TENANT_ID,
          { titulo: 'Test', tipo: 'CASA', gestion: 'VENTA' },
          USER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe generar código con prefijo del tipo (APAR para APARTAMENTO)', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findFirst.mockResolvedValue(mockAgenteSenior);
      prisma.user.count.mockResolvedValue(1);
      prisma.propiedad.count.mockResolvedValue(7);
      prisma.propiedad.create.mockResolvedValue({
        ...mockPropiedad,
        codigo: 'APAR-0008',
      });

      await service.create(
        TENANT_ID,
        {
          titulo: 'Apartamento en Z10',
          tipo: 'APARTAMENTO',
          gestion: 'RENTA',
        },
        USER_ID,
      );

      expect(prisma.propiedad.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ codigo: 'APAR-0008' }),
        }),
      );
    });
  });

  // ─── FIND ALL ───────────────────────────────────────────────

  describe('findAll', () => {
    it('debe retornar propiedades paginadas', async () => {
      const items = [mockPropiedad];
      prisma.propiedad.findMany.mockResolvedValue(items);
      prisma.propiedad.count.mockResolvedValue(1);

      const result = await service.findAll(TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('debe aplicar filtros de tipo y estado', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { tipo: 'CASA', estado: 'DISPONIBLE' });

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: TENANT_ID,
            tipo: 'CASA',
            estado: 'DISPONIBLE',
          }),
        }),
      );
    });

    it('debe aplicar búsqueda por texto', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findAll(TENANT_ID, { busqueda: 'zona 14' });

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { titulo: { contains: 'zona 14', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  // ─── FIND ONE ───────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar propiedad con relaciones', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);

      const result = await service.findOne(TENANT_ID, 'prop-001');

      expect(result.id).toBe('prop-001');
      expect(prisma.propiedad.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-001', tenant_id: TENANT_ID },
        }),
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, 'no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── CAMBIAR ESTADO (State Machine) ────────────────────────

  describe('cambiarEstado', () => {
    it('debe permitir BORRADOR → DISPONIBLE', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'BORRADOR',
      });
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        estado: 'DISPONIBLE',
      });
      prisma.cliente.findMany.mockResolvedValue([]);

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', {
        nuevoEstado: 'DISPONIBLE',
      });

      expect(result.estado).toBe('DISPONIBLE');
    });

    it('debe rechazar BORRADOR → VENDIDA (no permitida)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'BORRADOR',
      });

      await expect(
        service.cambiarEstado(TENANT_ID, 'prop-001', {
          nuevoEstado: 'VENDIDA',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir DISPONIBLE → RESERVADA', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'DISPONIBLE',
      });
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        estado: 'RESERVADA',
      });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', {
        nuevoEstado: 'RESERVADA',
      });

      expect(result.estado).toBe('RESERVADA');
    });

    it('debe rechazar DISPONIBLE → VENDIDA (debe pasar por EN_NEGOCIACION)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'DISPONIBLE',
      });

      await expect(
        service.cambiarEstado(TENANT_ID, 'prop-001', {
          nuevoEstado: 'VENDIDA',
        }),
      ).rejects.toThrow(/Transición inválida/);
    });

    it('debe permitir EN_NEGOCIACION → VENDIDA', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'EN_NEGOCIACION',
      });
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        estado: 'VENDIDA',
      });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', {
        nuevoEstado: 'VENDIDA',
      });

      expect(result.estado).toBe('VENDIDA');
    });

    it('VENDIDA es estado terminal (no permite transiciones)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'VENDIDA',
      });

      await expect(
        service.cambiarEstado(TENANT_ID, 'prop-001', {
          nuevoEstado: 'DISPONIBLE',
        }),
      ).rejects.toThrow(/ninguna \(estado terminal\)/);
    });

    it('debe permitir RENTADA → DISPONIBLE (re-listar)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'RENTADA',
      });
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        estado: 'DISPONIBLE',
      });
      prisma.cliente.findMany.mockResolvedValue([]);

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', {
        nuevoEstado: 'DISPONIBLE',
      });

      expect(result.estado).toBe('DISPONIBLE');
    });

    it('debe permitir SUSPENDIDA → BORRADOR', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...mockPropiedad,
        estado: 'SUSPENDIDA',
      });
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        estado: 'BORRADOR',
      });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', {
        nuevoEstado: 'BORRADOR',
      });

      expect(result.estado).toBe('BORRADOR');
    });
  });

  // ─── STATS ──────────────────────────────────────────────────

  describe('getStats', () => {
    it('debe retornar estadísticas agrupadas', async () => {
      prisma.propiedad.count.mockResolvedValue(10);
      prisma.propiedad.groupBy
        .mockResolvedValueOnce([
          { estado: 'DISPONIBLE', _count: 5 },
          { estado: 'BORRADOR', _count: 3 },
        ])
        .mockResolvedValueOnce([
          { tipo: 'CASA', _count: 6 },
          { tipo: 'APARTAMENTO', _count: 4 },
        ]);

      const result = await service.getStats(TENANT_ID);

      expect(result.total).toBe(10);
      expect(result.porEstado).toHaveLength(2);
      expect(result.porTipo).toHaveLength(2);
    });
  });

  // ─── UPDATE ─────────────────────────────────────────────────

  describe('update', () => {
    it('debe actualizar propiedad existente', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        titulo: 'Nuevo Titulo',
      });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.update(TENANT_ID, 'prop-001', {
        titulo: 'Nuevo Titulo',
      });

      expect(result.titulo).toBe('Nuevo Titulo');
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prop-001' } }),
      );
    });

    it('debe lanzar NotFoundException si propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(
        service.update(TENANT_ID, 'no-existe', { titulo: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE: GEOCODING (geocodeFromDto, vía update) ────────

  describe('update — geocodificación de dirección', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      mockConfigService.get.mockReset().mockReturnValue(undefined);
    });

    it('geocodifica la nueva dirección cuando el plan tiene mapas y hay MAPBOX_TOKEN', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: true });
      prisma.propiedad.update.mockResolvedValue({
        ...mockPropiedad,
        latitud: 14.6,
        longitud: -90.5,
      });
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'MAPBOX_TOKEN' ? 'test-token' : undefined,
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ features: [{ center: [-90.5, 14.6] }] }),
      });

      await service.update(TENANT_ID, 'prop-001', {
        direccion: 'Nueva dirección',
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ latitud: 14.6, longitud: -90.5 }),
        }),
      );
    });

    it('no llama a Mapbox si no hay MAPBOX_TOKEN configurado', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: true });
      prisma.propiedad.update.mockResolvedValue(mockPropiedad);
      global.fetch = jest.fn();

      await service.update(TENANT_ID, 'prop-001', {
        direccion: 'Otra dirección',
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('no rompe la actualización si Mapbox falla (red caída)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: true });
      prisma.propiedad.update.mockResolvedValue(mockPropiedad);
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'MAPBOX_TOKEN' ? 'test-token' : undefined,
      );
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

      await expect(
        service.update(TENANT_ID, 'prop-001', {
          direccion: 'Dirección con fetch roto',
        }),
      ).resolves.toBeDefined();
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────

  describe('delete', () => {
    const deletablePropiedad = {
      ...mockPropiedad,
      estado: 'BORRADOR',
      imagenes: [
        { url: 'img.jpg', thumbnail_url: 'img-thumb.jpg', original_url: null },
      ],
      documentos: [{ url: 'doc.pdf' }],
      _count: { interesados: 0, firma_solicitudes: 0 },
    };

    it('debe borrar la propiedad y limpiar los archivos huérfanos (brochures/whatsapp)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(deletablePropiedad);
      prisma.brochureJob.findMany.mockResolvedValue([{ url: 'brochure.pdf' }]);

      await service.delete(TENANT_ID, 'prop-001');

      expect(prisma.brochureJob.deleteMany).toHaveBeenCalledWith({
        where: { propiedad_id: 'prop-001' },
      });
      expect(prisma.whatsappEnvio.deleteMany).toHaveBeenCalledWith({
        where: { propiedad_id: 'prop-001' },
      });
      expect(prisma.propiedad.delete).toHaveBeenCalledWith({
        where: { id: 'prop-001' },
      });
      expect(mockStorageService.remove).toHaveBeenCalledTimes(4); // img + thumb + doc + brochure
    });

    it('debe lanzar NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);

      await expect(service.delete(TENANT_ID, 'no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe rechazar el borrado si el estado no es BORRADOR/SUSPENDIDA', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...deletablePropiedad,
        estado: 'DISPONIBLE',
      });

      await expect(service.delete(TENANT_ID, 'prop-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.propiedad.delete).not.toHaveBeenCalled();
    });

    it('debe rechazar el borrado si tiene clientes interesados en el pipeline', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...deletablePropiedad,
        _count: { interesados: 1, firma_solicitudes: 0 },
      });

      await expect(service.delete(TENANT_ID, 'prop-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.propiedad.delete).not.toHaveBeenCalled();
    });

    it('debe rechazar el borrado si tiene solicitudes de firma registradas', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        ...deletablePropiedad,
        _count: { interesados: 0, firma_solicitudes: 1 },
      });

      await expect(service.delete(TENANT_ID, 'prop-001')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.propiedad.delete).not.toHaveBeenCalled();
    });
  });

  // ─── PRECIO SUGERIDO ────────────────────────────────────────

  describe('getPrecioSugerido', () => {
    it('retorna SIN_DATOS cuando no hay comparables', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);

      const result = await service.getPrecioSugerido(TENANT_ID, {
        tipo: 'CASA',
        gestion: 'VENTA',
      });

      expect(result.confianza).toBe('SIN_DATOS');
      expect(result.comparable_count).toBe(0);
      expect(result.precio_sugerido_venta).toBeNull();
    });

    it('con lat/lng filtra por radio (queryComparablesByGeo + haversineM)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p1',
          codigo: 'C1',
          titulo: 'Cercana',
          precio_venta: 1000000,
          precio_renta: null,
          area_construccion_m2: null,
          latitud: 14.6,
          longitud: -90.5,
        },
        {
          id: 'p2',
          codigo: 'C2',
          titulo: 'Lejana (~111km)',
          precio_venta: 2000000,
          precio_renta: null,
          area_construccion_m2: null,
          latitud: 15.6,
          longitud: -90.5,
        },
      ]);

      const result = await service.getPrecioSugerido(TENANT_ID, {
        lat: 14.6,
        lng: -90.5,
        tipo: 'CASA',
        gestion: 'VENTA',
        radioKm: 5,
      });

      expect(result.usa_geo).toBe(true);
      expect(result.comparable_count).toBe(1);
      expect(result.precio_sugerido_venta).toBe(1000000);
    });

    it.each([
      [1, 'BAJA'],
      [3, 'MEDIA'],
      [5, 'ALTA'],
    ])(
      'confianza es %s con %i comparables sin geo (queryComparablesByDepartamento)',
      async (count, expectedConfianza) => {
        const rows = Array.from({ length: count }, (_, i) => ({
          id: `p${i}`,
          codigo: `C${i}`,
          titulo: `Prop ${i}`,
          precio_venta: 1000000,
          precio_renta: null,
          area_construccion_m2: null,
        }));
        prisma.propiedad.findMany.mockResolvedValue(rows);

        const result = await service.getPrecioSugerido(TENANT_ID, {
          tipo: 'CASA',
          gestion: 'VENTA',
          departamento: 'Guatemala',
        });

        expect(result.usa_geo).toBe(false);
        expect(result.comparable_count).toBe(count);
        expect(result.confianza).toBe(expectedConfianza);
        expect(result.precio_sugerido_venta).toBe(1000000);
      },
    );

    it('excluye comparables sin precio_renta cuando gestion=RENTA', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p1',
          codigo: 'C1',
          titulo: 'Solo venta',
          precio_venta: 1000000,
          precio_renta: null,
          area_construccion_m2: null,
        },
        {
          id: 'p2',
          codigo: 'C2',
          titulo: 'Solo renta',
          precio_venta: null,
          precio_renta: 5000,
          area_construccion_m2: null,
        },
      ]);

      const result = await service.getPrecioSugerido(TENANT_ID, {
        tipo: 'CASA',
        gestion: 'RENTA',
      });

      expect(result.comparable_count).toBe(1);
      expect(result.precio_sugerido_renta).toBe(5000);
      expect(result.precio_sugerido_venta).toBeNull();
    });
  });
});
