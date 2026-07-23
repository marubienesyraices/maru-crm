import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampanasService } from '../campanas.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('CampanasService', () => {
  let service: CampanasService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let email: { isConfigured: boolean; sendHtml: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).emailPlantilla = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (prisma as any).emailCampana = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    (prisma as any).emailEvento = {
      groupBy: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    };
    email = {
      isConfigured: true,
      sendHtml: jest.fn().mockResolvedValue(undefined),
    };
    config = { get: jest.fn().mockReturnValue('http://localhost:3000') };
    service = new CampanasService(prisma as any, email as any, config as any);
  });

  describe('createPlantilla', () => {
    it('debe extraer las variables {{var}} del asunto y el cuerpo', async () => {
      (prisma as any).emailPlantilla.create.mockResolvedValue({});

      await service.createPlantilla('t1', {
        nombre: 'Bienvenida',
        asunto: 'Hola {{nombre}}',
        cuerpo_html: '<p>{{email}} - {{nombre}}</p>',
      });

      const data = (prisma as any).emailPlantilla.create.mock.calls[0][0].data;
      expect(data.variables.sort()).toEqual(['email', 'nombre']);
    });
  });

  describe('getPlantilla', () => {
    it('debe lanzar NotFoundException si no existe', async () => {
      (prisma as any).emailPlantilla.findFirst.mockResolvedValue(null);
      await expect(service.getPlantilla('t1', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePlantilla', () => {
    it('no debe versionar si solo cambia el nombre', async () => {
      (prisma as any).emailPlantilla.findFirst.mockResolvedValue({
        id: 'p1',
        nombre: 'Vieja',
        asunto: 'A',
        cuerpo_html: 'B',
        version: 1,
        historial: [],
      });
      (prisma as any).emailPlantilla.update.mockResolvedValue({});

      await service.updatePlantilla('t1', 'p1', { nombre: 'Nueva' });

      const data = (prisma as any).emailPlantilla.update.mock.calls[0][0].data;
      expect(data).toEqual({ nombre: 'Nueva' });
    });

    it('debe versionar y guardar el historial cuando cambia el cuerpo_html', async () => {
      (prisma as any).emailPlantilla.findFirst.mockResolvedValue({
        id: 'p1',
        nombre: 'X',
        asunto: 'Asunto viejo',
        cuerpo_html: 'Cuerpo viejo',
        version: 1,
        historial: [],
      });
      (prisma as any).emailPlantilla.update.mockResolvedValue({});

      await service.updatePlantilla(
        't1',
        'p1',
        { cuerpo_html: '<p>{{nombre}}</p>' },
        'user-1',
      );

      const data = (prisma as any).emailPlantilla.update.mock.calls[0][0].data;
      expect(data.version).toBe(2);
      expect(data.historial).toHaveLength(1);
      expect(data.historial[0]).toMatchObject({
        version: 1,
        asunto: 'Asunto viejo',
        cuerpo_html: 'Cuerpo viejo',
        changed_by: 'user-1',
      });
      expect(data.variables).toEqual(['nombre']);
    });

    it('debe conservar solo las últimas 10 versiones en el historial', async () => {
      const historialExistente = Array.from({ length: 10 }, (_, i) => ({
        version: i + 1,
      }));
      (prisma as any).emailPlantilla.findFirst.mockResolvedValue({
        id: 'p1',
        nombre: 'X',
        asunto: 'A',
        cuerpo_html: 'B',
        version: 11,
        historial: historialExistente,
      });
      (prisma as any).emailPlantilla.update.mockResolvedValue({});

      await service.updatePlantilla('t1', 'p1', {
        cuerpo_html: 'Nuevo',
      });

      const data = (prisma as any).emailPlantilla.update.mock.calls[0][0].data;
      expect(data.historial).toHaveLength(10);
      expect(data.historial[0].version).toBe(2); // se descartó la versión 1 (la más antigua)
    });
  });

  describe('deletePlantilla', () => {
    it('debe lanzar BadRequestException si la plantilla está en uso por una campaña', async () => {
      (prisma as any).emailPlantilla.findFirst.mockResolvedValue({ id: 'p1' });
      (prisma as any).emailCampana.count.mockResolvedValue(1);

      await expect(service.deletePlantilla('t1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe eliminar la plantilla si no está en uso', async () => {
      (prisma as any).emailPlantilla.findFirst.mockResolvedValue({ id: 'p1' });
      (prisma as any).emailCampana.count.mockResolvedValue(0);
      (prisma as any).emailPlantilla.delete.mockResolvedValue({ id: 'p1' });

      await service.deletePlantilla('t1', 'p1');

      expect((prisma as any).emailPlantilla.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });
  });

  describe('previewPlantilla', () => {
    it('debe interpolar variables con valores de ejemplo por defecto', () => {
      const result = service.previewPlantilla(
        { asunto: 'Hola {{nombre}}', cuerpo_html: '<p>Tu rol: {{rol}}</p>' },
        {},
      );

      expect(result.asunto).toBe('Hola Juan Pérez');
      expect(result.cuerpo_html).toContain('Tu rol: Agente Senior');
    });

    it('debe permitir sobreescribir los valores por defecto', () => {
      const result = service.previewPlantilla(
        { asunto: 'Hola {{nombre}}', cuerpo_html: '' },
        { nombre: 'Carlos' },
      );
      expect(result.asunto).toBe('Hola Carlos');
    });
  });

  describe('listCampanas', () => {
    it('debe calcular la tasa de apertura correctamente, evitando división por cero', async () => {
      (prisma as any).emailCampana.findMany.mockResolvedValue([
        { id: 'c1', total_enviados: 10 },
        { id: 'c2', total_enviados: 0 },
      ]);
      (prisma as any).emailEvento.groupBy
        .mockResolvedValueOnce([
          { campana_id: 'c1', _count: { id: 10 } },
          { campana_id: 'c2', _count: { id: 0 } },
        ])
        .mockResolvedValueOnce([{ campana_id: 'c1', _count: { id: 5 } }]);

      const result = await service.listCampanas('t1');

      expect(result[0].tasa_apertura).toBe(50);
      expect(result[1].tasa_apertura).toBe(0);
      expect(result[1].total_abiertos).toBe(0);
    });
  });

  describe('getCampana', () => {
    it('debe lanzar NotFoundException si no existe', async () => {
      (prisma as any).emailCampana.findFirst.mockResolvedValue(null);
      await expect(service.getCampana('t1', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCampana', () => {
    it('debe rechazar editar una campaña que no está en BORRADOR', async () => {
      (prisma as any).emailCampana.findFirst.mockResolvedValue({
        id: 'c1',
        estado: 'ENVIADA',
        total_enviados: 0,
      });
      (prisma as any).emailEvento.count.mockResolvedValue(0);

      await expect(
        service.updateCampana('t1', 'c1', { nombre: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('enviarCampana', () => {
    const plantilla = {
      asunto: 'Hola {{nombre}}',
      cuerpo_html: '<p>{{rol}}</p>',
    };

    function withCampana(overrides: any = {}) {
      (prisma as any).emailCampana.findFirst.mockResolvedValue({
        id: 'c1',
        estado: 'BORRADOR',
        filtro_rol: [],
        variables_data: {},
        plantilla,
        total_enviados: 0,
        ...overrides,
      });
      (prisma as any).emailEvento.count.mockResolvedValue(0);
    }

    it('debe rechazar el envío si la campaña no está en BORRADOR', async () => {
      withCampana({ estado: 'ENVIADA' });
      await expect(service.enviarCampana('t1', 'c1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe revertir a BORRADOR y lanzar BadRequestException si no hay destinatarios', async () => {
      withCampana();
      (prisma as any).emailCampana.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([]);

      await expect(service.enviarCampana('t1', 'c1')).rejects.toThrow(
        BadRequestException,
      );
      expect((prisma as any).emailCampana.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { estado: 'BORRADOR' },
      });
    });

    it('debe filtrar destinatarios por rol cuando filtro_rol no está vacío', async () => {
      withCampana({ filtro_rol: ['SENIOR', 'JUNIOR'] });
      (prisma as any).emailCampana.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', nombre: 'Ana', email: 'ana@x.com', rol: 'SENIOR' },
      ]);
      (prisma as any).emailEvento.create.mockResolvedValue({});

      await service.enviarCampana('t1', 'c1');

      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.rol).toEqual({ in: ['SENIOR', 'JUNIOR'] });
    });

    it('debe enviar el correo interpolado a cada destinatario y marcar ENVIADA', async () => {
      withCampana({ variables_data: { promo: 'VERANO2026' } });
      (prisma as any).emailCampana.update.mockResolvedValue({
        estado: 'ENVIADA',
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', nombre: 'Ana', email: 'ana@x.com', rol: 'SENIOR' },
      ]);
      (prisma as any).emailEvento.create.mockResolvedValue({});

      await service.enviarCampana('t1', 'c1');

      expect(email.sendHtml).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ana@x.com', subject: 'Hola Ana' }),
      );
      const finalUpdate = (prisma as any).emailCampana.update.mock.calls[1][0];
      expect(finalUpdate.data.estado).toBe('ENVIADA');
      expect(finalUpdate.data.total_enviados).toBe(1);
    });

    it('debe omitir el envío real si el email no está configurado, pero igual contar como enviado', async () => {
      email.isConfigured = false;
      withCampana();
      (prisma as any).emailCampana.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', nombre: 'Ana', email: 'ana@x.com', rol: 'SENIOR' },
      ]);
      (prisma as any).emailEvento.create.mockResolvedValue({});

      await service.enviarCampana('t1', 'c1');

      expect(email.sendHtml).not.toHaveBeenCalled();
      const finalUpdate = (prisma as any).emailCampana.update.mock.calls[1][0];
      expect(finalUpdate.data.total_enviados).toBe(1);
      expect(finalUpdate.data.estado).toBe('ENVIADA');
    });

    it('debe marcar FALLIDA si el envío falla para todos los destinatarios', async () => {
      withCampana();
      (prisma as any).emailCampana.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', nombre: 'Ana', email: 'ana@x.com', rol: 'SENIOR' },
      ]);
      (prisma as any).emailEvento.create.mockResolvedValue({});
      email.sendHtml.mockRejectedValue(new Error('SMTP down'));

      await service.enviarCampana('t1', 'c1');

      const finalUpdate = (prisma as any).emailCampana.update.mock.calls[1][0];
      expect(finalUpdate.data.estado).toBe('FALLIDA');
      expect(finalUpdate.data.total_enviados).toBe(0);
    });

    it('debe continuar con los demás destinatarios si uno falla', async () => {
      withCampana();
      (prisma as any).emailCampana.update.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', nombre: 'Ana', email: 'ana@x.com', rol: 'SENIOR' },
        { id: 'u2', nombre: 'Beto', email: 'beto@x.com', rol: 'JUNIOR' },
      ]);
      (prisma as any).emailEvento.create.mockResolvedValue({});
      email.sendHtml
        .mockRejectedValueOnce(new Error('falló Ana'))
        .mockResolvedValueOnce(undefined);

      await service.enviarCampana('t1', 'c1');

      const finalUpdate = (prisma as any).emailCampana.update.mock.calls[1][0];
      expect(finalUpdate.data.total_enviados).toBe(1);
      expect(finalUpdate.data.estado).toBe('ENVIADA');
    });
  });
});
