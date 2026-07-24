import { PdfRenderService } from '../pdf-render.service';

/**
 * getBrowser() usa un import() dinámico real de 'puppeteer' (por diseño: ver
 * comentario en pdf-render.service.ts — evita que require() rompa la carga
 * ESM de puppeteer bajo Jest). Por esa misma razón, jest.mock('puppeteer')
 * no puede interceptarlo sin activar --experimental-vm-modules en Jest (un
 * cambio global de configuración fuera de alcance para este test).
 *
 * Estas pruebas cubren renderHtml()/onModuleDestroy() — la lógica real por
 * petición — inyectando directamente un "browser" ya conectado en el campo
 * privado, saltando así la ruta de lanzamiento de Chromium. La orquestación
 * de getBrowser() (mutex de lanzamiento concurrente, reconexión tras
 * 'disconnected', reintento tras fallo de lanzamiento) queda fuera de
 * alcance de pruebas unitarias por esta restricción de diseño.
 */
describe('PdfRenderService', () => {
  let service: PdfRenderService;
  let mockPage: {
    setContent: jest.Mock;
    pdf: jest.Mock;
    close: jest.Mock;
  };
  let mockBrowser: {
    connected: boolean;
    newPage: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    mockPage = {
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-FAKE')),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockBrowser = {
      connected: true,
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    service = new PdfRenderService();
    // Inyecta un browser ya "conectado" para saltar el import() dinámico de
    // puppeteer — getBrowser() lo devuelve de inmediato sin lanzar Chromium.
    (service as any).browser = mockBrowser;
  });

  describe('renderHtml', () => {
    it('debe abrir una página, esperar a que cargue el contenido y devolver el PDF como Buffer', async () => {
      const result = await service.renderHtml('<h1>hola</h1>');

      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
      expect(mockPage.setContent).toHaveBeenCalledWith('<h1>hola</h1>', {
        waitUntil: 'load',
        timeout: 30_000,
      });
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'Letter',
          printBackground: true,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        }),
      );
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('%PDF-FAKE');
    });

    it('debe usar el formato indicado (A4) en vez del default (Letter)', async () => {
      await service.renderHtml('<p>x</p>', 'A4');

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'A4' }),
      );
    });

    it('debe cerrar la página siempre, incluso si falla la generación del PDF', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('render failed'));

      await expect(service.renderHtml('<p>x</p>')).rejects.toThrow(
        'render failed',
      );
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('debe cerrar la página siempre, incluso si falla setContent()', async () => {
      mockPage.setContent.mockRejectedValueOnce(new Error('timeout'));

      await expect(service.renderHtml('<p>x</p>')).rejects.toThrow('timeout');
      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(mockPage.pdf).not.toHaveBeenCalled();
    });

    it('no debe lanzar si page.close() falla', async () => {
      mockPage.close.mockRejectedValueOnce(new Error('close failed'));

      await expect(service.renderHtml('<p>x</p>')).resolves.toBeInstanceOf(
        Buffer,
      );
    });

    it('debe abrir una página nueva por cada llamada, reutilizando el mismo navegador', async () => {
      await service.renderHtml('<p>1</p>');
      await service.renderHtml('<p>2</p>');

      expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleDestroy', () => {
    it('debe cerrar el navegador si estaba abierto', async () => {
      await service.onModuleDestroy();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      expect((service as any).browser).toBeNull();
    });

    it('no debe lanzar si el navegador nunca se abrió', async () => {
      (service as any).browser = null;

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('no debe lanzar si browser.close() falla', async () => {
      mockBrowser.close.mockRejectedValueOnce(new Error('close failed'));

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect((service as any).browser).toBeNull();
    });
  });
});
