import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const puppeteer = require('puppeteer');

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

  async renderHtml(html: string, format: 'Letter' | 'A4' = 'Letter'): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
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

    this.launchPromise = puppeteer
      .launch({
        // 'shell' = modo headless clásico; no abre ventana visible en Windows
        headless: 'shell',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      })
      .then((browser: any) => {
        this.logger.log('Chromium launched');
        this.browser = browser;
        this.launchPromise = null;
        browser.on('disconnected', () => {
          this.logger.warn('Chromium disconnected — se relanzará en la próxima petición');
          this.browser = null;
        });
        return browser;
      })
      .catch((err: unknown) => {
        this.logger.error('Error lanzando Chromium', err);
        this.launchPromise = null;
        throw err;
      });

    return this.launchPromise;
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => {});
    this.browser = null;
  }
}
