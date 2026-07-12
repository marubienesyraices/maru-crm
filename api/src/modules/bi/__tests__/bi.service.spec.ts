import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { BiService } from '../bi.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { createMockPrismaService, MockPrismaService } from '../../../../test/mocks/prisma.mock';

const TENANT_ID = 'tenant-001';

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  deleteByPattern: jest.fn().mockResolvedValue(undefined),
};

describe('BiService', () => {
  let service: BiService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<BiService>(BiService);
  });

  describe('onModuleInit', () => {
    it('purga las claves de caché legacy con tenantId "undefined"', async () => {
      await service.onModuleInit();
      expect(mockRedis.deleteByPattern).toHaveBeenCalledWith('bi:undefined:*');
    });
  });

  // ─── getResumen ──────────────────────────────────────────────────

  describe('getResumen', () => {
    it('devuelve el resultado cacheado si existe, sin consultar la BD', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ ganados: 99 }));

      const result: any = await service.getResumen(TENANT_ID);

      expect(result.ganados).toBe(99);
      expect(prisma.clientePropiedad.count).not.toHaveBeenCalled();
    });

    it('calcula tasaConversion e ingresosTotales, y guarda en caché', async () => {
      prisma.clientePropiedad.count
        .mockResolvedValueOnce(7)  // ganados
        .mockResolvedValueOnce(3); // perdidos
      prisma.clientePropiedad.aggregate.mockResolvedValue({ _sum: { comision_calculada: 15000 } });
      prisma.visita.count.mockResolvedValue(5);
      prisma.interaccion.count.mockResolvedValue(20);
      prisma.brochureDescarga.count.mockResolvedValue(4);
      prisma.clientePropiedad.groupBy.mockResolvedValue([
        { estado: 'GANADO', _count: { _all: 7 } },
        { estado: 'NUEVO', _count: { _all: 2 } },
      ]);

      const result: any = await service.getResumen(TENANT_ID);

      expect(result.ganados).toBe(7);
      expect(result.perdidos).toBe(3);
      expect(result.tasaConversion).toBe(70); // 7/10
      expect(result.ingresosTotales).toBe(15000);
      expect(result.embudo).toEqual(
        expect.arrayContaining([
          { estado: 'GANADO', count: 7 },
          { estado: 'NUEVO', count: 2 },
          { estado: 'PERDIDO', count: 0 },
        ]),
      );
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('tasaConversion es 0 cuando no hay cierres', async () => {
      prisma.clientePropiedad.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.clientePropiedad.aggregate.mockResolvedValue({ _sum: { comision_calculada: null } });
      prisma.visita.count.mockResolvedValue(0);
      prisma.interaccion.count.mockResolvedValue(0);
      prisma.brochureDescarga.count.mockResolvedValue(0);
      prisma.clientePropiedad.groupBy.mockResolvedValue([]);

      const result: any = await service.getResumen(TENANT_ID);

      expect(result.tasaConversion).toBe(0);
      expect(result.ingresosTotales).toBe(0);
    });
  });

  // ─── getAgentes ──────────────────────────────────────────────────

  describe('getAgentes', () => {
    it('calcula métricas por agente y excluye SUPER_ADMIN', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'ag-1', nombre: 'Ana', rol: 'SENIOR' }]);
      prisma.clientePropiedad.count
        .mockResolvedValueOnce(4)  // ganados
        .mockResolvedValueOnce(1)  // perdidos
        .mockResolvedValueOnce(2); // activos
      prisma.clientePropiedad.aggregate.mockResolvedValue({ _sum: { comision_calculada: 8000 } });
      prisma.visita.count.mockResolvedValue(3);
      prisma.interaccion.count.mockResolvedValue(10);

      const result: any = await service.getAgentes(TENANT_ID);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ rol: { not: 'SUPER_ADMIN' } }) }),
      );
      expect(result.agentes[0]).toEqual(
        expect.objectContaining({ id: 'ag-1', nombre: 'Ana', ganados: 4, perdidos: 1, tasaConversion: 80, comisionTotal: 8000 }),
      );
    });

    it('devuelve caché si existe', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ agentes: [{ id: 'cached' }] }));

      const result: any = await service.getAgentes(TENANT_ID);

      expect(result.agentes[0].id).toBe('cached');
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── getTopPropiedades ───────────────────────────────────────────

  describe('getTopPropiedades', () => {
    it('calcula el score ponderado y ordena de mayor a menor', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        {
          id: 'p1', codigo: 'CASA-01', titulo: 'Casa A', tipo: 'CASA', estado: 'DISPONIBLE',
          agente: { nombre: 'Ana' },
          interesados: [{ id: 'i1', interacciones: [{ id: 'a' }, { id: 'b' }], visitas: [{ id: 'v1' }] }],
        },
        {
          id: 'p2', codigo: 'CASA-02', titulo: 'Casa B', tipo: 'CASA', estado: 'DISPONIBLE',
          agente: null,
          interesados: [],
        },
      ]);
      prisma.$queryRaw
        .mockResolvedValueOnce([{ propiedad_id: 'p1', total: 3n }]) // brochures
        .mockResolvedValueOnce([{ propiedad_id: 'p1', total: 1n }]) // favoritos
        .mockResolvedValueOnce([]); // correos abiertos

      const result: any = await service.getTopPropiedades(TENANT_ID);

      // p1: leads=1*10 + visitas=1*5 + interacciones=2*3 + favoritos=1*2 + correos=0 + brochures=3 = 10+5+6+2+0+3 = 26
      expect(result.propiedades[0]).toEqual(
        expect.objectContaining({ id: 'p1', leads: 1, visitas: 1, interacciones: 2, favoritos: 1, brochures: 3, score: 26 }),
      );
      expect(result.propiedades[0].score).toBeGreaterThan(result.propiedades[1].score);
      expect(result.propiedades[1].agente).toBeNull();
    });

    it('respeta el límite solicitado', async () => {
      prisma.propiedad.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `p${i}`, codigo: `C-${i}`, titulo: `Casa ${i}`, tipo: 'CASA', estado: 'DISPONIBLE',
          agente: null, interesados: [],
        })),
      );
      prisma.$queryRaw.mockResolvedValue([]);

      const result: any = await service.getTopPropiedades(TENANT_ID, undefined, undefined, 2);

      expect(result.propiedades).toHaveLength(2);
    });
  });

  // ─── getRanking ──────────────────────────────────────────────────

  describe('getRanking', () => {
    const setupAgentes = (agentes: any[]) => {
      prisma.user.findMany.mockResolvedValue(agentes.map((a) => ({ id: a.id, nombre: a.nombre, rol: 'SENIOR' })));
      let call = 0;
      for (const a of agentes) {
        prisma.clientePropiedad.count
          .mockResolvedValueOnce(a.ganados ?? 0)
          .mockResolvedValueOnce(a.perdidos ?? 0)
          .mockResolvedValueOnce(0);
        prisma.clientePropiedad.aggregate.mockResolvedValueOnce({ _sum: { comision_calculada: a.comision ?? 0 } });
        prisma.visita.count.mockResolvedValueOnce(a.visitas ?? 0);
        prisma.interaccion.count.mockResolvedValueOnce(a.interacciones ?? 0);
        call++;
      }
    };

    it('otorga la insignia top_ventas al agente con más cierres', async () => {
      setupAgentes([
        { id: 'ag-1', nombre: 'Ana', ganados: 5, perdidos: 0, comision: 10000, visitas: 2, interacciones: 3 },
        { id: 'ag-2', nombre: 'Beto', ganados: 1, perdidos: 0, comision: 1000, visitas: 1, interacciones: 1 },
      ]);

      const result = await service.getRanking(TENANT_ID, 'ag-1', true);

      const ana = result.ranking.find((r) => r.id === 'ag-1')!;
      expect(ana.badges).toContain('top_ventas');
      expect(ana.badges).toContain('cerrador'); // 5 ganados
    });

    it('otorga en_racha con 3 cierres (no cerrador)', async () => {
      setupAgentes([
        { id: 'ag-1', nombre: 'Ana', ganados: 3, perdidos: 0, comision: 3000, visitas: 0, interacciones: 0 },
      ]);

      const result = await service.getRanking(TENANT_ID, 'ag-1', true);

      const ana = result.ranking[0];
      expect(ana.badges).toContain('en_racha');
      expect(ana.badges).not.toContain('cerrador');
    });

    it('enmascara nombre, rol y comisión de otros agentes para usuarios no-admin', async () => {
      setupAgentes([
        { id: 'ag-1', nombre: 'Ana', ganados: 5, perdidos: 0, comision: 10000, visitas: 0, interacciones: 0 },
        { id: 'ag-2', nombre: 'Beto', ganados: 1, perdidos: 0, comision: 500, visitas: 0, interacciones: 0 },
      ]);

      const result = await service.getRanking(TENANT_ID, 'ag-2', false);

      const otro = result.ranking.find((r) => r.id === 'ag-1')!;
      const yo = result.ranking.find((r) => r.id === 'ag-2')!;
      expect(otro.nombre).not.toBe('Ana');
      expect(otro.comisionTotal).toBeNull();
      expect(otro.esYo).toBe(false);
      expect(yo.nombre).toBe('Beto');
      expect(yo.esYo).toBe(true);
      expect(yo.comisionTotal).toBe(500);
    });

    it('incluye la configuración de insignias disponibles', async () => {
      setupAgentes([{ id: 'ag-1', nombre: 'Ana' }]);

      const result = await service.getRanking(TENANT_ID, 'ag-1', true);

      expect(result.badgesConfig.length).toBeGreaterThan(0);
      expect(result.badgesConfig.map((b) => b.id)).toContain('top_ventas');
    });
  });

  // ─── getProductividad ────────────────────────────────────────────

  describe('getProductividad', () => {
    it('agrupa interacciones por tipo y calcula totales', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'ag-1', nombre: 'Ana', rol: 'SENIOR' }]);
      prisma.interaccion.groupBy.mockResolvedValue([
        { tipo: 'LLAMADA', _count: { _all: 4 } },
        { tipo: 'EMAIL', _count: { _all: 2 } },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { usuario_id: 'ag-1', dia: new Date('2026-01-01'), total: 3n },
      ]);

      const result: any = await service.getProductividad(TENANT_ID);

      expect(result.agentes[0].porTipo.LLAMADA).toBe(4);
      expect(result.agentes[0].porTipo.EMAIL).toBe(2);
      expect(result.agentes[0].total).toBe(6);
      expect(result.totalesTipo.LLAMADA).toBe(4);
      expect(result.totalInteracciones).toBe(6);
      expect(result.agentes[0].tendencia).toEqual([{ fecha: '2026-01-01', total: 3 }]);
    });
  });

  // ─── exportAgentesXlsx ───────────────────────────────────────────

  describe('exportAgentesXlsx', () => {
    it('genera un buffer .xlsx válido con los datos de agentes', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'ag-1', nombre: 'Ana', rol: 'SENIOR' }]);
      prisma.clientePropiedad.count.mockResolvedValue(0);
      prisma.clientePropiedad.aggregate.mockResolvedValue({ _sum: { comision_calculada: 5000 } });
      prisma.visita.count.mockResolvedValue(1);
      prisma.interaccion.count.mockResolvedValue(2);

      const buffer = await service.exportAgentesXlsx(TENANT_ID);

      expect(Buffer.isBuffer(buffer)).toBe(true);

      // Round-trip: el buffer debe ser un xlsx real y legible
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);
      const ws = wb.worksheets[0];
      expect(ws.name).toBe('Desempeño Agentes');
      expect(ws.getRow(1).getCell(1).value).toBe('Agente');
      expect(ws.getRow(2).getCell(1).value).toBe('Ana');
    });
  });

  // ─── getComisiones ───────────────────────────────────────────────

  describe('getComisiones', () => {
    it('suma comisiones realizadas de negocios GANADO', async () => {
      prisma.clientePropiedad.findMany
        .mockResolvedValueOnce([
          { comision_calculada: 5000, precio_cierre: 100000, fecha_cierre: new Date(), cliente: { nombre: 'X' }, propiedad: { titulo: 'A', codigo: 'C1' } },
          { comision_calculada: null, precio_cierre: null, fecha_cierre: null, cliente: { nombre: 'Y' }, propiedad: { titulo: 'B', codigo: 'C2' } },
        ])
        .mockResolvedValueOnce([]); // enProceso

      const result: any = await service.getComisiones(TENANT_ID);

      expect(result.realizadas).toBe(5000);
      expect(result.numCierres).toBe(2);
    });

    it('proyecta comisión de VENTA usando % de la propiedad o 5.6% por defecto', async () => {
      prisma.clientePropiedad.findMany
        .mockResolvedValueOnce([]) // ganados
        .mockResolvedValueOnce([
          {
            estado: 'EN_NEGOCIACION', presupuesto: null, cliente: { nombre: 'X' },
            propiedad: { titulo: 'Casa', codigo: 'C1', precio_venta: 200000, precio_renta: null, gestion: 'VENTA', comision_porcentaje: null },
          },
        ]);

      const result: any = await service.getComisiones(TENANT_ID);

      expect(result.proyectadas).toBe(11200); // 200000 * 5.6%
      expect(result.detalleProyectado[0].tipo).toBe('VENTA');
    });

    it('proyecta comisión de RENTA como una mensualidad completa', async () => {
      prisma.clientePropiedad.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            estado: 'CIERRE', presupuesto: null, cliente: { nombre: 'X' },
            propiedad: { titulo: 'Depto', codigo: 'C2', precio_venta: null, precio_renta: 4500, gestion: 'RENTA', comision_porcentaje: null },
          },
        ]);

      const result: any = await service.getComisiones(TENANT_ID);

      expect(result.proyectadas).toBe(4500);
    });
  });

  // ─── getHeatmap ──────────────────────────────────────────────────

  describe('getHeatmap', () => {
    it('mapea propiedades con coordenadas a puntos de calor con peso acotado a 1', async () => {
      prisma.propiedad.findMany.mockResolvedValue([
        { id: 'p1', titulo: 'Casa', codigo: 'C1', latitud: 14.6, longitud: -90.5, estado: 'DISPONIBLE', _count: { interesados: 50 } },
      ]);

      const result: any = await service.getHeatmap(TENANT_ID);

      expect(result[0].lat).toBe(14.6);
      expect(result[0].weight).toBe(1); // acotado (50/10 + 0.1 = 5.1 → min 1)
    });

    it('usa caché si existe', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify([{ id: 'cached' }]));

      const result: any = await service.getHeatmap(TENANT_ID);

      expect(result[0].id).toBe('cached');
      expect(prisma.propiedad.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── flushTenantCache ────────────────────────────────────────────

  describe('flushTenantCache', () => {
    it('borra únicamente las claves del tenant indicado', async () => {
      await service.flushTenantCache(TENANT_ID);
      expect(mockRedis.deleteByPattern).toHaveBeenCalledWith(`bi:${TENANT_ID}:*`);
    });
  });
});
