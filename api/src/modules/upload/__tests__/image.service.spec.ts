import sharp from 'sharp';
import { ImageService } from '../image.service';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(() => {
    service = new ImageService();
  });

  async function makeImage(width: number, height: number): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  it('debe redimensionar imágenes grandes a un máximo de 2000px de ancho', async () => {
    const original = await makeImage(3000, 2000);

    const result = await service.processImageFull(
      original,
      'Maru Bienes Raíces',
    );

    const meta = await sharp(result.processed).metadata();
    expect(meta.width).toBeLessThanOrEqual(2000);
  });

  it('no debe agrandar imágenes que ya son más pequeñas que el máximo', async () => {
    const original = await makeImage(500, 400);

    const result = await service.processImageFull(
      original,
      'Maru Bienes Raíces',
    );

    const meta = await sharp(result.processed).metadata();
    expect(meta.width).toBe(500);
  });

  it('debe generar un thumbnail de exactamente 300×200', async () => {
    const original = await makeImage(1200, 900);

    const result = await service.processImageFull(
      original,
      'Maru Bienes Raíces',
    );

    const meta = await sharp(result.thumbnail).metadata();
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(200);
  });

  it('debe conservar el buffer original sin modificar (P-06)', async () => {
    const original = await makeImage(800, 600);

    const result = await service.processImageFull(
      original,
      'Maru Bienes Raíces',
    );

    expect(result.original).toBe(original);
  });

  it('no debe lanzar con nombres de tenant que contienen caracteres especiales de XML/SVG', async () => {
    const original = await makeImage(800, 600);

    await expect(
      service.processImageFull(original, `Casa & Cía <Test> "Ok" 'x'`),
    ).resolves.toHaveProperty('processed');
  });

  it('debe incluir el logo del tenant en la marca de agua sin lanzar error', async () => {
    const original = await makeImage(800, 600);
    const logo = await sharp({
      create: {
        width: 100,
        height: 40,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await service.processImageFull(
      original,
      'Maru Bienes Raíces',
      logo,
    );

    expect(result.processed.length).toBeGreaterThan(0);
  });

  it('debe retornar el buffer original en los 3 campos si la imagen es inválida (fallback)', async () => {
    const invalid = Buffer.from('esto no es una imagen');

    const result = await service.processImageFull(
      invalid,
      'Maru Bienes Raíces',
    );

    expect(result.processed).toBe(invalid);
    expect(result.thumbnail).toBe(invalid);
    expect(result.original).toBe(invalid);
  });

  it('processImage (legacy) debe retornar solo el buffer procesado', async () => {
    const original = await makeImage(800, 600);

    const processed = await service.processImage(
      original,
      'Maru Bienes Raíces',
    );

    expect(Buffer.isBuffer(processed)).toBe(true);
    expect(processed).not.toBe(original);
  });
});
