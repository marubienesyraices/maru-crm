import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PropietariosService } from '../propietarios.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';

const mockPropietario = {
  id: 'owner-001',
  tenant_id: TENANT_ID,
  nombre: 'Roberto Mendez',
  telefono: '50212345678',
  email: 'rmendez@gmail.com',
  dpi: '2345678901234',
  nit: null,
  direccion: null,
  notas: null,
  propiedades: [],
};

describe('PropietariosService', () => {
  let service: PropietariosService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropietariosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PropietariosService>(PropietariosService);
  });

  // ─── CREATE ─────────────────────────────────────────────────

  describe('create', () => {
    it('debe crear propietario exitosamente', async () => {
      prisma.propietario.findFirst.mockResolvedValue(null); // no duplicate
      prisma.propietario.create.mockResolvedValue(mockPropietario);

      const result = await service.create(TENANT_ID, {
        nombre: 'Roberto Mendez',
        dpi: '2345678901234',
        telefono: '50212345678',
        email: 'rmendez@gmail.com',
      });

      expect(result.nombre).toBe('Roberto Mendez');
      expect(prisma.propietario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenant_id: TENANT_ID,
            nombre: 'Roberto Mendez',
            dpi: '2345678901234',
          }),
        }),
      );
    });

    it('debe rechazar DPI duplicado', async () => {
      prisma.propietario.findFirst.mockResolvedValue({
        ...mockPropietario,
        id: 'owner-existing',
        nombre: 'Juan Pérez',
      });

      await expect(
        service.create(TENANT_ID, {
          nombre: 'Roberto Mendez',
          dpi: '2345678901234',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe crear sin DPI (sin validación de duplicados)', async () => {
      prisma.propietario.create.mockResolvedValue({ ...mockPropietario, dpi: null });

      const result = await service.create(TENANT_ID, { nombre: 'Sin DPI' });

      expect(result).toBeDefined();
      // findFirst no debe ser llamado para buscar DPI
      expect(prisma.propietario.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── FIND ALL ───────────────────────────────────────────────

  describe('findAll', () => {
    it('debe retornar propietarios del tenant', async () => {
      prisma.propietario.findMany.mockResolvedValue([mockPropietario]);

      const result = await service.findAll(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(prisma.propietario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenant_id: TENANT_ID },
          orderBy: { nombre: 'asc' },
        }),
      );
    });

    it('debe aplicar búsqueda por nombre', async () => {
      prisma.propietario.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, 'Roberto');

      expect(prisma.propietario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: TENANT_ID,
            OR: expect.arrayContaining([
              { nombre: { contains: 'Roberto', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  // ─── FIND ONE ───────────────────────────────────────────────

  describe('findOne', () => {
    it('debe retornar propietario con propiedades vinculadas', async () => {
      const ownerWithProps = {
        ...mockPropietario,
        propiedades: [{ id: 'prop-001', titulo: 'Casa', codigo: 'CASA-0001', estado: 'DISPONIBLE', tipo: 'CASA' }],
      };
      prisma.propietario.findFirst.mockResolvedValue(ownerWithProps);

      const result = await service.findOne(TENANT_ID, 'owner-001');

      expect(result.propiedades).toHaveLength(1);
      expect(result.propiedades[0].codigo).toBe('CASA-0001');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.propietario.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(TENANT_ID, 'no-existe'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE ─────────────────────────────────────────────────

  describe('update', () => {
    it('debe actualizar propietario exitosamente', async () => {
      prisma.propietario.findFirst
        .mockResolvedValueOnce(mockPropietario)   // findOne check
        .mockResolvedValueOnce(null);              // DPI uniqueness check
      prisma.propietario.update.mockResolvedValue({ ...mockPropietario, telefono: '99999999' });

      const result = await service.update(TENANT_ID, 'owner-001', { telefono: '99999999', dpi: '2345678901234' });

      expect(result.telefono).toBe('99999999');
    });

    it('debe rechazar cambio de DPI si ya existe en otro propietario', async () => {
      prisma.propietario.findFirst
        .mockResolvedValueOnce(mockPropietario)                     // findOne
        .mockResolvedValueOnce({ id: 'owner-other', nombre: 'Otro', dpi: '9999999999999' });  // DPI already exists

      await expect(
        service.update(TENANT_ID, 'owner-001', { dpi: '9999999999999' }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar NotFoundException si propietario no existe', async () => {
      prisma.propietario.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'no-existe', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
