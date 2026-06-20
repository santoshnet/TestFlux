import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { GitHubAuthService } from './github-auth.service';
import { Request, Response } from 'express';

@Controller('github-auth')
export class GitHubAuthController {
  constructor(private readonly githubAuthService: GitHubAuthService) {}

  @Get('status')
  async getStatus(@Req() req: Request): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const conn = await this.githubAuthService.getConnectionBySession(sessionId);

    if (conn) {
      return {
        connected: true,
        login: conn.login,
        name: conn.name,
        avatarUrl: conn.avatarUrl,
        htmlUrl: conn.htmlUrl,
        connectedAt: conn.connectedAt,
      };
    }

    return { connected: false };
  }

  @Get('login')
  async login(@Res() res: Response): Promise<void> {
    const authUrl = this.githubAuthService.getAuthorizationUrl();
    res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const code = req.query.code as string;
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';

    try {
      // Exchange code for access token
      const accessToken = await this.githubAuthService.exchangeCodeForToken(code);
      
      // Create or update connection
      await this.githubAuthService.createOrUpdateConnection(sessionId, accessToken);

      // Set cookie on response
      res.cookie('aia_session', sessionId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });

      // Redirect back to frontend (always use port 3000 for frontend)
      const frontendUrl = 'http://localhost:3000';
      res.redirect(`${frontendUrl}/repositories?connected=github`);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      const frontendUrl = 'http://localhost:3000';
      res.redirect(`${frontendUrl}?error=github_auth_failed`);
    }
  }

  @Post('disconnect')
  async disconnect(@Req() req: Request, @Res() res: Response): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    await this.githubAuthService.disconnect(sessionId);

    res.clearCookie('aia_session');
    return res.status(HttpStatus.OK).json({ success: true });
  }
}
