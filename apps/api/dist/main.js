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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
const express = __importStar(require("express"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT') || 3001;
    // Set Global Prefix
    app.setGlobalPrefix('api');
    // Enable CORS
    app.enableCors({
        origin: true, // Allow all origins for local ease-of-use
        credentials: true,
    });
    // Custom dependency-free cookie parser middleware
    app.use((req, res, next) => {
        const list = {};
        const rc = req.headers.cookie;
        if (rc) {
            rc.split(';').forEach((cookie) => {
                const parts = cookie.split('=');
                list[parts.shift().trim()] = decodeURI(parts.join('='));
            });
        }
        req.cookies = list;
        next();
    });
    // Ensure uploads directory exists and serve it statically
    const storageDir = configService.get('STORAGE_DIR') || './uploads';
    const resolvedUploadsPath = path.resolve(process.cwd(), storageDir);
    if (!fs.existsSync(resolvedUploadsPath)) {
        fs.mkdirSync(resolvedUploadsPath, { recursive: true });
    }
    app.use('/uploads', express.static(resolvedUploadsPath));
    console.log(`Serving uploads statically from: ${resolvedUploadsPath}`);
    await app.listen(port);
    console.log(`AI Playwright Agent API Server running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map