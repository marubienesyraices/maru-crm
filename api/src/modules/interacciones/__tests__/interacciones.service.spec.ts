import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InteraccionesService } from '../interacciones.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const USUARIO_ID = 'user-001';
const INTERES_ID = 'interes-001';
const INTERACCION_ID = 'interaccion-001';

const mockInteres = {
  id: INTERES_ID,
  cliente: { tenant_id: TENANT_ID },
};

const mockInteraccion = {
  id: INTERACCION_ID,
  interes_id: INTERES_ID,
  usuario_id: USUARIO_ID,
  tipo: 'LLAMADA',
  resultado: 'POSITIVO',
  notas: 'Cliente interesado',
  duracion_min: 15,
  fecha: new Date('2026-05-02T14:00:00Z'),
  created_at: new Date(),
  updated_at: new Date(),
  usuario: { id: USUARIO_ID, nombre: 'Ana López' },
};

describe('InteraccionesService', () => {
  let service: InteraccionesService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteraccionesService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'NotificacionesService', useValue: { create: jest.fn() } },
        {
          provide:
            require('../../../modules/notificaciones/notificaciones.service')
              .NotificacionesService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<InteraccionesService>(InteraccionesService);
  });

  // ─── CREATE ────────────────────────────────────────────────

  describe('create', () => {
    it('crea una interacción de tipo LLAMADA', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.interaccion.create.mockResolvedValue(mockInteraccion);

      const result = await service.create(TENANT_ID, USUARIO_ID, {
        interesId: INTERES_ID,
        tipo: 'LLAMADA',
        resultado: 'POSITIVO',
        notas: 'Cliente interesado',
        duracionMin: 15,
      });

      expect(result.tipo).toBe('LLAMADA');
      expect(prisma.interaccion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interes_id: INTERES_ID,
            usuario_id: USUARIO_ID,
            tipo: 'LLAMADA',
            resultado: 'POSITIVO',
          }),
        }),
      );
    });

    it('usa NEUTRO como resultado por defecto', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.interaccion.create.mockResolvedValue({
        ...mockInteraccion,
        resultado: 'NEUTRO',
      });

      await service.create(TENANT_ID, USUARIO_ID, {
        interesId: INTERES_ID,
        tipo: 'NOTA',
      });

      expect(prisma.interaccion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resultado: 'NEUTRO' }),
        }),
      );
    });

    it('usa fecha personalizada si se provee', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.interaccion.create.mockResolvedValue(mockInteraccion);

      await service.create(TENANT_ID, USUARIO_ID, {
        interesId: INTERES_ID,
        tipo: 'VISITA',
        fecha: '2026-05-01T10:00:00Z',
      });

      const createCall = prisma.interaccion.create.mock.calls[0][0];
      expect(createCall.data.fecha).toEqual(new Date('2026-05-01T10:00:00Z'));
    });

    it('lanza NotFoundException si el trámite no pertenece al tenant', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, USUARIO_ID, {
          interesId: 'otro',
          tipo: 'LLAMADA',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FIND ──────────────────────────────────────────────────

  describe('findByInteres', () => {
    it('devuelve interacciones ordenadas por fecha descendente', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.interaccion.findMany.mockResolvedValue([mockInteraccion]);

      const result = await service.findByInteres(TENANT_ID, INTERES_ID);

      expect(result).toHaveLength(1);
      expect(prisma.interaccion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fecha: 'desc' } }),
      );
    });

    it('lanza NotFoundException si el trámite no pertenece al tenant', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(null);

      await expect(service.findByInteres(TENANT_ID, 'otro')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── DELETE ────────────────────────────────────────────────

  describe('delete', () => {
    it('elimina una interacción existente', async () => {
      prisma.interaccion.findFirst.mockResolvedValue({
        id: INTERACCION_ID,
        interes: { cliente: { tenant_id: TENANT_ID } },
      });
      prisma.interaccion.delete.mockResolvedValue({});

      const result = await service.delete(TENANT_ID, INTERACCION_ID);

      expect(result.deleted).toBe(true);
    });

    it('lanza NotFoundException si no existe o es de otro tenant', async () => {
      prisma.interaccion.findFirst.mockResolvedValue(null);

      await expect(service.delete(TENANT_ID, 'no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
