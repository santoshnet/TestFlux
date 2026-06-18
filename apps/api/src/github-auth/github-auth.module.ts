import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GitHubConnection } from './github-connection.entity';
import { GitHubAuthController } from './github-auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GitHubConnection])],
  controllers: [GitHubAuthController],
  exports: [TypeOrmModule],
})
export class GitHubAuthModule {}
