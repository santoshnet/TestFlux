"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let StorageService = class StorageService {
    configService;
    s3Client;
    bucketName;
    publicUrl;
    localDir;
    constructor(configService) {
        this.configService = configService;
        const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY');
        const accountId = this.configService.get('R2_ACCOUNT_ID');
        this.bucketName = this.configService.get('R2_BUCKET_NAME') || 'playwright-artifacts';
        this.publicUrl = this.configService.get('R2_PUBLIC_URL');
        const configuredDir = this.configService.get('STORAGE_DIR') || './uploads';
        this.localDir = path.resolve(process.cwd(), configuredDir);
        if (accessKeyId && secretAccessKey && accountId) {
            this.s3Client = new client_s3_1.S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });
            console.log('R2 storage client initialized.');
        }
        else {
            console.log(`Local storage fallback initialized. Target directory: ${this.localDir}`);
            // Ensure local directory exists
            fs.mkdir(this.localDir, { recursive: true }).catch(console.error);
        }
    }
    async uploadFile(filename, fileBuffer, mimeType) {
        if (this.s3Client) {
            try {
                await this.s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: filename,
                    Body: fileBuffer,
                    ContentType: mimeType,
                }));
                const base = this.publicUrl || `https://${this.bucketName}.r2.dev`;
                return `${base.replace(/\/$/, '')}/${filename}`;
            }
            catch (err) {
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
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map