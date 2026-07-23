import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs';
import { StorageService } from '../storage.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('fs/promises');
jest.mock('fs');

describe('StorageService', () => {
  let config: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fsPromises.unlink as jest.Mock).mockResolvedValue(undefined);
    (fsPromises.readFile as jest.Mock).mockResolvedValue(
      Buffer.from('contenido'),
    );
  });

  function envLocal(overrides: Record<string, any> = {}) {
    config = { get: jest.fn((key: string) => overrides[key]) };
    return new StorageService(config as any);
  }

  function envR2() {
    config = {
      get: jest.fn(
        (key: string) =>
          ({
            R2_BUCKET: 'my-bucket',
            R2_PUBLIC_URL: 'https://cdn.gestprop.net',
            R2_ACCOUNT_ID: 'acc-1',
            R2_ACCESS_KEY_ID: 'key',
            R2_SECRET_ACCESS_KEY: 'secret',
          })[key],
      ),
    };
    return new StorageService(config as any);
  }

  // ─── Disco local ──────────────────────────────────────────

  describe('modo local (sin R2_BUCKET)', () => {
    it('isLocal debe ser true', () => {
      expect(envLocal().isLocal()).toBe(true);
    });

    it('upload debe escribir el archivo en uploads/ y retornar la URL relativa', async () => {
      const service = envLocal();
      const url = await service.upload(
        Buffer.from('data'),
        'foo.pdf',
        'application/pdf',
      );

      expect(url).toBe('/uploads/foo.pdf');
      expect(fsPromises.writeFile).toHaveBeenCalled();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });
    });

    it('localPath debe retornar la ruta absoluta dentro de uploads/', () => {
      const path = envLocal().localPath('/uploads/foo.pdf');
      expect(path).toContain('uploads');
      expect(path).toContain('foo.pdf');
    });

    it('remove debe eliminar el archivo si existe', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const service = envLocal();

      await service.remove('/uploads/foo.pdf');

      expect(fsPromises.unlink).toHaveBeenCalled();
    });

    it('remove no debe intentar eliminar si el archivo no existe', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const service = envLocal();

      await service.remove('/uploads/no-existe.pdf');

      expect(fsPromises.unlink).not.toHaveBeenCalled();
    });

    it('readBuffer debe leer del disco si el archivo local existe', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const service = envLocal();

      const buf = await service.readBuffer('/uploads/foo.pdf');

      expect(buf?.toString()).toBe('contenido');
    });

    it('readBuffer debe retornar null si el archivo local no existe', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const service = envLocal();

      expect(await service.readBuffer('/uploads/no-existe.pdf')).toBeNull();
    });

    it('readBuffer debe hacer fetch si la URL es remota (http)', async () => {
      const service = envLocal();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode('remoto').buffer,
      }) as any;

      const buf = await service.readBuffer('https://cdn.example.com/foo.pdf');

      expect(buf?.toString()).toBe('remoto');
    });

    it('readBuffer debe retornar null si el fetch remoto falla', async () => {
      const service = envLocal();
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;

      expect(
        await service.readBuffer('https://cdn.example.com/foo.pdf'),
      ).toBeNull();
    });

    it('readBuffer debe retornar null si fetch lanza una excepción', async () => {
      const service = envLocal();
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('network down')) as any;

      expect(
        await service.readBuffer('https://cdn.example.com/foo.pdf'),
      ).toBeNull();
    });
  });

  // ─── Cloudflare R2 ────────────────────────────────────────

  describe('modo R2 (R2_BUCKET configurado)', () => {
    it('isLocal debe ser false', () => {
      expect(envR2().isLocal()).toBe(false);
    });

    it('localPath debe retornar null (no aplica en R2)', () => {
      expect(envR2().localPath('https://cdn.gestprop.net/foo.pdf')).toBeNull();
    });

    it('upload debe subir a R2 vía PutObjectCommand y retornar la URL pública', async () => {
      const sendMock = jest.fn().mockResolvedValue({});
      (S3Client as unknown as jest.Mock).mockImplementation(() => ({
        send: sendMock,
      }));
      const service = envR2();

      const url = await service.upload(
        Buffer.from('data'),
        'foo.pdf',
        'application/pdf',
      );

      expect(url).toBe('https://cdn.gestprop.net/foo.pdf');
      expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('remove debe eliminar el objeto vía DeleteObjectCommand', async () => {
      const sendMock = jest.fn().mockResolvedValue({});
      (S3Client as unknown as jest.Mock).mockImplementation(() => ({
        send: sendMock,
      }));
      const service = envR2();

      await service.remove('https://cdn.gestprop.net/foo.pdf');

      expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('remove no debe lanzar si R2 falla al eliminar (best-effort)', async () => {
      const sendMock = jest.fn().mockRejectedValue(new Error('R2 down'));
      (S3Client as unknown as jest.Mock).mockImplementation(() => ({
        send: sendMock,
      }));
      const service = envR2();

      await expect(
        service.remove('https://cdn.gestprop.net/foo.pdf'),
      ).resolves.toBeUndefined();
    });
  });
});
