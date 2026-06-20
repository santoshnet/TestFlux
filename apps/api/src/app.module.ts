import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { Project } from './projects/project.entity';
import { Run } from './runs/run.entity';
import { Bug } from './bugs/bug.entity';
import { AgentTask } from './agents/agent-task.entity';
import { GitHubConnection } from './github-auth/github-connection.entity';
import { SEOIssue as SEOEntity } from './seo/seo.entity';

import { ProjectsModule } from './projects/projects.module';
import { RunsModule } from './runs/runs.module';
import { BugsModule } from './bugs/bugs.module';
import { AgentsModule } from './agents/agents.module';
import { GitHubAuthModule } from './github-auth/github-auth.module';
import { StorageModule } from './storage/storage.module';
import { SEOModule } from './seo/seo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env lives at workspace root, two levels up from apps/api/
      envFilePath: [
        path.resolve(__dirname, '../../../../.env'),  // dist/   → root
        path.resolve(__dirname, '../../../.env'),      // src/    → root (ts-node)
        path.resolve(process.cwd(), '../../.env'),     // CWD fallback
        path.resolve(process.cwd(), '.env'),           // same-dir fallback
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbPath = configService.get<string>('DATABASE_PATH') || './data/database.sqlite';
        return {
          type: 'sqlite',
          database: dbPath,
          entities: [Project, Run, Bug, AgentTask, GitHubConnection, SEOEntity],
          synchronize: true, // Auto-create tables for local development
          logging: false,
        };
      },
    }),
    ProjectsModule,
    RunsModule,
    BugsModule,
    AgentsModule,
    GitHubAuthModule,
    StorageModule,
    SEOModule,
  ],
})
export class AppModule {}
