import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('MASTER_ENCRYPTION_KEY');
    if (!raw || raw.length !== 64) {
      throw new InternalServerErrorException(
        'MASTER_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    this.key = Buffer.from(raw, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // layout: iv(12) + tag(16) + ciphertext — all base64
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const enc = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = crypto.createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  }

  /** Encrypt only when value is present; return null otherwise. */
  encryptIfPresent(value: string | null | undefined): string | null {
    return value ? this.encrypt(value) : null;
  }

  /** Decrypt only when value is present; return null otherwise. */
  decryptIfPresent(value: string | null | undefined): string | null {
    return value ? this.decrypt(value) : null;
  }
}
