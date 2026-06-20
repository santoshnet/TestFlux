import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GitHubRepository } from './github-repository.entity';
import { GitHubRepositoriesController } from './github-repositories.controller';
import { GitHubRepositoriesService } from './github-repositories.service';
import { GitHubAuthModule } from '../github-auth/github-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GitHubRepository]),
    GitHubAuthModule,
    ConfigModule,
  ],
  controllers: [GitHubRepositoriesController],
  providers: [GitHubRepositoriesService],
  exports: [TypeOrmModule, GitHubRepositoriesService],
})
export class GitHubRepositoriesModule {}