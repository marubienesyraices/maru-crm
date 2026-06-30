import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string | null;
  private readonly publicUrl: string | null;
  private readonly uploadDir: string;

  constructor(private config: ConfigService) {
    this.bucket = config.get('R2_BUCKET') || null;
    this.publicUrl = config.get('R2_PUBLIC_URL') || null;
    this.uploadDir = join(process.cwd(), 'uploads');

    if (this.bucket) {
      const accountId = config.get('R2_ACCOUNT_ID');
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.get('R2_ACCESS_KEY_ID') || '',
          secretAccessKey: config.get('R2_SECRET_ACCESS_KEY') || '',
        },
      });
      this.logger.log(`Storage: Cloudflare R2 (bucket: ${this.bucket})`);
    } else {
      this.logger.log(`Storage: local disk (${this.uploadDir})`);
    }
  }

  async upload(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    if (this.s3 && this.bucket) {
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
      }));
      const base = (this.publicUrl || '').replace(/\/$/, '');
      return `${base}/${filename}`;
    }

    const dest = join(this.uploadDir, filename);
    await mkdir(join(dest, '..'), { recursive: true });
    await writeFile(dest, buffer);
    return `/uploads/${filename}`;
  }

  async remove(url: string): Promise<void> {
    if (this.s3 && this.bucket) {
      const filename = url.split('/').pop();
      if (!filename) return;
      try {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: filename }));
      } catch (err) {
        this.logger.warn(`R2 delete failed for ${filename}: ${err}`);
      }
      return;
    }

    const filename = url.replace('/uploads/', '');
    const filePath = join(this.uploadDir, filename);
    if (existsSync(filePath)) {
      await unlink(filePath).catch((err) => this.logger.warn(`Local delete failed: ${err}`));
    }
  }

  isLocal(): boolean {
    return !this.s3;
  }

  localPath(url: string): string | null {
    if (!this.isLocal()) return null;
    const filename = url.replace('/uploads/', '');
    return join(this.uploadDir, filename);
  }

  async readBuffer(url: string): Promise<Buffer | null> {
    try {
      if (this.isLocal() && !url.startsWith('http')) {
        const path = this.localPath(url);
        if (!path || !existsSync(path)) return null;
        return await readFile(path);
      }
      if (url.startsWith('http')) {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      }
      return null;
    } catch {
      return null;
    }
  }
}
