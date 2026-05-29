import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PipelineService } from '../pipeline.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { EmailService } from '../../email/email.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';

const mockCliente = { id: 'cli-001', tenant_id: TENANT_ID, nombre: 'Carlos' };
const mockPropiedad = { id: 'prop-001', tenant_id: TENANT_ID, titulo: 'Casa Z14', codigo: 'CASA-0001' };

const AGENTE_ID = 'agent-001';
const OTRO_AGENTE_ID = 'agent-002';

const mockInteres = {
  id: 'int-001',
  cliente_id: 'cli-001',
  propiedad_id: 'prop-001',
  estado: 'NUEVO',
  nivel_interes: 'MEDIO',
  notas: null,
  motivo_perdida: null,
  fecha_contacto: null,
  fecha_cierre: null,
  cliente: { id: 'cli-001', nombre: 'Carlos', tenant_id: TENANT_ID, agente_id: AGENTE_ID },
  propiedad: { id: 'prop-001', titulo: 'Casa Z14', codigo: 'CASA-0001' },
};

describe('PipelineService', () => {
  let service: PipelineService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    // Pass prisma itself as the transaction client so inner mocks resolve correctly
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined), deleteByPattern: jest.fn().mockResolvedValue(undefined) } },
        { provide: EmailService, useValue: { send: jest.fn().mockResolvedValue(undefined), sendClientEmail: jest.fn().mockResolvedValue(undefined) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();
    service = module.get<PipelineService>(PipelineService);
  });

  // ─── CREAR INTERÉS ──────────────────────────────────────────

  describe('crearInteres', () => {
    it('debe vincular cliente con propiedad', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);
      prisma.clientePropiedad.findFirst.mockResolvedValue(null);
      prisma.clientePropiedad.create.mockResolvedValue(mockInteres);

      const result = await service.crearInteres(TENANT_ID, {
        clienteId: 'cli-001', propiedadId: 'prop-001',
      });

      expect(result.estado).toBe('NUEVO');
    });

    it('debe rechazar duplicado cliente+propiedad', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.propiedad.findFirst.mockResolvedValue(mockPropiedad);
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);

      await expect(
        service.crearInteres(TENANT_ID, { clienteId: 'cli-001', propiedadId: 'prop-001' }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe rechazar si cliente no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.crearInteres(TENANT_ID, { clienteId: 'no', propiedadId: 'prop-001' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si propiedad no existe', async () => {
      prisma.cliente.findFirst.mockResolvedValue(mockCliente);
      prisma.propiedad.findFirst.mockResolvedValue(null);

      await expect(
        service.crearInteres(TENANT_ID, { clienteId: 'cli-001', propiedadId: 'no' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── MÁQUINA DE ESTADOS ─────────────────────────────────────

  describe('cambiarEstado', () => {
    it('NUEVO → CONTACTADO', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'CONTACTADO' });

      const result = await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'CONTACTADO' }, 'ADMIN', AGENTE_ID, null);

      expect(result.estado).toBe('CONTACTADO');
    });

    it('CONTACTADO → INTERESADO', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'CONTACTADO' });
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'INTERESADO' });

      const result = await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'INTERESADO' }, 'ADMIN', AGENTE_ID, null);

      expect(result.estado).toBe('INTERESADO');
    });

    it('INTERESADO → EN_NEGOCIACION (reserva propiedad)', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'INTERESADO' });
      prisma.propiedad.findUnique.mockResolvedValue({ estado: 'DISPONIBLE' });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'EN_NEGOCIACION' });

      const result = await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'EN_NEGOCIACION' }, 'ADMIN', AGENTE_ID, null);

      expect(result.estado).toBe('EN_NEGOCIACION');
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'RESERVADA' } }),
      );
    });

    it('CIERRE → GANADO (cierra propiedad como VENDIDA)', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'CIERRE' });
      prisma.propiedad.findUnique.mockResolvedValue({ gestion: 'VENTA', precio_venta: 150000, precio_renta: null, comision_porcentaje: 3 });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'GANADO' });

      const result = await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'GANADO' }, 'ADMIN', AGENTE_ID, null);

      expect(result.estado).toBe('GANADO');
      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'VENDIDA' } }),
      );
    });

    it('GANADO es terminal (no permite transiciones)', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'GANADO' });

      await expect(
        service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'NUEVO' }, 'ADMIN', AGENTE_ID, null),
      ).rejects.toThrow(/estado terminal/);
    });

    it('rechaza NUEVO → GANADO (salto)', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);

      await expect(
        service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'GANADO' }, 'ADMIN', AGENTE_ID, null),
      ).rejects.toThrow(BadRequestException);
    });

    it('PERDIDO requiere motivo', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);

      await expect(
        service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'PERDIDO' }, 'ADMIN', AGENTE_ID, null),
      ).rejects.toThrow(/motivo de pérdida/);
    });

    it('NUEVO → PERDIDO con motivo', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'PERDIDO' });

      const result = await service.cambiarEstado(TENANT_ID, 'int-001', {
        nuevoEstado: 'PERDIDO', motivoPerdida: 'No le gustó la zona',
      }, 'ADMIN', AGENTE_ID, null);

      expect(result.estado).toBe('PERDIDO');
    });

    it('PERDIDO → NUEVO (reapertura)', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'PERDIDO' });
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'NUEVO' });

      const result = await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'NUEVO' }, 'ADMIN', AGENTE_ID, null);

      expect(result.estado).toBe('NUEVO');
    });
  });

  // ─── CONCURRENCIA EN NEGOCIACIÓN ────────────────────────────

  describe('cambiarEstado — concurrencia propiedad', () => {
    it('rechaza EN_NEGOCIACION si propiedad no está DISPONIBLE', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'INTERESADO' });
      prisma.propiedad.findUnique.mockResolvedValue({ estado: 'RESERVADA' });

      await expect(
        service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'EN_NEGOCIACION' }, 'ADMIN', AGENTE_ID, null),
      ).rejects.toThrow(ConflictException);
    });

    it('CIERRE → GANADO cierra propiedad como RENTADA cuando gestion=RENTA', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'CIERRE' });
      prisma.propiedad.findUnique.mockResolvedValue({ gestion: 'RENTA', precio_renta: 5000, precio_venta: null, comision_porcentaje: 10 });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'GANADO' });

      await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'GANADO' }, 'ADMIN', AGENTE_ID, null);

      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'RENTADA' } }),
      );
    });

    it('GANADO calcula comisión desde precio de lista', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'CIERRE' });
      prisma.propiedad.findUnique.mockResolvedValue({
        gestion: 'VENTA', precio_venta: 200000, precio_renta: null, comision_porcentaje: 5,
      });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'GANADO' });

      await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'GANADO' }, 'ADMIN', AGENTE_ID, null);

      const updateCall = prisma.clientePropiedad.update.mock.calls[0][0];
      expect(updateCall.data.precio_cierre).toBe(200000);
      expect(updateCall.data.comision_calculada).toBe(10000); // 200000 * 5%
    });

    it('GANADO usa precio acordado del agente cuando se envía', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'CIERRE' });
      prisma.propiedad.findUnique.mockResolvedValue({
        gestion: 'VENTA', precio_venta: 200000, precio_renta: null, comision_porcentaje: 3,
      });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'GANADO' });

      await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'GANADO', precioAcordado: 190000 }, 'ADMIN', AGENTE_ID, null);

      const updateCall = prisma.clientePropiedad.update.mock.calls[0][0];
      expect(updateCall.data.precio_cierre).toBe(190000);
      expect(updateCall.data.comision_calculada).toBe(5700); // 190000 * 3%
    });

    it('GANADO sin comision_porcentaje no guarda comision_calculada', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'CIERRE' });
      prisma.propiedad.findUnique.mockResolvedValue({
        gestion: 'VENTA', precio_venta: 100000, precio_renta: null, comision_porcentaje: null,
      });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'GANADO' });

      await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'GANADO' }, 'ADMIN', AGENTE_ID, null);

      const updateCall = prisma.clientePropiedad.update.mock.calls[0][0];
      expect(updateCall.data.comision_calculada).toBeUndefined();
    });

    it('EN_NEGOCIACION → PERDIDO libera propiedad a DISPONIBLE', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'EN_NEGOCIACION' });
      prisma.propiedad.update.mockResolvedValue({});
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'PERDIDO' });

      await service.cambiarEstado(TENANT_ID, 'int-001', {
        nuevoEstado: 'PERDIDO', motivoPerdida: 'Cliente desistió',
      }, 'ADMIN', AGENTE_ID, null);

      expect(prisma.propiedad.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: 'DISPONIBLE' } }),
      );
    });

    it('propiedad no encontrada en EN_NEGOCIACION lanza NotFoundException', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue({ ...mockInteres, estado: 'INTERESADO' });
      prisma.propiedad.findUnique.mockResolvedValue(null);

      await expect(
        service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'EN_NEGOCIACION' }, 'ADMIN', AGENTE_ID, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('transiciones sin efecto en propiedad no llaman a propiedad.update', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres); // NUEVO
      prisma.clientePropiedad.update.mockResolvedValue({ ...mockInteres, estado: 'CONTACTADO' });

      await service.cambiarEstado(TENANT_ID, 'int-001', { nuevoEstado: 'CONTACTADO' }, 'ADMIN', AGENTE_ID, null);

      expect(prisma.propiedad.update).not.toHaveBeenCalled();
    });
  });

  // ─── PIPELINE ───────────────────────────────────────────────

  describe('getPipeline', () => {
    it('debe agrupar por estado', async () => {
      prisma.clientePropiedad.findMany.mockResolvedValue([
        { ...mockInteres, estado: 'NUEVO' },
        { ...mockInteres, id: 'int-002', estado: 'CONTACTADO' },
        { ...mockInteres, id: 'int-003', estado: 'NUEVO' },
      ]);

      const result = await service.getPipeline(TENANT_ID);

      expect(result.NUEVO).toHaveLength(2);
      expect(result.CONTACTADO).toHaveLength(1);
      expect(result.GANADO).toHaveLength(0);
    });
  });
});
