import { DocumentosScheduler } from '../documentos.scheduler';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('DocumentosScheduler', () => {
  let scheduler: DocumentosScheduler;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notificaciones: { create: jest.Mock };

  const propiedad = {
    id: 'prop-1',
    codigo: 'CASA-0001',
    titulo: 'Casa X',
    tenant_id: 't1',
    agente_id: 'agente-1',
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).propiedadDocumento = { findMany: jest.fn() };
    notificaciones = { create: jest.fn().mockResolvedValue({}) };
    scheduler = new DocumentosScheduler(prisma as any, notificaciones as any);

    prisma.user.findMany.mockResolvedValue([]);
    prisma.notificacion.findFirst.mockResolvedValue(null);
  });

  function mockDocs(expiring: any[], expired: any[]) {
    (prisma as any).propiedadDocumento.findMany
      .mockResolvedValueOnce(expiring)
      .mockResolvedValueOnce(expired);
  }

  it('no debe crear notificaciones si no hay documentos por vencer ni vencidos', async () => {
    mockDocs([], []);

    await scheduler.checkDocumentExpiry();

    expect(notificaciones.create).not.toHaveBeenCalled();
  });

  it('debe notificar al agente de la propiedad cuando un documento está por vencer', async () => {
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 5);
    mockDocs(
      [
        {
          id: 'doc-1',
          tipo: 'ESCRITURA',
          nombre: 'Escritura.pdf',
          fecha_vencimiento: vencimiento,
          propiedad,
        },
      ],
      [],
    );

    await scheduler.checkDocumentExpiry();

    expect(notificaciones.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        userId: 'agente-1',
        tipo: 'DOCUMENTO_POR_VENCER',
        entidad: 'PropiedadDocumento',
        entidadId: 'doc-1',
        mensaje: expect.stringContaining('CASA-0001'),
      }),
    );
  });

  it('debe calcular correctamente los días restantes en el mensaje', async () => {
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 3);
    vencimiento.setHours(23, 59, 59, 999);
    mockDocs(
      [
        {
          id: 'doc-1',
          tipo: 'ESCRITURA',
          nombre: 'Escritura.pdf',
          fecha_vencimiento: vencimiento,
          propiedad,
        },
      ],
      [],
    );

    await scheduler.checkDocumentExpiry();

    const call = notificaciones.create.mock.calls[0][0];
    expect(call.mensaje).toMatch(/vence en \d+ días?\./);
  });

  it('debe notificar DOCUMENTO_VENCIDO para documentos ya vencidos', async () => {
    const vencido = new Date('2020-01-01');
    mockDocs(
      [],
      [
        {
          id: 'doc-2',
          tipo: 'RGA',
          nombre: 'RGA.pdf',
          fecha_vencimiento: vencido,
          propiedad,
        },
      ],
    );

    await scheduler.checkDocumentExpiry();

    expect(notificaciones.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'DOCUMENTO_VENCIDO',
        entidadId: 'doc-2',
      }),
    );
  });

  it('debe notificar también a los ADMIN activos del tenant, sin duplicar si el agente también es admin', async () => {
    const vencido = new Date('2020-01-01');
    mockDocs(
      [],
      [
        {
          id: 'doc-3',
          tipo: 'RGA',
          nombre: 'RGA.pdf',
          fecha_vencimiento: vencido,
          propiedad,
        },
      ],
    );
    prisma.user.findMany.mockResolvedValue([
      { id: 'admin-1', tenant_id: 't1' },
      { id: 'agente-1', tenant_id: 't1' }, // el agente de la propiedad también es admin
    ]);

    await scheduler.checkDocumentExpiry();

    const userIds = notificaciones.create.mock.calls.map((c) => c[0].userId);
    expect(userIds.sort()).toEqual(['admin-1', 'agente-1']);
  });

  it('no debe crear una notificación duplicada si ya existe una para el mismo documento/usuario hoy', async () => {
    const vencido = new Date('2020-01-01');
    mockDocs(
      [],
      [
        {
          id: 'doc-4',
          tipo: 'RGA',
          nombre: 'RGA.pdf',
          fecha_vencimiento: vencido,
          propiedad,
        },
      ],
    );
    prisma.notificacion.findFirst.mockResolvedValue({ id: 'existing-notif' });

    await scheduler.checkDocumentExpiry();

    expect(notificaciones.create).not.toHaveBeenCalled();
  });

  it('debe resolver administradores por separado para cada tenant', async () => {
    const propTenant2 = {
      id: 'prop-2',
      codigo: 'APT-0001',
      titulo: 'Apto Y',
      tenant_id: 't2',
      agente_id: null,
    };
    const vencido = new Date('2020-01-01');
    mockDocs(
      [],
      [
        {
          id: 'doc-5',
          tipo: 'RGA',
          nombre: 'RGA.pdf',
          fecha_vencimiento: vencido,
          propiedad,
        },
        {
          id: 'doc-6',
          tipo: 'RGA',
          nombre: 'RGA2.pdf',
          fecha_vencimiento: vencido,
          propiedad: propTenant2,
        },
      ],
    );
    prisma.user.findMany.mockResolvedValue([
      { id: 'admin-t1', tenant_id: 't1' },
      { id: 'admin-t2', tenant_id: 't2' },
    ]);

    await scheduler.checkDocumentExpiry();

    const calls = notificaciones.create.mock.calls.map((c) => c[0]);
    expect(calls.find((c) => c.entidadId === 'doc-5').userId).not.toBe(
      'admin-t2',
    );
    expect(
      calls.some((c) => c.entidadId === 'doc-6' && c.userId === 'admin-t2'),
    ).toBe(true);
  });
});
