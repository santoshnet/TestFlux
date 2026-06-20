import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { GitHubRepository } from './github-repository.entity';
import { GitHubAuthService } from '../github-auth/github-auth.service';
import { createAIProvider, IAIProvider } from '@aia/ai-provider';
import { ConfigService } from '@nestjs/config';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  html_url: string;
  clone_url: string;
  updated_at: string;
}

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  size: number;
  url: string;
}

interface CodeScanResult {
  summary: {
    totalFiles: number;
    totalLines: number;
    languages: Record<string, number>;
    fileTypes: Record<string, number>;
  };
  files: Array<{
    path: string;
    size: number;
    language: string;
    lineCount: number;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      line?: number;
    }>;
  }>;
  insights: string[];
  aiAnalysis?: string;
}

@Injectable()
export class GitHubRepositoriesService {
  private aiProvider: IAIProvider | null = null;

  constructor(
    @InjectRepository(GitHubRepository)
    private repositoryRepository: Repository<GitHubRepository>,
    private githubAuthService: GitHubAuthService,
    private configService: ConfigService,
  ) {
    // Initialize AI provider if available
    try {
      const aiProviderName = this.configService.get<string>('AI_PROVIDER', 'mock');
      let apiKey: string | undefined;

      if (aiProviderName === 'claude') {
        apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || undefined;
      } else if (aiProviderName === 'openai') {
        apiKey = this.configService.get<string>('OPENAI_API_KEY') || undefined;
      } else if (aiProviderName === 'groq') {
        apiKey = this.configService.get<string>('GROQ_API_KEY') || undefined;
      }

      if (apiKey && aiProviderName !== 'mock') {
        this.aiProvider = createAIProvider({
          provider: aiProviderName as any,
          apiKey,
        });
      }
    } catch (error) {
      console.warn('Failed to initialize AI provider:', error);
      this.aiProvider = null;
    }
  }

  async fetchUserRepositories(sessionId: string): Promise<GitHubRepository[]> {
    const connection = await this.githubAuthService.getConnectionBySession(sessionId);
    if (!connection) {
      throw new NotFoundException('GitHub connection not found');
    }

    try {
      // Fetch repositories from GitHub API
      const response = await axios.get<GitHubRepo[]>('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          sort: 'updated',
          per_page: 100,
        },
      });

      // Sync with database
      const syncedRepos: GitHubRepository[] = [];
      for (const repo of response.data) {
        let dbRepo = await this.repositoryRepository.findOne({
          where: { sessionId, githubRepoId: String(repo.id) },
        });

        if (!dbRepo) {
          const newRepo = new GitHubRepository();
          newRepo.sessionId = sessionId;
          newRepo.githubRepoId = String(repo.id);
          newRepo.name = repo.name;
          newRepo.fullName = repo.full_name;
          newRepo.description = repo.description || null;
          newRepo.language = repo.language || null;
          newRepo.private = repo.private;
          newRepo.fork = repo.fork;
          newRepo.stars = repo.stargazers_count;
          newRepo.forks = repo.forks_count;
          newRepo.openIssues = repo.open_issues_count;
          newRepo.htmlUrl = repo.html_url || null;
          newRepo.cloneUrl = repo.clone_url || null;
          newRepo.scanResults = null;
          newRepo.lastScannedAt = null;
          newRepo.isScanning = false;
          dbRepo = newRepo;
        } else {
          // Update existing repo data
          dbRepo.description = repo.description;
          dbRepo.language = repo.language;
          dbRepo.stars = repo.stargazers_count;
          dbRepo.forks = repo.forks_count;
          dbRepo.openIssues = repo.open_issues_count;
        }

        const saved = await this.repositoryRepository.save(dbRepo);
        syncedRepos.push(saved);
      }

