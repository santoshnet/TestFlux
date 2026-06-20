import { Controller, Post, Param, Req, Body } from '@nestjs/common';
import { EnhancedSecurityScanningService, SecurityScanResult } from './enhanced-security-scanning.service';
import { SecurityFix } from './enhanced-security-scanning.service';
import { Request } from 'express';

@Controller('security-scanning')
export class SecurityScanningController {
  constructor(private securityScanningService: EnhancedSecurityScanningService) {}

  @Post(':repoId/scan')
  async scanRepository(
    @Param('repoId') repoId: string,
    @Body() body: { repoFullName: string },
    @Req() req: Request
  ) {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    
    try {
      const result = await this.securityScanningService.scanRepository(
        sessionId,
        repoId,
        body.repoFullName
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan repository',
      };
    }
  }

  @Post('fix')
  async generateFix(@Body() body: { issue: any }) {
    try {
      const fix = await this.securityScanningService.generateFix(body.issue);
      return {
        success: true,
        data: fix,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate fix',
      };
    }
  }
}
