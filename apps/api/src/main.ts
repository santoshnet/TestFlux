import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  // Set Global Prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: true, // Allow all origins for local ease-of-use
    credentials: true,
  });

  // Custom dependency-free cookie parser middleware
  app.use((req: any, res: any, next: any) => {
    const list: Record<string, string> = {};
    const rc = req.headers.cookie;
    if (rc) {
      rc.split(';').forEach((cookie: string) => {
        const parts = cookie.split('=');
        list[parts.shift()!.trim()] = decodeURI(parts.join('='));
      });
    }
    req.cookies = list;
    next();
  });

  // Ensure uploads directory exists and serve it statically
  const storageDir = configService.get<string>('STORAGE_DIR') || './uploads';
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
