import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  async processImage(buffer: Buffer, tenantName: string): Promise<Buffer> {
    try {
      const meta = await sharp(buffer).metadata();
      const srcWidth = meta.width ?? 1200;

      const targetWidth = Math.min(srcWidth, MAX_WIDTH);
      const fontSize = Math.max(14, Math.min(26, Math.round(targetWidth / 45)));
      const padding = 14;
      const svgW = Math.min(targetWidth, 380);
      const svgH = fontSize + padding * 2;

      const safeLabel = tenantName.replace(/[<>&"']/g, (c) =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c,
      );

      const svg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}">
          <rect x="0" y="0" width="${svgW}" height="${svgH}" rx="4" fill="rgba(0,0,0,0.38)"/>
          <text x="${svgW - padding}" y="${fontSize + Math.round(padding * 0.6)}"
            font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}"
            fill="rgba(255,255,255,0.88)" text-anchor="end" font-weight="600">
            ${safeLabel}
          </text>
        </svg>`,
      );

      return await sharp(buffer)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .composite([{ input: svg, gravity: 'southeast' }])
        .jpeg({ quality: JPEG_QUALITY, progressive: true })
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Image processing failed, storing original: ${err}`);
      return buffer;
    }
  }
}
