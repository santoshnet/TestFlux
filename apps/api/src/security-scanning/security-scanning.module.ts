import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityScanningController } from './security-scanning.controller';
import { EnhancedSecurityScanningService } from './enhanced-security-scanning.service';
import { EnhancedSecurityRulesEngine } from './enhanced-security-rules-engine.service';
import { EnhancedProjectDetectorService } from './enhanced-project-detector.service';
import { GitHubRepositoriesModule } from '../github-repositories/github-repositories.module';

@Module({
  imports: [
    ConfigModule,
    GitHubRepositoriesModule,
  ],
  controllers: [SecurityScanningController],
  providers: [
    EnhancedSecurityRulesEngine,
    EnhancedSecurityScanningService,
    EnhancedProjectDetectorService,
  ],
  exports: [
    EnhancedSecurityRulesEngine,
    EnhancedSecurityScanningService,
    EnhancedProjectDetectorService,
  ],
})
export class SecurityScanningModule {}
