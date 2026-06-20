import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Run } from './run.entity';
import { Project } from '../projects/project.entity';
import { Bug } from '../bugs/bug.entity';
import { SEOIssue as SEOEntity } from '../seo/seo.entity';
import { RunsService } from './runs.service';
import { RunsController } from './runs.controller';
import { RunExecutionService } from './run-execution.service';
import { StorageModule } from '../storage/storage.module';
import { ConfigModule } from '@nestjs/config';
import { SEOModule } from '../seo/seo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Run, Project, Bug, SEOEntity]),
    StorageModule,
    ConfigModule,
    SEOModule,
  ],
  providers: [RunsService, RunExecutionService],
  controllers: [RunsController],
  exports: [RunsService, RunExecutionService],
})
export class RunsModule {}
