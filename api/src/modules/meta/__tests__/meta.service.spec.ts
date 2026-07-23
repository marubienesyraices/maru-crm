import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MetaService } from '../meta.service';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('MetaService', () => {
  let service: MetaService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let integraciones: { getCredentials: jest.Mock };
  let queue: { add: jest.Mock };
  let fetchMock: jest.Mock;

  const fbCreds = {
    meta_page_token: 'tok',
    meta_page_id: 'page-1',
    meta_ig_user_id: null,
  };
  const igCreds = {
    meta_page_token: 'tok',
    meta_page_id: null,
    meta_ig_user_id: 'ig-1',
  };
  const ambasCreds = {
    meta_page_token: 'tok',
    meta_page_id: 'page-1',
    meta_ig_user_id: 'ig-1',
  };
  const sinCreds = {
    meta_page_token: null,
    meta_page_id: null,
    meta_ig_user_id: null,
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).metaPublicacion = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    integraciones = { getCredentials: jest.fn().mockResolvedValue(sinCreds) };
    queue = { add: jest.fn().mockResolvedValue({}) };
    service = new MetaService(
      prisma as any,
      {} as any,
      integraciones as any,
      queue as any,
    );

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  describe('getStatus', () => {
    it('debe indicar no configurado si faltan credenciales', async () => {
      integraciones.getCredentials.mockResolvedValue(sinCreds);
      expect(await service.getStatus('t1')).toEqual({
        configured: false,
        ig_configured: false,
      });
    });

    it('debe indicar configured=true si hay token + pageId', async () => {
      integraciones.getCredentials.mockResolvedValue(fbCreds);
      expect(await service.getStatus('t1')).toEqual({
        configured: true,
        ig_configured: false,
      });
    });

    it('debe indicar ig_configured=true si hay token + igUserId', async () => {
      integraciones.getCredentials.mockResolvedValue(igCreds);
      expect(await service.getStatus('t1')).toEqual({
        configured: false,
        ig_configured: true,
      });
    });
  });

  describe('CRUD', () => {
    it('get: debe lanzar NotFoundException si no existe la publicación', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue(null);
      await expect(service.get('t1', 'x')).rejects.toThrow(NotFoundException);
    });

    it('create: debe lanzar NotFoundException si la propiedad indicada no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);
      await expect(
        service.create('t1', 'agente-1', {
          propiedad_id: 'prop-x',
          plataforma: 'FACEBOOK',
          mensaje: 'hola',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('update: debe rechazar editar una publicación que no está en BORRADOR', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'PUBLICADA',
      });
      await expect(
        service.update('t1', 'p1', { mensaje: 'nuevo' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('update: debe permitir editar una publicación en BORRADOR', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'BORRADOR',
      });
      (prisma as any).metaPublicacion.update.mockResolvedValue({
        id: 'p1',
        mensaje: 'nuevo',
      });

      await service.update('t1', 'p1', { mensaje: 'nuevo' });

      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { mensaje: 'nuevo' },
      });
    });

    it('delete: debe rechazar eliminar una publicación ya publicada', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'PUBLICADA',
      });
      await expect(service.delete('t1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('delete: debe permitir eliminar un borrador', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'BORRADOR',
      });
      (prisma as any).metaPublicacion.delete.mockResolvedValue({ id: 'p1' });

      await service.delete('t1', 'p1');

      expect((prisma as any).metaPublicacion.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });
  });

  describe('previewTexto', () => {
    it('debe lanzar NotFoundException si la propiedad no existe', async () => {
      prisma.propiedad.findFirst.mockResolvedValue(null);
      await expect(service.previewTexto('t1', 'prop-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe construir el mensaje incluyendo precio, specs y agente', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        titulo: 'Casa X',
        tipo: 'CASA',
        gestion: 'VENTA',
        departamento: 'Guatemala',
        municipio: 'Zona 10',
        moneda: 'USD',
        precio_venta: 100000,
        precio_renta: null,
        habitaciones: 3,
        banos: 2,
        area_terreno_m2: 300,
        area_construccion_m2: 200,
        agente: { nombre: 'Ana Agente' },
        imagenes: [{ url: 'https://img.example.com/1.jpg' }],
      });

      const result = await service.previewTexto('t1', 'prop-1');

      expect(result.mensaje).toContain('Casa X');
      expect(result.mensaje).toContain('USD 100,000');
      expect(result.mensaje).toContain('3 habitaciones');
      expect(result.mensaje).toContain('Agente: Ana Agente');
      expect(result.imagen_url).toBe('https://img.example.com/1.jpg');
    });

    it('debe retornar imagen_url null si la propiedad no tiene imágenes', async () => {
      prisma.propiedad.findFirst.mockResolvedValue({
        titulo: 'Casa Y',
        tipo: null,
        gestion: null,
        departamento: null,
        municipio: null,
        moneda: 'GTQ',
        precio_venta: null,
        precio_renta: null,
        habitaciones: null,
        banos: null,
        area_terreno_m2: null,
        area_construccion_m2: null,
        agente: null,
        imagenes: [],
      });

      const result = await service.previewTexto('t1', 'prop-2');
      expect(result.imagen_url).toBeNull();
    });
  });

  describe('publicar / programar', () => {
    it('publicar: debe rechazar si el estado no es BORRADOR ni FALLIDA', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'PUBLICADA',
      });
      await expect(service.publicar('t1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('programar: debe rechazar si el estado no es BORRADOR', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'PROGRAMADA',
      });
      await expect(
        service.programar('t1', 'p1', new Date(Date.now() + 3600_000)),
      ).rejects.toThrow(BadRequestException);
    });

    it('programar: debe rechazar una fecha con menos de 10 minutos de anticipación', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'BORRADOR',
      });
      await expect(
        service.programar('t1', 'p1', new Date(Date.now() + 60_000)),
      ).rejects.toThrow(BadRequestException);
    });

    it('programar: debe encolar el job con el delay correcto y actualizar el estado', async () => {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'BORRADOR',
      });
      (prisma as any).metaPublicacion.update.mockResolvedValue({
        id: 'p1',
        estado: 'PROGRAMADA',
      });
      const fecha = new Date(Date.now() + 3600_000);

      await service.programar('t1', 'p1', fecha);

      expect(queue.add).toHaveBeenCalledWith(
        'publish',
        { publicacionId: 'p1', tenantId: 't1' },
        expect.objectContaining({ attempts: 3 }),
      );
      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { estado: 'PROGRAMADA', programado_para: fecha },
      });
    });
  });

  describe('ejecutarPublicacion', () => {
    function withPub(overrides: any = {}) {
      (prisma as any).metaPublicacion.findFirst.mockResolvedValue({
        id: 'p1',
        estado: 'PROGRAMADA',
        plataforma: 'FACEBOOK',
        mensaje: 'Hola mundo',
        imagen_url: null,
        ...overrides,
      });
    }

    it('debe lanzar BadRequestException si no hay credenciales de Meta configuradas', async () => {
      withPub();
      integraciones.getCredentials.mockResolvedValue(sinCreds);

      await expect(service.ejecutarPublicacion('p1', 't1')).rejects.toThrow(
        BadRequestException,
      );
      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({ estado: 'FALLIDA' }),
      });
    });

    it('debe publicar en Facebook (feed) cuando no hay imagen', async () => {
      withPub({ plataforma: 'FACEBOOK' });
      integraciones.getCredentials.mockResolvedValue(fbCreds);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-post-1' }),
      });

      await service.ejecutarPublicacion('p1', 't1');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/page-1/feed'),
        expect.any(Object),
      );
      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          estado: 'PUBLICADA',
          fb_post_id: 'fb-post-1',
          ig_post_id: null,
        }),
      });
    });

    it('debe publicar en Facebook (photos) cuando hay imagen', async () => {
      withPub({
        plataforma: 'FACEBOOK',
        imagen_url: 'https://img.example.com/1.jpg',
      });
      integraciones.getCredentials.mockResolvedValue(fbCreds);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-post-2' }),
      });

      await service.ejecutarPublicacion('p1', 't1');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/page-1/photos'),
        expect.any(Object),
      );
    });

    it('debe publicar en Instagram (dos pasos: contenedor + publish) cuando hay imagen', async () => {
      withPub({
        plataforma: 'INSTAGRAM',
        imagen_url: 'https://img.example.com/1.jpg',
      });
      integraciones.getCredentials.mockResolvedValue(igCreds);
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'container-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ig-post-1' }),
        });

      await service.ejecutarPublicacion('p1', 't1');

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/ig-1/media'),
        expect.any(Object),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/ig-1/media_publish'),
        expect.any(Object),
      );
      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({ ig_post_id: 'ig-post-1' }),
      });
    });

    it('debe omitir Instagram silenciosamente si no hay imagen, y publicar solo en Facebook con AMBAS', async () => {
      withPub({ plataforma: 'AMBAS', imagen_url: null });
      integraciones.getCredentials.mockResolvedValue(ambasCreds);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'fb-post-3' }),
      });

      await service.ejecutarPublicacion('p1', 't1');

      expect(fetchMock).toHaveBeenCalledTimes(1); // solo Facebook, IG se omite sin tirar error
      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          estado: 'PUBLICADA',
          fb_post_id: 'fb-post-3',
          ig_post_id: null,
        }),
      });
    });

    it('debe marcar FALLIDA y relanzar BadRequestException si el Graph API rechaza la publicación', async () => {
      withPub({ plataforma: 'FACEBOOK' });
      integraciones.getCredentials.mockResolvedValue(fbCreds);
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Token expirado' } }),
      });

      await expect(service.ejecutarPublicacion('p1', 't1')).rejects.toThrow(
        BadRequestException,
      );
      expect((prisma as any).metaPublicacion.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          estado: 'FALLIDA',
          error_msg: expect.stringContaining('Token expirado'),
        }),
      });
    });
  });
});
