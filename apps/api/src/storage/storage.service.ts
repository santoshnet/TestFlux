import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private s3Client?: S3Client;
  private bucketName?: string;
  private publicUrl?: string;
  private localDir: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'playwright-artifacts';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL');
    
    const configuredDir = this.configService.get<string>('STORAGE_DIR') || './uploads';
    this.localDir = path.resolve(process.cwd(), configuredDir);

    if (accessKeyId && secretAccessKey && accountId) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      console.log('R2 storage client initialized.');
    } else {
      console.log(`Local storage fallback initialized. Target directory: ${this.localDir}`);
      // Ensure local directory exists
      fs.mkdir(this.localDir, { recursive: true }).catch(console.error);
    }
  }

  async uploadFile(filename: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: filename,
            Body: fileBuffer,
            ContentType: mimeType,
          })
        );
        const base = this.publicUrl || `https://${this.bucketName}.r2.dev`;
        return `${base.replace(/\/$/, '')}/${filename}`;
      } catch (err) {
        console.error('R2 upload failed, falling back to local storage:', err);
      }
    }

    // Local Storage fallback
    const targetPath = path.join(this.localDir, filename);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, fileBuffer);
    
    // Returns relative path that NestJS will serve
    return `/uploads/${filename}`;
  }

  getLocalDir() {
    return this.localDir;
  }
}
