import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { EncryptionService } from '../encryption.service';

const VALID_KEY =
  '2c30728429764a7912e2e5c71f835d1a0cbd7cc9ed849c321f0beacb43548dd6';

async function buildService(key: string | undefined) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EncryptionService,
      {
        provide: ConfigService,
        useValue: { get: jest.fn(() => key) },
      },
    ],
  }).compile();
  return module.get<EncryptionService>(EncryptionService);
}

describe('EncryptionService', () => {
  describe('constructor', () => {
    it('lanza InternalServerErrorException si falta MASTER_ENCRYPTION_KEY', async () => {
      await expect(buildService(undefined)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('lanza InternalServerErrorException si la key no tiene 64 chars', async () => {
      await expect(buildService('demasiado-corta')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('construye correctamente con una key válida de 64 chars hex', async () => {
      const service = await buildService(VALID_KEY);
      expect(service).toBeInstanceOf(EncryptionService);
    });
  });

  describe('encrypt / decrypt', () => {
    let service: EncryptionService;

    beforeEach(async () => {
      service = await buildService(VALID_KEY);
    });

    it('descifra exactamente el mismo texto que se cifró', () => {
      const plaintext = 'client_secret_super_secreto_123';
      const ciphertext = service.encrypt(plaintext);
      expect(service.decrypt(ciphertext)).toBe(plaintext);
    });

    it('produce ciphertexts distintos para el mismo plaintext (IV aleatorio)', () => {
      const plaintext = 'mismo-valor';
      const a = service.encrypt(plaintext);
      const b = service.encrypt(plaintext);
      expect(a).not.toBe(b);
      expect(service.decrypt(a)).toBe(plaintext);
      expect(service.decrypt(b)).toBe(plaintext);
    });

    it('lanza error si el ciphertext fue manipulado (auth tag no coincide)', () => {
      const ciphertext = service.encrypt('dato-sensible');
      const buf = Buffer.from(ciphertext, 'base64');
      // Voltea el último byte del ciphertext (después de iv+tag) para invalidar el auth tag
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString('base64');
      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('encryptIfPresent devuelve null para null/undefined', () => {
      expect(service.encryptIfPresent(null)).toBeNull();
      expect(service.encryptIfPresent(undefined)).toBeNull();
    });

    it('encryptIfPresent/decryptIfPresent hacen round-trip cuando el valor está presente', () => {
      const encrypted = service.encryptIfPresent('api-key-de-un-tenant');
      expect(encrypted).not.toBeNull();
      expect(service.decryptIfPresent(encrypted)).toBe('api-key-de-un-tenant');
    });

    it('decryptIfPresent devuelve null para null/undefined', () => {
      expect(service.decryptIfPresent(null)).toBeNull();
      expect(service.decryptIfPresent(undefined)).toBeNull();
    });
  });
});
