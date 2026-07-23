import { SearchService } from '../search.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).clientePropiedad.findMany = jest.fn();
    prisma.propiedad.findMany.mockResolvedValue([]);
    prisma.cliente.findMany.mockResolvedValue([]);
    (prisma as any).clientePropiedad.findMany.mockResolvedValue([]);
    service = new SearchService(prisma as any);
  });

  it('debe retornar resultados vacíos sin consultar la BD si el término tiene menos de 2 caracteres', async () => {
    const result = await service.search('t1', 'a', null);

    expect(result).toEqual({ propiedades: [], clientes: [], pipeline: [] });
    expect(prisma.propiedad.findMany).not.toHaveBeenCalled();
  });

  it('debe retornar resultados vacíos con un término vacío o solo espacios', async () => {
    const result = await service.search('t1', '   ', null);
    expect(result).toEqual({ propiedades: [], clientes: [], pipeline: [] });
  });

  it('debe buscar en propiedades y clientes con un término de 2+ caracteres', async () => {
    prisma.propiedad.findMany.mockResolvedValue([
      { id: 'p1', codigo: 'CASA-0001' },
    ]);
    prisma.cliente.findMany.mockResolvedValue([{ id: 'c1', nombre: 'Juan' }]);

    const result = await service.search('t1', 'ca', null);

    expect(result.propiedades).toHaveLength(1);
    expect(result.clientes).toHaveLength(1);
    const propWhere = prisma.propiedad.findMany.mock.calls[0][0].where;
    expect(propWhere.tenant_id).toBe('t1');
  });

  it('no debe filtrar clientes por agente cuando visibleUserIds es null (ADMIN)', async () => {
    await service.search('t1', 'ca', null);

    const clienteWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(clienteWhere.agente_id).toBeUndefined();
  });

  it('debe filtrar clientes y pipeline por los agentes visibles (SENIOR/JUNIOR)', async () => {
    await service.search('t1', 'ca', ['agente-1', 'agente-2']);

    const clienteWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(clienteWhere.agente_id).toEqual({ in: ['agente-1', 'agente-2'] });

    const pipelineWhere = (prisma as any).clientePropiedad.findMany.mock
      .calls[0][0].where;
    expect(pipelineWhere.cliente.agente_id).toEqual({
      in: ['agente-1', 'agente-2'],
    });
  });

  it('debe recortar espacios del término de búsqueda', async () => {
    await service.search('t1', '  casa  ', null);

    const propWhere = prisma.propiedad.findMany.mock.calls[0][0].where;
    expect(propWhere.OR[0].codigo.contains).toBe('casa');
  });
});
