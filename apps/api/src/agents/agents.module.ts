import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentTask } from './agent-task.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { ConfigModule } from '@nestjs/config';
import { ProjectsModule } from '../projects/projects.module';
import { RunsModule } from '../runs/runs.module';

@Module({
  imports: [TypeOrmModule.forFeature([AgentTask]), ConfigModule, ProjectsModule, RunsModule],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
