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

  // ─── ACCIÓN DEL CLIENTE (ruta pública, sin JWT) ─────────────

  describe('procesarAccionCliente', () => {
    const TOKEN = 'reschedule-token-abc';
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);

    const visitaConToken = {
      ...mockVisita,
      reschedule_token: TOKEN,
      reschedule_expires: futureExpiry,
    };

    beforeEach(() => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID });
    });

    it('CONFIRMAR: marca la visita como CONFIRMADA y notifica al agente', async () => {
      prisma.visita.findUnique.mockResolvedValue(visitaConToken);
      prisma.visita.update.mockResolvedValue({});

      const result = await service.procesarAccionCliente(TOKEN, {
        accion: 'CONFIRMAR',
      });

      expect(result).toEqual({ success: true, accion: 'CONFIRMAR' });
      expect(prisma.visita.update).toHaveBeenCalledWith({
        where: { id: VISITA_ID },
        data: { estado: 'CONFIRMADA' },
      });
      expect(notificaciones.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'VISITA_AGENDADA', userId: AGENTE_ID }),
      );
    });

    it('CANCELAR: marca CANCELADA, invalida el token y guarda las notas', async () => {
      prisma.visita.findUnique.mockResolvedValue(visitaConToken);
      prisma.visita.update.mockResolvedValue({});

      const result = await service.procesarAccionCliente(TOKEN, {
        accion: 'CANCELAR',
        notas: 'Ya no puedo asistir',
      });

      expect(result).toEqual({ success: true, accion: 'CANCELAR' });
      expect(prisma.visita.update).toHaveBeenCalledWith({
        where: { id: VISITA_ID },
        data: {
          estado: 'CANCELADA',
          reschedule_token: null,
          reschedule_expires: null,
          reschedule_notas: 'Ya no puedo asistir',
        },
      });
    });

    it('REPROGRAMAR: guarda la propuesta cuando fecha_fin > fecha_inicio y es futura', async () => {
      prisma.visita.findUnique.mockResolvedValue(visitaConToken);
      prisma.visita.update.mockResolvedValue({});

      const nuevaInicio = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const nuevaFin = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000,
      ).toISOString();

      const result = await service.procesarAccionCliente(TOKEN, {
        accion: 'REPROGRAMAR',
        fecha_inicio: nuevaInicio,
        fecha_fin: nuevaFin,
      });

      expect(result).toEqual({ success: true, accion: 'REPROGRAMAR' });
      expect(prisma.visita.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: VISITA_ID },
          data: expect.objectContaining({
            reschedule_propuesta_inicio: new Date(nuevaInicio),
            reschedule_propuesta_fin: new Date(nuevaFin),
          }),
        }),
      );
    });

    it('REPROGRAMAR: rechaza si falta fecha_inicio o fecha_fin', async () => {
      prisma.visita.findUnique.mockResolvedValue(visitaConToken);

      await expect(
        service.procesarAccionCliente(TOKEN, { accion: 'REPROGRAMAR' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('REPROGRAMAR: rechaza si fecha_fin no es posterior a fecha_inicio', async () => {
      prisma.visita.findUnique.mockResolvedValue(visitaConToken);
      const inicio = new Date(Date.now() + 86400000).toISOString();

      await expect(
        service.procesarAccionCliente(TOKEN, {
          accion: 'REPROGRAMAR',
          fecha_inicio: inicio,
          fecha_fin: inicio,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('REPROGRAMAR: rechaza si la fecha propuesta no es futura', async () => {
      prisma.visita.findUnique.mockResolvedValue(visitaConToken);
      const pasado = new Date(Date.now() - 86400000).toISOString();
      const pasadoFin = new Date(Date.now() - 82800000).toISOString();

      await expect(
        service.procesarAccionCliente(TOKEN, {
          accion: 'REPROGRAMAR',
          fecha_inicio: pasado,
          fecha_fin: pasadoFin,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza con NotFoundException si el token no corresponde a ninguna visita', async () => {
      prisma.visita.findUnique.mockResolvedValue(null);

      await expect(
        service.procesarAccionCliente('token-invalido', {
          accion: 'CONFIRMAR',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el enlace ya expiró', async () => {
      prisma.visita.findUnique.mockResolvedValue({
        ...visitaConToken,
        reschedule_expires: new Date(Date.now() - 60 * 60 * 1000),
      });

      await expect(
        service.procesarAccionCliente(TOKEN, { accion: 'CONFIRMAR' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si la visita ya fue cancelada', async () => {
      prisma.visita.findUnique.mockResolvedValue({
        ...visitaConToken,
        estado: 'CANCELADA',
      });

      await expect(
        service.procesarAccionCliente(TOKEN, { accion: 'CONFIRMAR' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
