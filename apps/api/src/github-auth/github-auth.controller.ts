import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GitHubConnection } from './github-connection.entity';
import { Request, Response } from 'express';

@Controller('github-auth')
export class GitHubAuthController {
  constructor(
    @InjectRepository(GitHubConnection)
    private connectionRepository: Repository<GitHubConnection>
  ) {}

  @Get('status')
  async getStatus(@Req() req: Request): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const conn = await this.connectionRepository.findOne({
      where: { sessionId, active: true },
    });

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
    // Simulate GitHub OAuth login redirection.
    // In production, this redirects to github.com/login/oauth/authorize
    // For local development and out-of-the-box usage, we directly trigger the callback with a mock code.
    res.redirect('/api/github-auth/callback?code=mock_code_123');
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const code = req.query.code as string;
    const sessionId = 'local-demo-session'; // Using default session key for local ease of use

    // Create a mock active connection
    let conn = await this.connectionRepository.findOne({ where: { sessionId } });
    if (!conn) {
      conn = this.connectionRepository.create({
        sessionId,
        githubId: '998877',
        login: 'octocat-demo',
        name: 'The QA Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/5832347?v=4',
        htmlUrl: 'https://github.com/octocat',
        accessToken: 'mock_access_token_xyz',
        scope: 'repo,read:org',
        active: true,
      });
    } else {
      conn.active = true;
      conn.lastUsedAt = new Date();
    }

    await this.connectionRepository.save(conn);

    // Set cookie on response
    res.cookie('aia_session', sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Redirect back to frontend dashboard connections page
    const frontendUrl = process.env.NEXT_PUBLIC_API_URL 
      ? new URL(process.env.NEXT_PUBLIC_API_URL).origin 
      : 'http://localhost:3000';
      
    res.redirect(`${frontendUrl}/projects?connected=github`);
  }

  @Post('disconnect')
  async disconnect(@Req() req: Request, @Res() res: Response): Promise<any> {
    const sessionId = req.cookies?.['aia_session'] || 'local-demo-session';
    const conn = await this.connectionRepository.findOne({ where: { sessionId } });
    if (conn) {
      conn.active = false;
      await this.connectionRepository.save(conn);
    }

    res.clearCookie('aia_session');
    return res.status(HttpStatus.OK).json({ success: true });
  }
}
