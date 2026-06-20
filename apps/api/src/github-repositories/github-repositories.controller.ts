import { Controller, Get, Post, Body, Param, Query, Req, Res, HttpStatus } from '@nestjs/common';
import { GitHubRepositoriesService } from './github-repositories.service';
import { Request, Response } from 'express';

@Controller('github-repositories')
export class GitHubRepositoriesController {
  constructor(private readonly githubRepositoriesService: GitHubRepositoriesService) {}

  @Post('sync')
  async syncRepositories(@Req() req: Request): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const repositories = await this.githubRepositoriesService.fetchUserRepositories(sessionId);
    
    // Deserialize scan results for each repository
    const repositoriesWithDeserializedScans = repositories.map(repo => ({
      ...repo,
      scanResults: repo.scanResults ? JSON.parse(repo.scanResults) : null,
    }));
    
    return {
      success: true,
      count: repositories.length,
      repositories: repositoriesWithDeserializedScans,
    };
  }

  @Get()
  async getRepositories(@Req() req: Request): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const repositories = await this.githubRepositoriesService.fetchUserRepositories(sessionId);
    
    // Deserialize scan results for each repository
    const repositoriesWithDeserializedScans = repositories.map(repo => ({
      ...repo,
      scanResults: repo.scanResults ? JSON.parse(repo.scanResults) : null,
    }));
    
    return {
      success: true,
      count: repositories.length,
      repositories: repositoriesWithDeserializedScans,
    };
  }

  @Get(':id')
  async getRepository(@Param('id') id: string, @Req() req: Request): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const repository = await this.githubRepositoriesService.getRepository(sessionId, id);
    
    // Deserialize scan results
    const repositoryWithDeserializedScan = {
      ...repository,
      scanResults: repository.scanResults ? JSON.parse(repository.scanResults) : null,
    };
    
    return {
      success: true,
      repository: repositoryWithDeserializedScan,
    };
  }

  @Get(':id/files')
  async getRepositoryFiles(
    @Param('id') id: string,
    @Query('path') path: string = '',
    @Req() req: Request,
  ): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const files = await this.githubRepositoriesService.getRepositoryFiles(sessionId, id, path);
    return {
      success: true,
      files,
    };
  }

  @Get(':id/content')
  async getFileContent(
    @Param('id') id: string,
    @Query('path') path: string,
    @Req() req: Request,
  ): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    if (!path) {
      return { 
        success: false, 
        error: 'Path parameter is required' 
      };
    }
    const content = await this.githubRepositoriesService.getFileContent(sessionId, id, path);
    return {
      success: true,
      ...content,
    };
  }

  @Post(':id/scan')
  async scanRepository(@Param('id') id: string, @Req() req: Request): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const scanResult = await this.githubRepositoriesService.scanRepository(sessionId, id);
    return {
      success: true,
      scanResult,
    };
  }
}