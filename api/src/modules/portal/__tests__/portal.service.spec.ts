import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PortalService } from '../portal.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';
const OTHER_TENANT_ID = 'tenant-002';

const mockEmailService = { sendHtml: jest.fn().mockResolvedValue(undefined) };
const mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
const mockJwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

describe('PortalService', () => {
  let service: PortalService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<PortalService>(PortalService);
  });

  // ─── findPublicProperties ───────────────────────────────────────
  // Regresión directa del bug `TENANT_ID ?? filtros.tenantId`: docker-compose
  // interpola PORTAL_TENANT_ID como "" cuando no está definida, "" no es
  // null/undefined así que `??` nunca caía al filtros.tenantId real — el
  // listado público mezclaba propiedades de todos los tenants.

  describe('findPublicProperties', () => {
    it('filtra por tenantId cuando se pasa explícitamente (vista portal por defecto)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID } as any);

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'DISPONIBLE',
            mostrar_en_portal: true,
            tenant_id: TENANT_ID,
          }),
        }),
      );
    });

    it('NO filtra por tenant si no se pasa tenantId (comportamiento esperado sin PORTAL_TENANT_ID)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({} as any);

      const where = prisma.propiedad.findMany.mock.calls[0][0].where;
      expect(where.tenant_id).toBeUndefined();
    });

    it('con vista=mapa_crm filtra por mostrar_en_mapa_crm en vez de mostrar_en_portal', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID, vista: 'mapa_crm' } as any);

      const where = prisma.propiedad.findMany.mock.calls[0][0].where;
      expect(where.mostrar_en_mapa_crm).toBe(true);
      expect(where.mostrar_en_portal).toBeUndefined();
    });

    it('dos tenants distintos nunca comparten resultados (aislamiento multi-tenant)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID } as any);
      const whereA = prisma.propiedad.findMany.mock.calls[0][0].where;

      await service.findPublicProperties({ tenantId: OTHER_TENANT_ID } as any);
      const whereB = prisma.propiedad.findMany.mock.calls[1][0].where;

      expect(whereA.tenant_id).toBe(TENANT_ID);
      expect(whereB.tenant_id).toBe(OTHER_TENANT_ID);
      expect(whereA.tenant_id).not.toBe(whereB.tenant_id);
    });

    it('aplica paginación con valores por defecto (page 1, limit 12)', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      const result = await service.findPublicProperties({ tenantId: TENANT_ID } as any);

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 12 }),
      );
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 12, totalPages: 0 });
    });

    it('calcula skip correctamente para páginas > 1 y respeta limit', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(50);

      const result = await service.findPublicProperties({ tenantId: TENANT_ID, page: 3, limit: 10 } as any);

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(5);
    });

    it('limita el tamaño de página a 500 aunque se pida más', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID, limit: 9999 } as any);

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });

    it('aplica filtro de tipo y gestión', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID, tipo: 'CASA', gestion: 'VENTA' } as any);

      expect(prisma.propiedad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tipo: 'CASA', gestion: 'VENTA' }) }),
      );
    });

    it('aplica rango de precio con precioMin y precioMax sobre venta y renta', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID, precioMin: 100000, precioMax: 500000 } as any);

      const where = prisma.propiedad.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { precio_venta: { gte: 100000, lte: 500000 } },
        { precio_renta: { gte: 100000, lte: 500000 } },
      ]);
    });

    it('la búsqueda de texto abarca título, código, descripción, zona, municipio y departamento', async () => {
      prisma.propiedad.findMany.mockResolvedValue([]);
      prisma.propiedad.count.mockResolvedValue(0);

      await service.findPublicProperties({ tenantId: TENANT_ID, busqueda: 'zona 14' } as any);

      const where = prisma.propiedad.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(6);
      expect(where.OR).toContainEqual({ titulo: { contains: 'zona 14', mode: 'insensitive' } });
    });
  });

  // ─── findPublicProperty ──────────────────────────────────────────

  describe('findPublicProperty', () => {
    const mockProp = {
      id: 'prop-001',
      latitud: 14.6,
      longitud: -90.5,
      tenant: { nombre: 'Test Co', logo_url: null, plan: 'PRO' },
    };

    it('lanza NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);

      await expect(service.findPublicProperty('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('filtra por mostrar_en_portal por defecto', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockProp);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: true });

      await service.findPublicProperty('prop-001');

      expect(prisma.propiedad.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ mostrar_en_portal: true }) }),
      );
    });

    it('con vista=mapa_crm filtra por mostrar_en_mapa_crm', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockProp);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: true });

      await service.findPublicProperty('prop-001', 'mapa_crm');

      expect(prisma.propiedad.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ mostrar_en_mapa_crm: true }) }),
      );
    });

    it('oculta latitud/longitud si el plan del tenant no incluye mapas', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockProp);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: false });

      const result = await service.findPublicProperty('prop-001');

      expect(result.latitud).toBeNull();
      expect(result.longitud).toBeNull();
    });

    it('conserva latitud/longitud si el plan del tenant incluye mapas', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(mockProp);
      prisma.catalogoPlan.findUnique.mockResolvedValue({ tiene_mapas: true });

      const result = await service.findPublicProperty('prop-001');

      expect(result.latitud).toBe(14.6);
      expect(result.longitud).toBe(-90.5);
    });
  });

  // ─── registrarCliente ────────────────────────────────────────────

  describe('registrarCliente', () => {
    it('lanza BadRequestException si no hay propiedad_id ni PORTAL_TENANT_ID configurado', async () => {
      await expect(
        service.registrarCliente({ nombre: 'Juan', email: 'juan@test.com' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findUnique.mockResolvedValue(null);

      await expect(
        service.registrarCliente({ nombre: 'Juan', email: 'juan@test.com', propiedad_id: 'prop-001' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si la propiedad ya está VENDIDA', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID, estado: 'VENDIDA' });

      await expect(
        service.registrarCliente({ nombre: 'Juan', email: 'juan@test.com', propiedad_id: 'prop-001' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea un cliente nuevo y envía email de verificación', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID, estado: 'DISPONIBLE' });
      prisma.cliente.findUnique.mockResolvedValue(null);
      prisma.cliente.create.mockResolvedValue({ id: 'cli-001', tenant_id: TENANT_ID });
      prisma.clientePropiedad.create.mockResolvedValue({});

      const result = await service.registrarCliente({
        nombre: 'Juan', email: 'juan@test.com', propiedad_id: 'prop-001',
      } as any);

      expect(prisma.cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenant_id: TENANT_ID, email: 'juan@test.com' }) }),
      );
      expect(mockEmailService.sendHtml).toHaveBeenCalled();
      expect(result.message).toMatch(/Revisa tu correo/);
    });

    it('no revela si el email ya existe (previene enumeración) y reenvía token si no está verificado', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID, estado: 'DISPONIBLE' });
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cli-001', nombre: 'Juan', portal_verificado: false });
      prisma.cliente.update.mockResolvedValue({});

      const result = await service.registrarCliente({
        nombre: 'Juan', email: 'juan@test.com', propiedad_id: 'prop-001',
      } as any);

      expect(prisma.cliente.update).toHaveBeenCalled();
      expect(mockEmailService.sendHtml).toHaveBeenCalled();
      expect(result.message).toMatch(/Revisa tu correo/);
    });

    it('no reenvía email si el cliente existente ya está verificado', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID, estado: 'DISPONIBLE' });
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cli-001', nombre: 'Juan', portal_verificado: true });

      await service.registrarCliente({ nombre: 'Juan', email: 'juan@test.com', propiedad_id: 'prop-001' } as any);

      expect(prisma.cliente.update).not.toHaveBeenCalled();
      expect(mockEmailService.sendHtml).not.toHaveBeenCalled();
    });
  });

  // ─── verificarEmail ──────────────────────────────────────────────

  describe('verificarEmail', () => {
    it('lanza BadRequestException si el token no existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.verificarEmail('token-invalido')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el token expiró', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-001', nombre: 'Juan', activation_expires: new Date(Date.now() - 1000),
      });

      await expect(service.verificarEmail('token-viejo')).rejects.toThrow(BadRequestException);
    });

    it('marca al cliente como verificado y limpia el token', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-001', nombre: 'Juan', activation_expires: new Date(Date.now() + 60_000),
      });
      prisma.cliente.update.mockResolvedValue({});

      const result = await service.verificarEmail('token-valido');

      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 'cli-001' },
        data: { activation_token: null, activation_expires: null, portal_verificado: true },
      });
      expect(result).toEqual({ success: true, nombre: 'Juan' });
    });
  });

  // ─── solicitarAcceso ─────────────────────────────────────────────

  describe('solicitarAcceso', () => {
    it('filtra por tenantId cuando se provee', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      await service.solicitarAcceso('juan@test.com', TENANT_ID);

      expect(prisma.cliente.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'juan@test.com', tenant_id: TENANT_ID } }),
      );
    });

    it('responde igual si el cliente no existe (previene enumeración de emails)', async () => {
      prisma.cliente.findFirst.mockResolvedValue(null);

      const result = await service.solicitarAcceso('no-existe@test.com', TENANT_ID);

      expect(result.message).toMatch(/Si tu correo está registrado/);
      expect(mockEmailService.sendHtml).not.toHaveBeenCalled();
    });

    it('envía magic link si el cliente ya está verificado', async () => {
      prisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-001', nombre: 'Juan', email: 'juan@test.com', tenant_id: TENANT_ID, portal_verificado: true,
      });
      prisma.cliente.update.mockResolvedValue({});

      await service.solicitarAcceso('juan@test.com', TENANT_ID);

      expect(mockEmailService.sendHtml).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('acceso') }),
      );
    });

    it('envía email de verificación si el cliente aún no está verificado', async () => {
      prisma.cliente.findFirst.mockResolvedValue({
        id: 'cli-001', nombre: 'Juan', email: 'juan@test.com', tenant_id: TENANT_ID, portal_verificado: false,
      });
      prisma.cliente.update.mockResolvedValue({});

      await service.solicitarAcceso('juan@test.com', TENANT_ID);

      expect(mockEmailService.sendHtml).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('Confirma') }),
      );
    });
  });

  // ─── accederConToken ─────────────────────────────────────────────

  describe('accederConToken', () => {
    it('lanza BadRequestException con token inválido o expirado', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.accederConToken('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('emite un JWT y limpia el token de un solo uso', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-001', nombre: 'Juan', email: 'juan@test.com', tenant_id: TENANT_ID,
        activation_expires: new Date(Date.now() + 60_000),
      });
      prisma.cliente.update.mockResolvedValue({});

      const result = await service.accederConToken('valid-token');

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ activation_token: null }) }),
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'cli-001', tenantId: TENANT_ID, type: 'cliente' }),
        expect.any(Object),
      );
      expect(result.token).toBe('signed.jwt.token');
    });
  });

  // ─── googleAuth ──────────────────────────────────────────────────

  describe('googleAuth', () => {
    const originalFetch = global.fetch;
    afterEach(() => { global.fetch = originalFetch; });

    it('lanza BadRequestException sin credential', async () => {
      await expect(service.googleAuth('')).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si Google rechaza la credencial', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;

      await expect(service.googleAuth('bad-cred', TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el email de Google no está verificado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ email: 'juan@test.com', email_verified: 'false' }),
      }) as any;

      await expect(service.googleAuth('cred', TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si no hay tenantId resoluble', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ email: 'juan@test.com', email_verified: 'true' }),
      }) as any;

      await expect(service.googleAuth('cred')).rejects.toThrow(BadRequestException);
    });

    it('crea un cliente nuevo ya verificado si no existía', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ email: 'juan@test.com', name: 'Juan', email_verified: 'true' }),
      }) as any;
      prisma.cliente.findUnique.mockResolvedValue(null);
      prisma.cliente.create.mockResolvedValue({ id: 'cli-001', nombre: 'Juan', tenant_id: TENANT_ID, email: 'juan@test.com' });

      const result = await service.googleAuth('cred', TENANT_ID);

      expect(prisma.cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ portal_verificado: true, tenant_id: TENANT_ID }) }),
      );
      expect(result.token).toBe('signed.jwt.token');
    });

    it('marca como verificado a un cliente existente que no lo estaba', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, json: async () => ({ email: 'juan@test.com', email_verified: 'true' }),
      }) as any;
      prisma.cliente.findUnique.mockResolvedValue({
        id: 'cli-001', nombre: 'Juan', tenant_id: TENANT_ID, email: 'juan@test.com', portal_verificado: false,
      });
      prisma.cliente.update.mockResolvedValue({});

      await service.googleAuth('cred', TENANT_ID);

      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { portal_verificado: true } }),
      );
    });
  });

  // ─── crearLeadChatbot ────────────────────────────────────────────

  describe('crearLeadChatbot', () => {
    it('lanza BadRequestException si no se puede determinar el tenant', async () => {
      await expect(
        service.crearLeadChatbot({ nombre: 'Juan' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('resuelve el tenant desde la propiedad si se provee propiedad_id', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID });
      prisma.cliente.create.mockResolvedValue({ id: 'cli-001' });
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.notificacion.createMany.mockResolvedValue({});

      const result = await service.crearLeadChatbot({ nombre: 'Juan', propiedad_id: 'prop-001' } as any);

      expect(prisma.cliente.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenant_id: TENANT_ID }) }),
      );
      expect(result.success).toBe(true);
    });

    it('actualiza un cliente existente en vez de duplicarlo cuando el email ya existe', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID });
      prisma.cliente.findUnique.mockResolvedValue({ id: 'cli-existente', telefono: null, gestion_interes: null, zona_interes: null, presupuesto_max: null });
      prisma.cliente.update.mockResolvedValue({});
      prisma.configSeguridad.findUnique.mockResolvedValue(null);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.notificacion.createMany.mockResolvedValue({});

      const result = await service.crearLeadChatbot({
        nombre: 'Juan', email: 'juan@test.com', propiedad_id: 'prop-001',
      } as any);

      expect(prisma.cliente.create).not.toHaveBeenCalled();
      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cli-existente' } }),
      );
      expect(result.clienteId).toBe('cli-existente');
    });

    it('modo RoundRobin asigna al agente que nunca ha recibido un lead', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID });
      prisma.cliente.create.mockResolvedValue({ id: 'cli-001' });
      prisma.configSeguridad.findUnique.mockResolvedValue({ modo_asignacion_leads: 'RoundRobin' });
      prisma.user.findMany
        .mockResolvedValueOnce([{ id: 'agent-1', rol: 'SENIOR' }, { id: 'agent-2', rol: 'JUNIOR' }]) // activeAgents
        .mockResolvedValueOnce([]); // admins notify (not used here since assignedAgentId set)
      prisma.cliente.groupBy.mockResolvedValue([{ agente_id: 'agent-1', _count: { agente_id: 3 } }]);
      prisma.cliente.update.mockResolvedValue({});
      prisma.notificacion.createMany.mockResolvedValue({});

      const result = await service.crearLeadChatbot({ nombre: 'Juan', propiedad_id: 'prop-001' } as any);

      expect(result.asignadoA).toBe('agent-2'); // agent-2 nunca ha recibido lead
      expect(prisma.cliente.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { agente_id: 'agent-2' } }),
      );
    });

    it('sin agentes activos y modo Manual notifica a todos los ADMIN', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ tenant_id: TENANT_ID });
      prisma.cliente.create.mockResolvedValue({ id: 'cli-001' });
      prisma.configSeguridad.findUnique.mockResolvedValue({ modo_asignacion_leads: 'Manual' });
      prisma.user.findMany
        .mockResolvedValueOnce([]) // activeAgents
        .mockResolvedValueOnce([{ id: 'admin-1' }, { id: 'admin-2' }]); // ADMIN notify list
      prisma.notificacion.createMany.mockResolvedValue({});

      const result = await service.crearLeadChatbot({ nombre: 'Juan', propiedad_id: 'prop-001' } as any);

      expect(result.asignadoA).toBeNull();
      expect(prisma.notificacion.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ user_id: 'admin-1' }),
          expect.objectContaining({ user_id: 'admin-2' }),
        ]),
      });
    });
  });

  // ─── Favoritos / búsquedas guardadas ─────────────────────────────

  describe('favoritos y búsquedas guardadas', () => {
    it('addFavorito lanza NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findUnique.mockResolvedValue(null);

      await expect(service.addFavorito('cli-001', TENANT_ID, 'prop-x')).rejects.toThrow(NotFoundException);
    });

    it('addFavorito hace upsert cuando la propiedad existe', async () => {
      prisma.propiedad.findUnique.mockResolvedValue({ id: 'prop-001' });
      prisma.favorito.upsert.mockResolvedValue({});

      const result = await service.addFavorito('cli-001', TENANT_ID, 'prop-001');

      expect(prisma.favorito.upsert).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('removeFavorito elimina por cliente y propiedad', async () => {
      prisma.favorito.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeFavorito('cli-001', 'prop-001');

      expect(prisma.favorito.deleteMany).toHaveBeenCalledWith({
        where: { cliente_id: 'cli-001', propiedad_id: 'prop-001' },
      });
      expect(result).toEqual({ success: true });
    });

    it('deleteBusquedaGuardada lanza NotFoundException si no pertenece al cliente', async () => {
      prisma.busquedaGuardada.findFirst.mockResolvedValue(null);

      await expect(service.deleteBusquedaGuardada('cli-001', 'b-1')).rejects.toThrow(NotFoundException);
    });

    it('deleteBusquedaGuardada elimina cuando sí pertenece al cliente', async () => {
      prisma.busquedaGuardada.findFirst.mockResolvedValue({ id: 'b-1' });
      prisma.busquedaGuardada.delete.mockResolvedValue({});

      const result = await service.deleteBusquedaGuardada('cli-001', 'b-1');

      expect(result).toEqual({ deleted: true });
    });
  });

  // ─── getDefaultBranding ──────────────────────────────────────────

  describe('getDefaultBranding', () => {
    it('devuelve el primer tenant activo cuando existe', async () => {
      prisma.tenant.findFirst.mockResolvedValue({ nombre: 'Maru Bienes Raices', logo_url: 'https://x/logo.png' });

      const result = await service.getDefaultBranding();

      expect(result.nombre).toBe('Maru Bienes Raices');
    });

    it('devuelve el branding genérico de GestProp si no hay ningún tenant', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      const result = await service.getDefaultBranding();

      expect(result).toEqual({ nombre: 'GestProp', logo_url: null });
    });
  });
});
