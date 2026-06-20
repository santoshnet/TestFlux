import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SecurityRulesEngine, SecurityIssue } from './security-rules-engine.service';
import { ProjectDetectorService, ProjectType } from '../unit-test-generation/project-detector.service';
import { GitHubRepositoriesService } from '../github-repositories/github-repositories.service';
import { createAIProvider, IAIProvider } from '@aia/ai-provider';
import { ConfigService } from '@nestjs/config';

export interface SecurityScanResult {
  repository: string;
  projectType: ProjectType;
  scanDate: Date;
  issues: SecurityIssue[];
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    securityScore: number;
  };
  categories: Record<string, number>;
  owaspCoverage: Record<string, number>;
  cweCoverage: Record<string, number>;
}

export interface SecurityFix {
  issue: SecurityIssue;
  fix: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cwe?: string;
  owasp?: string;
  bestPractices: string[];
}

@Injectable()
export class SecurityScanningService {
  private aiProvider: IAIProvider | null = null;

  constructor(
    private securityRulesEngine: SecurityRulesEngine,
    private projectDetector: ProjectDetectorService,
    private githubRepositoriesService: GitHubRepositoriesService,
    private configService: ConfigService,
  ) {
    this.initializeAIProvider();
  }

  private initializeAIProvider() {
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
      console.warn('Failed to initialize AI provider for security scanning:', error);
    }
  }

  async scanRepository(
    sessionId: string,
    repoId: string,
    repoFullName: string
  ): Promise<SecurityScanResult> {
    try {
      // Detect project type
      const projectType = await this.projectDetector.detectProjectType(sessionId, repoId);
      
      // Get security rules for this project type
      const rules = this.securityRulesEngine.getRulesForProject(projectType);
      
      // Get source files to scan
      const sourceFiles = await this.getSourceFiles(sessionId, repoId);
      
      // Scan files for vulnerabilities
      const issues = await this.scanFilesForIssues(sourceFiles, rules, repoFullName);
      
      // Calculate security metrics
      const summary = this.calculateSummary(issues);
      const categories = this.groupByCategory(issues);
      const owaspCoverage = this.groupByOWASP(issues);
      const cweCoverage = this.groupByCWE(issues);

      return {
        repository: repoFullName,
        projectType,
        scanDate: new Date(),
        issues,
        summary,
        categories,
        owaspCoverage,
        cweCoverage,
      };
    } catch (error) {
      console.error('Error scanning repository:', error);
      throw new InternalServerErrorException('Failed to scan repository for security issues');
    }
  }

  async generateFix(issue: SecurityIssue): Promise<SecurityFix> {
    try {
      if (!this.aiProvider) {
        return this.generateDefaultFix(issue);
      }

      const prompt = `You are a senior security engineer. Analyze this security vulnerability and provide a fix.

Vulnerability Details:
- Name: ${issue.name}
- Description: ${issue.description}
- Severity: ${issue.severity}
- Category: ${issue.category}
- CWE: ${issue.cwe || 'N/A'}
- OWASP: ${issue.owasp || 'N/A'}

Vulnerable Code (file: ${issue.file}, line ${issue.line}):
\`\`\`
${issue.code}
\`\`\`

Please provide:
1. Why this code is vulnerable
2. Severity assessment
3. The CWE number if applicable
4. The OWASP category
5. Fixed code with proper security measures
6. Explanation of the fix
7. Best practices to prevent similar issues

Return the response in this JSON format:
{
  "explanation": "...",
  "fix": "...",
  "cwe": "...",
  "owasp": "...",
  "severity": "...",
  "bestPractices": ["...", "..."]
}`;

      const response = await this.aiProvider.chat(prompt);
      const parsed = this.parseAIResponse(response);
      
      return {
        issue,
        fix: parsed.fix || this.getDefaultFix(issue),
        explanation: parsed.explanation || issue.description,
        severity: issue.severity,
        cwe: parsed.cwe || issue.cwe,
        owasp: parsed.owasp || issue.owasp,
        bestPractices: parsed.bestPractices || [],
      };
    } catch (error) {
      console.error('Error generating fix:', error);
      return this.generateDefaultFix(issue);
    }
  }

  private async getSourceFiles(sessionId: string, repoId: string) {
    const sourcePaths = ['src', 'app', 'lib', 'server', 'client', 'components', 'pages', 'controllers', 'services', 'models'];
    const sourceFiles: Array<{ path: string; content: string }> = [];

    // Try to get files from each source path
    for (const path of sourcePaths) {
      try {
        const files = await this.githubRepositoriesService.getRepositoryFiles(sessionId, repoId, path);
        
        for (const file of files) {
          if (file.type === 'file') {
            try {
              const fileContent = await this.githubRepositoriesService.getFileContent(sessionId, repoId, file.path);
              sourceFiles.push({
                path: file.path,
                content: this.decodeContent(fileContent.content, fileContent.encoding),
              });
            } catch (error) {
              console.warn(`Could not read file: ${file.path}`);
            }
          }
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // If no files found, try root directory
    if (sourceFiles.length === 0) {
      try {
        const rootFiles = await this.githubRepositoriesService.getRepositoryFiles(sessionId, repoId, '');
        for (const file of rootFiles) {
          if (file.type === 'file') {
            try {
              const fileContent = await this.githubRepositoriesService.getFileContent(sessionId, repoId, file.path);
              sourceFiles.push({
                path: file.path,
                content: this.decodeContent(fileContent.content, fileContent.encoding),
              });
            } catch (error) {
              console.warn(`Could not read file: ${file.path}`);
            }
          }
        }
      } catch (error) {
        console.warn('Could not access root directory');
      }
    }

    return sourceFiles.slice(0, 20); // Limit to 20 files for performance
  }

  private decodeContent(content: string, encoding: string): string {
    if (encoding === 'base64') {
      return Buffer.from(content, 'base64').toString('utf-8');
    }
    return content;
  }

  private async scanFilesForIssues(
    sourceFiles: Array<{ path: string; content: string }>,
    rules: any[],
    repoFullName: string
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const file of sourceFiles) {
      const lines = file.content.split('\n');
      
      for (const rule of rules) {
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          
          for (const pattern of rule.patterns) {
            if (line.includes(pattern)) {
              issues.push({
                id: `${rule.id}-${file.path}-${lineIndex}`,
                ruleId: rule.id,
                name: rule.name,
                description: rule.description,
                severity: rule.severity,
                category: rule.category,
                cwe: rule.cwe,
                owasp: rule.owasp,
                file: file.path,
                line: lineIndex + 1,
                code: line.trim(),
              });
            }
          }
        }
      }
    }

    return issues;
  }

  private calculateSummary(issues: SecurityIssue[]) {
    const summary = {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      securityScore: 0,
    };

    // Calculate security score (0-100)
    const severityWeights = { critical: 10, high: 7, medium: 4, low: 1 };
    const totalWeight = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);
    const maxPossibleWeight = 50; // Assumed max for calculation
    summary.securityScore = Math.max(0, Math.min(100, 100 - (totalWeight / maxPossibleWeight) * 100));

    return summary;
  }

  private groupByCategory(issues: SecurityIssue[]): Record<string, number> {
    const categories: Record<string, number> = {};
    issues.forEach(issue => {
      categories[issue.category] = (categories[issue.category] || 0) + 1;
    });
    return categories;
  }

  private groupByOWASP(issues: SecurityIssue[]): Record<string, number> {
    const owasp: Record<string, number> = {};
    issues.forEach(issue => {
      if (issue.owasp) {
        owasp[issue.owasp] = (owasp[issue.owasp] || 0) + 1;
      }
    });
    return owasp;
  }

  private groupByCWE(issues: SecurityIssue[]): Record<string, number> {
    const cwe: Record<string, number> = {};
    issues.forEach(issue => {
      if (issue.cwe) {
        cwe[issue.cwe] = (cwe[issue.cwe] || 0) + 1;
      }
    });
    return cwe;
  }

  private parseAIResponse(response: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.warn('Failed to parse AI response:', error);
      return {};
    }
  }

  private getDefaultFix(issue: SecurityIssue): string {
    const fixes: Record<string, string> = {
      'eval': 'Avoid using eval(). Consider using safer alternatives or JSON.parse() for JSON data.',
      'exec': 'Never execute shell commands with user input. Use parameterized commands or subprocess with proper sanitization.',
      'dangerouslySetInnerHTML': 'Avoid using dangerouslySetInnerHTML. Use DOMPurify for sanitization or use React\'s safe rendering.',
      'SQL': 'Use parameterized queries or ORM to prevent SQL injection.',
      'API_KEY': 'Store API keys in environment variables and never commit them to version control.',
      'Command': 'Use parameterized commands and validate all user input before execution.',
    };

    for (const [key, fix] of Object.entries(fixes)) {
      if (issue.name.toLowerCase().includes(key.toLowerCase()) || 
          issue.code.toLowerCase().includes(key.toLowerCase())) {
        return fix;
      }
    }

    return 'Review the code and implement proper input validation and sanitization.';
  }

  private generateDefaultFix(issue: SecurityIssue): SecurityFix {
    return {
      issue,
      fix: this.getDefaultFix(issue),
      explanation: issue.description,
      severity: issue.severity,
      cwe: issue.cwe,
      owasp: issue.owasp,
      bestPractices: [
        'Always validate and sanitize user input',
        'Use parameterized queries for database operations',
        'Never trust client-side input',
        'Implement proper authentication and authorization',
        'Use security headers and CSP',
      ],
    };
  }
}
