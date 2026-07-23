import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 82;
const THUMB_W = 300;
const THUMB_H = 200;

export interface ProcessedImage {
  processed: Buffer;
  thumbnail: Buffer;
  original: Buffer;
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  /** Legacy compat: returns only the processed buffer */
  async processImage(
    buffer: Buffer,
    tenantName: string,
    logoBuffer?: Buffer | null,
  ): Promise<Buffer> {
    return (await this.processImageFull(buffer, tenantName, logoBuffer))
      .processed;
  }

  /** P-05 + P-06: Returns processed image, 300×200 thumbnail, and original */
  async processImageFull(
    buffer: Buffer,
    tenantName: string,
    logoBuffer?: Buffer | null,
  ): Promise<ProcessedImage> {
    const original = buffer; // P-06: keep original untouched

    try {
      const meta = await sharp(buffer).metadata();
      const srcWidth = meta.width ?? 1200;

      const targetWidth = Math.min(srcWidth, MAX_WIDTH);
      const fontSize = Math.max(14, Math.min(26, Math.round(targetWidth / 45)));
      const padding = 14;
      const svgH = fontSize + padding * 2;

      const safeLabel = tenantName.replace(
        /[<>&"']/g,
        (c) =>
          ({
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&apos;',
          })[c] ?? c,
      );

      // Prepare logo section for watermark SVG
      let logoImgTag = '';
      let logoExtraW = 0;

      if (logoBuffer) {
        try {
          const LOGO_H = Math.max(14, Math.min(svgH - 8, fontSize + 6));
          const logoPng = await sharp(logoBuffer)
            .resize({ height: LOGO_H, withoutEnlargement: true })
            .png({ compressionLevel: 6 })
            .toBuffer();
          const logMeta = await sharp(logoPng).metadata();
          const logoW = logMeta.width ?? LOGO_H;
          const logoY = Math.round((svgH - LOGO_H) / 2);
          const b64 = logoPng.toString('base64');
          logoImgTag = `<image href="data:image/png;base64,${b64}" x="${padding}" y="${logoY}" width="${logoW}" height="${LOGO_H}" preserveAspectRatio="xMidYMid meet"/>`;
          logoExtraW = logoW + 8; // 8px gap between logo and text
        } catch {
          /* silently skip logo in watermark if processing fails */
        }
      }

      const svgW = Math.min(targetWidth, 380 + logoExtraW);

      const svg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}">
          <rect x="0" y="0" width="${svgW}" height="${svgH}" rx="4" fill="rgba(0,0,0,0.38)"/>
          ${logoImgTag}
          <text x="${svgW - padding}" y="${fontSize + Math.round(padding * 0.6)}"
            font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}"
            fill="rgba(255,255,255,0.88)" text-anchor="end" font-weight="600">
            ${safeLabel}
          </text>
        </svg>`,
      );

      const processed = await sharp(buffer)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .composite([{ input: svg, gravity: 'southeast' }])
        .jpeg({ quality: JPEG_QUALITY, progressive: true })
        .toBuffer();

      // P-05: 300×200 thumbnail (cover crop, no watermark)
      const thumbnail = await sharp(buffer)
        .resize(THUMB_W, THUMB_H, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 75, progressive: true })
        .toBuffer();

      return { processed, thumbnail, original };
    } catch (err) {
      this.logger.warn(`Image processing failed, returning original: ${err}`);
      return { processed: buffer, thumbnail: buffer, original: buffer };
    }
  }
}
