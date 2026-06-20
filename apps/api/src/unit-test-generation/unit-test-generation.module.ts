import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnitTestGenerationController } from './unit-test-generation.controller';
import { UnitTestGenerationService } from './unit-test-generation.service';
import { ProjectDetectorService } from './project-detector.service';
import { GitHubCommitService } from './github-commit.service';
import { GitHubRepositoriesModule } from '../github-repositories/github-repositories.module';
import { GitHubAuthModule } from '../github-auth/github-auth.module';

@Module({
  imports: [
    ConfigModule,
    GitHubRepositoriesModule,
    GitHubAuthModule,
  ],
  controllers: [UnitTestGenerationController],
  providers: [
    ProjectDetectorService,
    UnitTestGenerationService,
    GitHubCommitService,
  ],
  exports: [
    ProjectDetectorService,
    UnitTestGenerationService,
    GitHubCommitService,
  ],
})
export class UnitTestGenerationModule {}
