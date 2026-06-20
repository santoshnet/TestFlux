import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GitHubConnection } from './github-connection.entity';
import { GitHubAuthController } from './github-auth.controller';
import { GitHubAuthService } from './github-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([GitHubConnection]), ConfigModule],
  controllers: [GitHubAuthController],
  providers: [GitHubAuthService],
  exports: [TypeOrmModule, GitHubAuthService],
})
export class GitHubAuthModule {}
