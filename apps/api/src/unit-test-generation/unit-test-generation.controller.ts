import { Controller, Post, Body, Param, Req } from '@nestjs/common';
import { UnitTestGenerationService } from './unit-test-generation.service';
import { GitHubCommitService } from './github-commit.service';
import { Request } from 'express';

@Controller('unit-test-generation')
export class UnitTestGenerationController {
  constructor(
    private unitTestGenerationService: UnitTestGenerationService,
    private githubCommitService: GitHubCommitService,
  ) {}

  @Post(':repoId/generate')
  async generateTests(@Param('repoId') repoId: string, @Req() req: Request) {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    
    try {
      const result = await this.unitTestGenerationService.generateUnitTests(sessionId, repoId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate tests',
      };
    }
  }

  @Post(':repoId/commit')
  async commitTests(
    @Param('repoId') repoId: string,
    @Body() body: { repoFullName: string; branch: string; testFiles: any[]; commitMessage: string },
    @Req() req: Request
  ) {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    
    try {
      const result = await this.githubCommitService.commitTestsToRepository(
        sessionId,
        body.repoFullName,
        body.branch,
        body.testFiles,
        body.commitMessage
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to commit tests',
      };
    }
  }
}
