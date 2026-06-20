import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { GitHubConnection } from './github-connection.entity';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

interface GitHubAccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

@Injectable()
export class GitHubAuthService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(GitHubConnection)
    private connectionRepository: Repository<GitHubConnection>,
  ) {}

  private get clientId(): string {
    return this.configService.get<string>('GITHUB_CLIENT_ID') || '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';
  }

  private get callbackUrl(): string {
    return this.configService.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:3001/api/github-auth/callback';
  }

  getAuthorizationUrl(): string {
    const scope = 'repo read:org user';
    const state = Math.random().toString(36).substring(2, 15);
    
    // If no credentials configured, return mock URL for demo
    if (!this.clientId || !this.clientSecret) {
      return '/api/github-auth/callback?code=mock_code_123';
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: scope,
      state: state,
      allow_signup: 'true',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    // Mock mode for development without credentials
    if (!this.clientId || !this.clientSecret) {
      return 'mock_access_token_xyz';
    }

    try {
      const response = await axios.post<GitHubAccessTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      throw new InternalServerErrorException('Failed to exchange code for token');
    }
  }

  async getGitHubUser(accessToken: string): Promise<GitHubUser> {
    // Mock mode for development without credentials
    if (!this.clientId || !this.clientSecret) {
      return {
        id: 998877,
        login: 'octocat-demo',
        name: 'The QA Octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/5832347?v=4',
        html_url: 'https://github.com/octocat',
      };
    }

    try {
      const response = await axios.get<GitHubUser>('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch GitHub user');
    }
  }

  async createOrUpdateConnection(sessionId: string, accessToken: string): Promise<GitHubConnection> {
    const githubUser = await this.getGitHubUser(accessToken);

    let connection = await this.connectionRepository.findOne({
      where: { sessionId },
    });

    if (connection) {
      // Update existing connection
      connection.githubId = String(githubUser.id);
      connection.login = githubUser.login;
      connection.name = githubUser.name;
      connection.avatarUrl = githubUser.avatar_url;
      connection.htmlUrl = githubUser.html_url;
      connection.accessToken = accessToken;
      connection.scope = 'repo,read:org';
      connection.active = true;
      connection.lastUsedAt = new Date();
    } else {
      // Create new connection
      connection = this.connectionRepository.create({
        sessionId,
        githubId: String(githubUser.id),
        login: githubUser.login,
        name: githubUser.name,
        avatarUrl: githubUser.avatar_url,
        htmlUrl: githubUser.html_url,
        accessToken,
        scope: 'repo,read:org',
        active: true,
      });
    }

    return this.connectionRepository.save(connection);
  }

  async getConnectionBySession(sessionId: string): Promise<GitHubConnection | null> {
    return this.connectionRepository.findOne({
      where: { sessionId, active: true },
    });
  }

  async disconnect(sessionId: string): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { sessionId },
    });

    if (connection) {
      connection.active = false;
      await this.connectionRepository.save(connection);
    }
  }
}