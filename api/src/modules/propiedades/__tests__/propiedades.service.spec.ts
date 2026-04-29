import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PropiedadesService } from '../propiedades.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

const mockTenant = {
  id: TENANT_ID,
  nombre: 'Maru Test',
  limite_propiedades: 100,
  limite_usuarios: 10,
};

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropiedadesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PropiedadesService>(PropiedadesService);
  });

  // ─── CREATE ─────────────────────────────────────────────────

  describe('create', () => {
    it('debe crear propiedad con código auto-generado', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.propiedad.count.mockResolvedValue(0);
      prisma.propiedad.create.mockResolvedValue({ ...mockPropiedad, codigo: 'CASA-0001' });

      const result = await service.create(TENANT_ID, {
        titulo: 'Casa Moderna en Zona 14',
        tipo: 'CASA',
        gestion: 'VENTA',
        precioVenta: 2500000,
      }, USER_ID);

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
      prisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, limite_propiedades: 5 });
      prisma.propiedad.count.mockResolvedValue(5);

      await expect(
        service.create(TENANT_ID, { titulo: 'Test', tipo: 'CASA', gestion: 'VENTA' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si tenant no existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, { titulo: 'Test', tipo: 'CASA', gestion: 'VENTA' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe generar código con prefijo del tipo (APAR para APARTAMENTO)', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.propiedad.count.mockResolvedValue(7);
      prisma.propiedad.create.mockResolvedValue({ ...mockPropiedad, codigo: 'APAR-0008' });

      await service.create(TENANT_ID, {
        titulo: 'Apartamento en Z10',
        tipo: 'APARTAMENTO',
        gestion: 'RENTA',
      }, USER_ID);

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
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
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

      await expect(
        service.findOne(TENANT_ID, 'no-existe'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── CAMBIAR ESTADO (State Machine) ────────────────────────

  describe('cambiarEstado', () => {
    it('debe permitir BORRADOR → DISPONIBLE', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'BORRADOR' });
      prisma.propiedad.update.mockResolvedValue({ ...mockPropiedad, estado: 'DISPONIBLE' });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'DISPONIBLE' });

      expect(result.estado).toBe('DISPONIBLE');
    });

    it('debe rechazar BORRADOR → VENDIDA (no permitida)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'BORRADOR' });

      await expect(
        service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'VENDIDA' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir DISPONIBLE → RESERVADA', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'DISPONIBLE' });
      prisma.propiedad.update.mockResolvedValue({ ...mockPropiedad, estado: 'RESERVADA' });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'RESERVADA' });

      expect(result.estado).toBe('RESERVADA');
    });

    it('debe rechazar DISPONIBLE → VENDIDA (debe pasar por EN_NEGOCIACION)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'DISPONIBLE' });

      await expect(
        service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'VENDIDA' }),
      ).rejects.toThrow(/Transición inválida/);
    });

    it('debe permitir EN_NEGOCIACION → VENDIDA', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'EN_NEGOCIACION' });
      prisma.propiedad.update.mockResolvedValue({ ...mockPropiedad, estado: 'VENDIDA' });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'VENDIDA' });

      expect(result.estado).toBe('VENDIDA');
    });

    it('VENDIDA es estado terminal (no permite transiciones)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'VENDIDA' });

      await expect(
        service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'DISPONIBLE' }),
      ).rejects.toThrow(/ninguna \(estado terminal\)/);
    });

    it('debe permitir RENTADA → DISPONIBLE (re-listar)', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'RENTADA' });
      prisma.propiedad.update.mockResolvedValue({ ...mockPropiedad, estado: 'DISPONIBLE' });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'DISPONIBLE' });

      expect(result.estado).toBe('DISPONIBLE');
    });

    it('debe permitir SUSPENDIDA → BORRADOR', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({ ...mockPropiedad, estado: 'SUSPENDIDA' });
      prisma.propiedad.update.mockResolvedValue({ ...mockPropiedad, estado: 'BORRADOR' });

      const result = await service.cambiarEstado(TENANT_ID, 'prop-001', { nuevoEstado: 'BORRADOR' });

      expect(result.estado).toBe('BORRADOR');
    });
  });

  // ─── STATS ──────────────────────────────────────────────────

  describe('getStats', () => {
    it('debe retornar estadísticas agrupadas', async () => {
      prisma.propiedad.count.mockResolvedValue(10);
      prisma.propiedad.groupBy
        .mockResolvedValueOnce([{ estado: 'DISPONIBLE', _count: 5 }, { estado: 'BORRADOR', _count: 3 }])
        .mockResolvedValueOnce([{ tipo: 'CASA', _count: 6 }, { tipo: 'APARTAMENTO', _count: 4 }]);

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
      prisma.propiedad.update.mockResolvedValue({ ...mockPropiedad, titulo: 'Nuevo Titulo' });

      const result = await service.update(TENANT_ID, 'prop-001', { titulo: 'Nuevo Titulo' });

      expect(result.titulo).toBe('Nuevo Titulo');
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prop-001' } }),
      );
    });

    it('debe lanzar NotFoundException si propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'no-existe', { titulo: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
