import { ConfigDocumentosService } from '../config-documentos.service';
import { DEFAULT_BROCHURE_SECTIONS } from '../brochure-sections.default';
import { CARTA_TEMPLATE_DEFAULT } from '../carta-template.default';
import { createMockPrismaService } from '../../../../test/mocks/prisma.mock';

describe('ConfigDocumentosService', () => {
  let service: ConfigDocumentosService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).configIntegraciones = {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    };
    (prisma as any).configBrochure = {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    };
    service = new ConfigDocumentosService(prisma as any);
  });

  describe('getCartaPlantilla', () => {
    it('debe retornar la plantilla personalizada del tenant si existe', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue({
        carta_plantilla_html: '<h1>Custom</h1>',
      });

      const result = await service.getCartaPlantilla('t1');

      expect(result).toEqual({
        plantilla_html: '<h1>Custom</h1>',
        es_default: false,
      });
    });

    it('debe retornar la plantilla por defecto si el tenant no tiene una propia', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue(null);

      const result = await service.getCartaPlantilla('t1');

      expect(result).toEqual({
        plantilla_html: CARTA_TEMPLATE_DEFAULT,
        es_default: true,
      });
    });
  });

  describe('updateCartaPlantilla / resetCartaPlantilla', () => {
    it('updateCartaPlantilla debe guardar la plantilla y marcar es_default=false', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({});

      const result = await service.updateCartaPlantilla('t1', {
        plantilla_html: '<h1>Nueva</h1>',
      });

      expect(result).toEqual({
        plantilla_html: '<h1>Nueva</h1>',
        es_default: false,
      });
      expect((prisma as any).configIntegraciones.upsert).toHaveBeenCalledWith({
        where: { tenant_id: 't1' },
        create: { tenant_id: 't1', carta_plantilla_html: '<h1>Nueva</h1>' },
        update: { carta_plantilla_html: '<h1>Nueva</h1>' },
      });
    });

    it('resetCartaPlantilla debe limpiar la plantilla y retornar el default', async () => {
      (prisma as any).configIntegraciones.upsert.mockResolvedValue({});

      const result = await service.resetCartaPlantilla('t1');

      expect(result).toEqual({
        plantilla_html: CARTA_TEMPLATE_DEFAULT,
        es_default: true,
      });
      expect((prisma as any).configIntegraciones.upsert).toHaveBeenCalledWith({
        where: { tenant_id: 't1' },
        create: { tenant_id: 't1', carta_plantilla_html: null },
        update: { carta_plantilla_html: null },
      });
    });
  });

  describe('getBrochureConfig', () => {
    it('debe retornar las secciones por defecto si no existe configuración', async () => {
      (prisma as any).configBrochure.findUnique.mockResolvedValue(null);

      const result = await service.getBrochureConfig('t1');

      expect(result.es_default).toBe(true);
      expect(result.secciones).toEqual(DEFAULT_BROCHURE_SECTIONS);
    });

    it('debe retornar las secciones personalizadas ordenadas por "order"', async () => {
      (prisma as any).configBrochure.findUnique.mockResolvedValue({
        secciones: [
          { id: 'ubicacion', label: 'Ubicación', visible: true, order: 2 },
          { id: 'descripcion', label: 'Descripción', visible: true, order: 1 },
        ],
        footer_texto: 'Pie de página',
        watermark_texto: 'CONFIDENCIAL',
      });

      const result = await service.getBrochureConfig('t1');

      expect(result.es_default).toBe(false);
      expect(result.secciones.map((s) => s.id)).toEqual([
        'descripcion',
        'ubicacion',
      ]);
      expect(result.footer_texto).toBe('Pie de página');
    });

    it('debe caer a las secciones por defecto si el JSON almacenado es inválido, sin marcar es_default', async () => {
      (prisma as any).configBrochure.findUnique.mockResolvedValue({
        secciones: 'no-es-un-array',
        footer_texto: null,
        watermark_texto: null,
      });

      const result = await service.getBrochureConfig('t1');

      expect(result.secciones).toEqual(DEFAULT_BROCHURE_SECTIONS);
      expect(result.es_default).toBe(false); // la fila existe, aunque su contenido no fue válido
    });
  });

  describe('updateBrochureConfig', () => {
    it('debe incluir en el update solo los campos definidos en el dto', async () => {
      (prisma as any).configBrochure.upsert.mockResolvedValue({
        secciones: DEFAULT_BROCHURE_SECTIONS,
        footer_texto: 'x',
        watermark_texto: null,
      });

      await service.updateBrochureConfig('t1', { footer_texto: 'x' });

      const call = (prisma as any).configBrochure.upsert.mock.calls[0][0];
      expect(call.update).toEqual({ footer_texto: 'x' });
    });

    it('debe convertir footer_texto vacío a null', async () => {
      (prisma as any).configBrochure.upsert.mockResolvedValue({
        secciones: DEFAULT_BROCHURE_SECTIONS,
        footer_texto: null,
        watermark_texto: null,
      });

      await service.updateBrochureConfig('t1', { footer_texto: '' });

      const call = (prisma as any).configBrochure.upsert.mock.calls[0][0];
      expect(call.update.footer_texto).toBeNull();
    });
  });

  describe('resetBrochureConfig', () => {
    it('debe restaurar las secciones y textos a sus valores por defecto', async () => {
      (prisma as any).configBrochure.upsert.mockResolvedValue({});

      const result = await service.resetBrochureConfig('t1');

      expect(result).toEqual({
        secciones: DEFAULT_BROCHURE_SECTIONS,
        footer_texto: null,
        watermark_texto: null,
        es_default: true,
      });
    });
  });

  describe('parseSecciones', () => {
    it('debe retornar los defaults si el valor no es un arreglo', () => {
      expect(service.parseSecciones(null)).toEqual(DEFAULT_BROCHURE_SECTIONS);
      expect(service.parseSecciones('x')).toEqual(DEFAULT_BROCHURE_SECTIONS);
      expect(service.parseSecciones([])).toEqual(DEFAULT_BROCHURE_SECTIONS);
    });

    it('debe ordenar las secciones por el campo order', () => {
      const result = service.parseSecciones([
        { id: 'b', label: 'B', visible: true, order: 3 },
        { id: 'a', label: 'A', visible: true, order: 1 },
      ]);
      expect(result.map((s) => s.id)).toEqual(['a', 'b']);
    });
  });

  describe('resolveCartaPlantilla / resolveBrochureConfig', () => {
    it('resolveCartaPlantilla debe retornar el default si no hay fila', async () => {
      (prisma as any).configIntegraciones.findUnique.mockResolvedValue(null);
      expect(await service.resolveCartaPlantilla('t1')).toBe(
        CARTA_TEMPLATE_DEFAULT,
      );
    });

    it('resolveBrochureConfig debe retornar defaults si no hay fila', async () => {
      (prisma as any).configBrochure.findUnique.mockResolvedValue(null);
      const result = await service.resolveBrochureConfig('t1');
      expect(result.secciones).toEqual(DEFAULT_BROCHURE_SECTIONS);
      expect(result.footer_texto).toBeNull();
    });
  });
});
