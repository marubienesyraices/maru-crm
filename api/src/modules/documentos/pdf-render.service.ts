import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * Servicio singleton para renderizar HTML → PDF vía Puppeteer.
 * Mantiene un proceso Chromium activo y lo reutiliza entre peticiones.
 * Se cierra limpiamente al destruir el módulo.
 */
@Injectable()
export class PdfRenderService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRenderService.name);
  private browser: any | null = null;
  // Mutex: evita que peticiones concurrentes lancen múltiples instancias de Chromium
  private launchPromise: Promise<any> | null = null;

  async renderHtml(
    html: string,
    format: 'Letter' | 'A4' = 'Letter',
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30_000,
      });
      const pdf = await page.pdf({
        format,
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => {});
    }
  }

  private async getBrowser(): Promise<any> {
    if (this.browser?.connected) return this.browser;

    // Si ya hay un launch en curso, esperar al mismo en lugar de lanzar otro
    if (this.launchPromise) return this.launchPromise;

    // Import dinámico (no top-level require): puppeteer re-exporta puppeteer-core,
    // que se empaqueta como ESM — un require() a nivel de módulo rompe la carga en
    // Jest (no transforma ESM dentro de node_modules). El import() dinámico usa el
    // loader nativo de Node, que sí interopera con ESM sin tocar la config de Jest.
    this.launchPromise = (async () => {
      try {
        const mod: any = await import('puppeteer');
        const puppeteer = mod.default ?? mod;
        const browser = await puppeteer.launch({
          // 'shell' = modo headless clásico; no abre ventana visible en Windows
          headless: 'shell',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
        this.logger.log('Chromium launched');
        this.browser = browser;
        this.launchPromise = null;
        browser.on('disconnected', () => {
          this.logger.warn(
            'Chromium disconnected — se relanzará en la próxima petición',
          );
          this.browser = null;
        });
        return browser;
      } catch (err) {
        this.logger.error('Error lanzando Chromium', err);
        this.launchPromise = null;
        throw err;
      }
    })();

    return this.launchPromise;
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => {});
    this.browser = null;
  }
}