      return syncedRepos;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new InternalServerErrorException('Failed to fetch repositories from GitHub');
    }
  }

  async getRepository(sessionId: string, repoId: string): Promise<GitHubRepository> {
    const repo = await this.repositoryRepository.findOne({
      where: { sessionId, id: repoId },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    return repo;
  }

  async getRepositoryFiles(sessionId: string, repoId: string, path: string = ''): Promise<GitHubFile[]> {
    const connection = await this.githubAuthService.getConnectionBySession(sessionId);
    if (!connection) {
      throw new NotFoundException('GitHub connection not found');
    }

    const repo = await this.getRepository(sessionId, repoId);

    try {
      const response = await axios.get<GitHubFile[]>(
        `https://api.github.com/repos/${repo.fullName}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching repository files:', error);
      throw new InternalServerErrorException('Failed to fetch repository files');
    }
  }

  async getFileContent(sessionId: string, repoId: string, path: string): Promise<{ content: string; encoding: string }> {
    const connection = await this.githubAuthService.getConnectionBySession(sessionId);
    if (!connection) {
      throw new NotFoundException('GitHub connection not found');
    }

    const repo = await this.getRepository(sessionId, repoId);

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repo.fullName}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return {
        content: response.data.content,
        encoding: response.data.encoding,
      };
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw new InternalServerErrorException('Failed to fetch file content');
    }
  }

  async scanRepository(sessionId: string, repoId: string): Promise<CodeScanResult> {
    const repo = await this.getRepository(sessionId, repoId);
    
    // Update scanning status
    repo.isScanning = true;
    await this.repositoryRepository.save(repo);

    try {
      const connection = await this.githubAuthService.getConnectionBySession(sessionId);
      if (!connection) {
        throw new NotFoundException('GitHub connection not found');
      }

      // Get repository tree (all files)
      const treeResponse = await axios.get(
        `https://api.github.com/repos/${repo.fullName}/git/trees/main?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      const files = treeResponse.data.tree.filter((item: any) => item.type === 'blob');
      
      // Perform basic analysis
      const scanResult = await this.performBasicScan(repo, files);
      
      // Perform AI-powered analysis if available
      try {
        const aiAnalysis = await this.performAIAnalysis(repo, scanResult);
        scanResult.aiAnalysis = aiAnalysis;
      } catch (error) {
        console.warn('AI analysis failed, using basic scan only:', error);
        scanResult.insights.push('AI analysis unavailable - showing basic metrics only');
      }

      // Save scan results (serialize to JSON for SQLite)
      repo.scanResults = JSON.stringify(scanResult);
      repo.lastScannedAt = new Date();
      repo.isScanning = false;
      await this.repositoryRepository.save(repo);

      return scanResult;

      return scanResult;
    } catch (error) {
      console.error('Error scanning repository:', error);
      repo.isScanning = false;
      await this.repositoryRepository.save(repo);
      throw new InternalServerErrorException('Failed to scan repository');
    }
  }

  private async performBasicScan(repo: GitHubRepository, files: any[]): Promise<CodeScanResult> {
    const summary = {
      totalFiles: files.length,
      totalLines: 0,
      languages: {} as Record<string, number>,
      fileTypes: {} as Record<string, number>,
    };

    const scannedFiles: CodeScanResult['files'] = [];

    // Analyze each file
    for (const file of files.slice(0, 50)) { // Limit to 50 files for performance
      const extension = file.path.split('.').pop()?.toLowerCase() || 'unknown';
      const language = this.detectLanguage(extension);
      
      summary.fileTypes[extension] = (summary.fileTypes[extension] || 0) + 1;
      summary.languages[language] = (summary.languages[language] || 0) + 1;

      // Estimate line count based on file size
      const estimatedLines = Math.floor(file.size / 50); // Rough estimate
      summary.totalLines += estimatedLines;

      scannedFiles.push({
        path: file.path,
        size: file.size,
        language,
        lineCount: estimatedLines,
        issues: this.detectBasicIssues(file.path, extension),
      });
    }

    // Generate basic insights
    const insights = this.generateInsights(summary, repo);

    return {
      summary,
      files: scannedFiles,
      insights,
    };
  }

  private async performAIAnalysis(repo: GitHubRepository, basicScan: CodeScanResult): Promise<string> {
    if (!this.aiProvider) {
      throw new Error('AI provider not available');
    }

    try {
      const prompt = `Analyze this GitHub repository and provide insights:

Repository: ${repo.fullName}
Description: ${repo.description || 'No description'}
Language: ${repo.language || 'Unknown'}
Stars: ${repo.stars}
Forks: ${repo.forks}
Open Issues: ${repo.openIssues}

Code Summary:
- Total Files: ${basicScan.summary.totalFiles}
- Total Lines (estimated): ${basicScan.summary.totalLines}
- Languages: ${JSON.stringify(basicScan.summary.languages)}

Please provide:
1. Overall code quality assessment
2. Potential technical debt or issues
3. Suggestions for improvement
4. Testing recommendations
5. Security considerations

Keep the analysis concise and actionable.`;

      const response = await this.aiProvider.chat(prompt);
      return response;
    } catch (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'go': 'Go',
      'rs': 'Rust',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'rb': 'Ruby',
      'php': 'PHP',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
      'txt': 'Text',
      'sh': 'Shell',
      'dockerfile': 'Docker',
    };

    return languageMap[extension] || 'Unknown';
  }

  private detectBasicIssues(path: string, extension: string): Array<{ type: string; severity: 'low' | 'medium' | 'high'; message: string }> {
    const issues: Array<{ type: string; severity: 'low' | 'medium' | 'high'; message: string }> = [];

    // Common patterns to detect
    const problematicPatterns = [
      { pattern: 'password', severity: 'high' as const, message: 'May contain hardcoded password' },
      { pattern: 'secret', severity: 'high' as const, message: 'May contain hardcoded secret' },
      { pattern: 'api_key', severity: 'high' as const, message: 'May contain hardcoded API key' },
      { pattern: 'console.log', severity: 'low' as const, message: 'Debug console statement' },
      { pattern: 'todo', severity: 'low' as const, message: 'TODO comment' },
      { pattern: 'fixme', severity: 'medium' as const, message: 'FIXME comment' },
      { pattern: 'hack', severity: 'medium' as const, message: 'Hack comment' },
    ];

    const lowerPath = path.toLowerCase();
    
    for (const { pattern, severity, message } of problematicPatterns) {
      if (lowerPath.includes(pattern)) {
        issues.push({ type: 'pattern', severity, message });
      }
    }

    // File-specific checks
    if (extension === 'js' || extension === 'jsx' || extension === 'ts' || extension === 'tsx') {
      if (path.includes('.test.') || path.includes('.spec.')) {
        issues.push({ type: 'test', severity: 'low' as const, message: 'Test file detected' });
      }
    }

    return issues;
  }

  private generateInsights(summary: any, repo: GitHubRepository): string[] {
    const insights: string[] = [];

    if (summary.totalFiles === 0) {
      insights.push('Repository appears to be empty or contains no accessible files');
    } else {
      insights.push(`Repository contains ${summary.totalFiles} analyzed files`);
      
      if (Object.keys(summary.languages).length > 0) {
        const topLanguages = Object.entries(summary.languages)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 3)
          .map(([lang, count]) => `${lang} (${count})`);
        insights.push(`Primary languages: ${topLanguages.join(', ')}`);
      }
    }

    if (repo.private) {
      insights.push('Private repository - access limited to authorized users');
    }

    if (repo.fork) {
      insights.push('This is a forked repository');
    }

    if (repo.openIssues > 10) {
      insights.push(`High number of open issues (${repo.openIssues}) - may require attention`);
    }

    if (repo.stars === 0 && !repo.private) {
      insights.push('Repository has no stars yet - consider adding documentation');
    }

    return insights;
  }
}