import { ConfigService } from '@nestjs/config';
export declare class StorageService {
    private configService;
    private s3Client?;
    private bucketName?;
    private publicUrl?;
    private localDir;
    constructor(configService: ConfigService);
    uploadFile(filename: string, fileBuffer: Buffer, mimeType: string): Promise<string>;
    getLocalDir(): string;
}
//# sourceMappingURL=storage.service.d.ts.map