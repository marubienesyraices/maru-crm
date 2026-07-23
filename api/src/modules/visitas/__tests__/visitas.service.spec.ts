import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VisitasService } from '../visitas.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { EmailService } from '../../email/email.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const AGENTE_ID = 'agente-001';
const INTERES_ID = 'interes-001';
const VISITA_ID = 'visita-001';

const mockInteres = {
  id: INTERES_ID,
  cliente: { nombre: 'Juan García', tenant_id: TENANT_ID },
  propiedad: { codigo: 'CASA-0001', titulo: 'Casa en Zona 15' },
};

const INICIO = '2026-05-10T10:00:00Z';
const FIN = '2026-05-10T11:00:00Z';

const mockVisita = {
  id: VISITA_ID,
  interes_id: INTERES_ID,
  agente_id: AGENTE_ID,
  fecha_inicio: new Date(INICIO),
  fecha_fin: new Date(FIN),
  ubicacion: 'Zona 15, Guatemala',
  notas: null,
  estado: 'PENDIENTE',
  interes: {
    cliente: { id: 'c1', nombre: 'Juan García' },
    propiedad: { id: 'p1', titulo: 'Casa en Zona 15', codigo: 'CASA-0001' },
  },
  agente: { id: AGENTE_ID, nombre: 'Ana López' },
};

describe('VisitasService', () => {
  let service: VisitasService;
  let prisma: MockPrismaService;
  let notificaciones: { create: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notificaciones = { create: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitasService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificacionesService, useValue: notificaciones },
        {
          provide: EmailService,
          useValue: {
            sendClientEmail: jest.fn().mockResolvedValue(undefined),
            send: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') },
        },
      ],
    }).compile();

    service = module.get<VisitasService>(VisitasService);
  });

  // ─── CREATE ────────────────────────────────────────────────

  describe('create', () => {
    it('crea una visita correctamente', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.visita.findFirst.mockResolvedValue(null); // sin overlap
      prisma.visita.create.mockResolvedValue(mockVisita);

      const result = await service.create(TENANT_ID, AGENTE_ID, {
        interesId: INTERES_ID,
        fechaInicio: INICIO,
        fechaFin: FIN,
        ubicacion: 'Zona 15, Guatemala',
      });

      expect(result.id).toBe(VISITA_ID);
      expect(prisma.visita.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interes_id: INTERES_ID,
            agente_id: AGENTE_ID,
          }),
        }),
      );
    });

    it('envía notificación al crear', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.visita.findFirst.mockResolvedValue(null);
      prisma.visita.create.mockResolvedValue(mockVisita);

      await service.create(TENANT_ID, AGENTE_ID, {
        interesId: INTERES_ID,
        fechaInicio: INICIO,
        fechaFin: FIN,
      });

      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'VISITA_AGENDADA', userId: AGENTE_ID }),
      );
    });

    it('lanza NotFoundException si el trámite no existe en el tenant', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, AGENTE_ID, {
          interesId: 'x',
          fechaInicio: INICIO,
          fechaFin: FIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si fechaFin <= fechaInicio', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);

      await expect(
        service.create(TENANT_ID, AGENTE_ID, {
          interesId: INTERES_ID,
          fechaInicio: FIN,
          fechaFin: INICIO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException si hay solapamiento de horario', async () => {
      prisma.clientePropiedad.findFirst.mockResolvedValue(mockInteres);
      prisma.visita.findFirst.mockResolvedValue(mockVisita); // overlap encontrado

      await expect(
        service.create(TENANT_ID, AGENTE_ID, {
          interesId: INTERES_ID,
          fechaInicio: INICIO,
          fechaFin: FIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── FIND ALL ──────────────────────────────────────────────

  describe('findAll', () => {
    it('devuelve visitas del tenant sin filtros', async () => {
      prisma.visita.findMany.mockResolvedValue([mockVisita]);

      const result = await service.findAll(TENANT_ID, null, {});

      expect(result).toHaveLength(1);
      expect(prisma.visita.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fecha_inicio: 'asc' } }),
      );
    });

    it('aplica filtro de rango de fechas', async () => {
      prisma.visita.findMany.mockResolvedValue([mockVisita]);

      await service.findAll(TENANT_ID, null, {
        from: '2026-05-10T00:00:00Z',
        to: '2026-05-10T23:59:59Z',
      });

      const call = prisma.visita.findMany.mock.calls[0][0];
      expect(call.where.fecha_inicio).toMatchObject({
        gte: expect.any(Date),
        lte: expect.any(Date),
      });
    });

    it('aplica filtro de visibleUserIds', async () => {
      prisma.visita.findMany.mockResolvedValue([]);

      await service.findAll(TENANT_ID, ['agente-001', 'agente-002'], {});

      const call = prisma.visita.findMany.mock.calls[0][0];
      expect(call.where.agente_id).toEqual({
        in: ['agente-001', 'agente-002'],
      });
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────

  describe('update', () => {
    it('actualiza estado a CONFIRMADA', async () => {
      prisma.visita.findFirst.mockResolvedValue(mockVisita);
      prisma.visita.update.mockResolvedValue({
        ...mockVisita,
        estado: 'CONFIRMADA',
      });

      const result = await service.update(TENANT_ID, VISITA_ID, {
        estado: 'CONFIRMADA',
      });

      expect(result.estado).toBe('CONFIRMADA');
      expect(prisma.visita.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'CONFIRMADA' }),
        }),
      );
    });

    it('lanza NotFoundException si la visita no existe', async () => {
      prisma.visita.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TENANT_ID, 'x', { estado: 'CANCELADA' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('detecta solapamiento al reprogramar', async () => {
      prisma.visita.findFirst
        .mockResolvedValueOnce(mockVisita) // findOne check
        .mockResolvedValueOnce(mockVisita); // overlap check

      await expect(
        service.update(TENANT_ID, VISITA_ID, {
          fechaInicio: INICIO,
          fechaFin: FIN,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── DELETE ────────────────────────────────────────────────

  describe('delete', () => {
    it('elimina una visita existente', async () => {
      prisma.visita.findFirst.mockResolvedValue(mockVisita);
      prisma.visita.delete.mockResolvedValue({});

      const result = await service.delete(TENANT_ID, VISITA_ID);

      expect(result.deleted).toBe(true);
    });

    it('lanza NotFoundException si no existe', async () => {
      prisma.visita.findFirst.mockResolvedValue(null);

      await expect(service.delete(TENANT_ID, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── ICS ───────────────────────────────────────────────────

  describe('generateIcs', () => {
    it('genera un archivo .ics válido', async () => {
      prisma.visita.findFirst.mockResolvedValue(mockVisita);

      const ics = await service.generateIcs(TENANT_ID, VISITA_ID);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain(`UID:${VISITA_ID}@maru.crm`);
      expect(ics).toContain('DTSTART:20260510T100000Z');
      expect(ics).toContain('DTEND:20260510T110000Z');
      expect(ics).toContain('SUMMARY:Visita - CASA-0001');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('lanza NotFoundException si la visita no existe', async () => {
      prisma.visita.findFirst.mockResolvedValue(null);

      await expect(service.generateIcs(TENANT_ID, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
