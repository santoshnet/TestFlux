import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { EnhancedSecurityRulesEngine, SecurityIssue } from './enhanced-security-rules-engine.service';
import { EnhancedProjectDetectorService, ProjectType } from './enhanced-project-detector.service';
import { GitHubRepositoriesService } from '../github-repositories/github-repositories.service';
import { createAIProvider, IAIProvider } from '@aia/ai-provider';
import { ConfigService } from '@nestjs/config';

export interface SecurityScanResult {
  repository: string;
  projectType: ProjectType;
  scanDate: Date;
  securityScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issues: SecurityIssue[];
  categories: Record<string, number>;
  owaspCoverage: Record<string, number>;
  cweCoverage: Record<string, number>;
  dependencies: string[];
  vulnerableDependencies: string[];
  recommendations: string[];
}

export interface SecurityFix {
  issue: SecurityIssue;
  fix: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cwe?: string;
  owasp?: string;
  bestPractices: string[];
  codeExample?: string;
  codeLanguage?: string;
}

@Injectable()
export class EnhancedSecurityScanningService {
  private aiProvider: IAIProvider | null = null;

  constructor(
    private securityRulesEngine: EnhancedSecurityRulesEngine,
    private projectDetector: EnhancedProjectDetectorService,
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
      // Detect project type with enhanced fingerprinting
      const projectType = await this.projectDetector.detectProjectType(sessionId, repoId);
      
      // Get security rules for this project type
      const rules = this.securityRulesEngine.getRulesForProject(projectType);
      
      // Get source files to scan
      const sourceFiles = await this.getSourceFiles(sessionId, repoId);
      
      // Scan files for vulnerabilities
      const issues = await this.scanFilesForIssues(sourceFiles, rules, repoFullName, projectType);
      
      // Analyze dependencies
      const dependencies = await this.analyzeDependencies(sourceFiles, projectType);
      
      // Calculate security metrics with improved scoring
      const securityScore = this.calculateSecurityScore(issues, projectType);
      const grade = this.calculateGrade(securityScore);
      const summary = this.calculateSummary(issues);
      const categories = this.groupByCategory(issues);
      const owaspCoverage = this.groupByOWASP(issues);
      const cweCoverage = this.groupByCWE(issues);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, projectType);

      return {
        repository: repoFullName,
        projectType,
        scanDate: new Date(),
        securityScore,
        grade,
        issues,
        summary,
        categories,
        owaspCoverage,
        cweCoverage,
        dependencies: dependencies.all,
        vulnerableDependencies: dependencies.vulnerable,
        recommendations,
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

      const prompt = `You are a senior security engineer specializing in ${issue.framework || issue.platform || 'general'} security.

Analyze this security vulnerability and provide a comprehensive fix.

Vulnerability Details:
- Name: ${issue.name}
- Description: ${issue.description}
- Severity: ${issue.severity}
- Category: ${issue.category}
- CWE: ${issue.cwe || 'N/A'}
- OWASP: ${issue.owasp || 'N/A'}
- Platform: ${issue.platform || 'N/A'}
- Framework: ${issue.framework || 'N/A'}

Vulnerable Code (file: ${issue.file}, line ${issue.line}):
\`\`\`${issue.codeLanguage || 'text'}
${issue.code}
\`\`\`

Please provide:
1. Detailed explanation of why this code is vulnerable
2. Severity assessment
3. The CWE number if applicable
4. The OWASP category
5. Fixed code with proper security measures
6. Explanation of the fix
7. Additional best practices to prevent similar issues
8. Code example showing the implementation (in the same language as the vulnerable code)

Return the response in this JSON format:
{
  "explanation": "...",
  "fix": "...",
  "codeExample": "...",
  "codeLanguage": "...",
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
        codeExample: parsed.codeExample,
        codeLanguage: parsed.codeLanguage || this.detectLanguage(issue.file),
      };
    } catch (error) {
      console.error('Error generating fix:', error);
      return this.generateDefaultFix(issue);
    }
  }

  private async getSourceFiles(sessionId: string, repoId: string) {
    const sourcePaths = this.getSourcePathsForProjectType();
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

    return sourceFiles.slice(0, 30); // Limit to 30 files for performance
  }

  private getSourcePathsForProjectType(): string[] {
    return [
      'src',
      'app',
      'lib',
      'server',
      'client',
      'components',
      'pages',
      'controllers',
      'services',
      'models',
      'views',
      'android/app/src/main',
      'ios/Runner',
      'lib/main.dart',
      'android/app/src/main/java',
      'android/app/src/main/kotlin',
    ];
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
    repoFullName: string,
    projectType: ProjectType
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
                platform: projectType.platform,
                framework: projectType.framework,
                suggestion: rule.fix,
                fix: rule.fix,
              });
            }
          }
        }
      }
    }

    return issues;
  }

  private async analyzeDependencies(
    sourceFiles: Array<{ path: string; content: string }>,
    projectType: ProjectType
  ): Promise<{ all: string[], vulnerable: string[] }> {
    const allDeps: string[] = [];
    const vulnerable: string[] = [];

    // Extract dependencies from package.json
    const packageJson = sourceFiles.find(f => f.path.includes('package.json'));
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        allDeps.push(...Object.keys(deps));
        
        // Check for known vulnerable dependencies
        const vulnerablePackages = [
          'lodash<4.17.21',
          'axios<0.21.0',
          'express<4.17.0',
          'react<16.13.0',
          'react-dom<16.13.0',
        ];
        
        vulnerablePackages.forEach(vulnPkg => {
          const [name, version] = vulnPkg.split('<');
          if (deps[name]) {
            const depVersion = deps[name].replace(/^[\^~]/, '');
            if (depVersion < version) {
              vulnerable.push(`${name}@${depVersion} (${vulnPkg})`);
            }
          }
        });
      } catch (e) {
        // Invalid JSON
      }
    }

    // Extract dependencies from requirements.txt
    const requirements = sourceFiles.find(f => f.path.includes('requirements.txt'));
    if (requirements) {
      const deps = requirements.content.split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
      allDeps.push(...deps);
    }

    // Extract dependencies from pubspec.yaml
    const pubspec = sourceFiles.find(f => f.path.includes('pubspec.yaml'));
    if (pubspec) {
      const lines = pubspec.content.split('\n');
      let inDependencies = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('dependencies:')) {
          inDependencies = true;
          continue;
        }
        if (inDependencies && trimmed.startsWith(':')) {
          break;
        }
        if (inDependencies && trimmed && !trimmed.startsWith('#')) {
          const depName = trimmed.split(':')[0].trim();
          allDeps.push(depName);
        }
      }
    }

    return { all: [...new Set(allDeps)], vulnerable: [...new Set(vulnerable)] };
  }

  private calculateSecurityScore(issues: SecurityIssue[], projectType: ProjectType): number {
    let baseScore = 100;
    
    // Platform-specific scoring weights
    const platformWeights: Record<string, number> = {
      mobile: 1.2, // Mobile apps get stricter scoring
      web: 1.0,
      backend: 1.1,
      desktop: 1.0,
      other: 1.0,
    };

    const multiplier = platformWeights[projectType.type] || 1.0;

    // Deduct points based on severity
    const severityDeductions: Record<string, number> = {
      critical: 15 * multiplier,
      high: 10 * multiplier,
      medium: 5 * multiplier,
      low: 2 * multiplier,
    };

    issues.forEach(issue => {
      baseScore -= severityDeductions[issue.severity];
    });

    // Add points for security frameworks
    if (projectType.securityFrameworks && projectType.securityFrameworks.length > 0) {
      baseScore += Math.min(5, projectType.securityFrameworks.length) * multiplier;
    }

    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }

  private calculateGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  private calculateSummary(issues: SecurityIssue[]) {
    return {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    };
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

  private generateRecommendations(issues: SecurityIssue[], projectType: ProjectType): string[] {
    const recommendations: string[] = [];

    // Platform-specific recommendations
    if (projectType.platform === 'android' || projectType.framework === 'React Native' || projectType.framework === 'Flutter') {
      recommendations.push('Use Android Keystore or secure storage for sensitive data');
      recommendations.push('Implement certificate pinning for API calls');
      recommendations.push('Use network security configuration to enforce HTTPS');
    }

    if (projectType.platform === 'ios') {
      recommendations.push('Use iOS Keychain for secure data storage');
      recommendations.push('Enable App Transport Security for all connections');
      recommendations.push('Use Safari View Controller instead of WebView when possible');
    }

    // Severity-based recommendations
    if (issues.some(i => i.severity === 'critical')) {
      recommendations.push('Address all critical vulnerabilities immediately');
      recommendations.push('Consider implementing automated security testing in CI/CD');
    }

    if (issues.some(i => i.category === 'Secret Management')) {
      recommendations.push('Move all secrets to environment variables or secret management services');
      recommendations.push('Rotate any compromised credentials immediately');
    }

    if (issues.some(i => i.category === 'SQL Injection')) {
      recommendations.push('Use parameterized queries or ORM with built-in protection');
      recommendations.push('Implement input validation for all user inputs');
    }

    // General security recommendations
    recommendations.push('Implement security headers and CSP for web applications');
    recommendations.push('Enable logging and monitoring for security events');
    recommendations.push('Regularly update dependencies to patch known vulnerabilities');
    recommendations.push('Conduct regular security audits and penetration testing');

    return [...new Set(recommendations)];
  }

  private parseAIResponse(response: string): any {
    try {
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
      'API Key': 'Store API keys in secure storage or environment variables',
      'Password': 'Never hardcode passwords; use secure storage or authentication',
      'Secret': 'Use secret management services or secure storage',
      'eval': 'Avoid using eval(). Consider using safer alternatives or JSON.parse() for JSON data',
      'exec': 'Never execute shell commands with user input. Use parameterized commands or subprocess with proper sanitization',
      'dangerouslySetInnerHTML': 'Avoid using dangerouslySetInnerHTML. Use DOMPurify for sanitization or React\'s safe rendering',
      'SQL': 'Use parameterized queries or ORM to prevent SQL injection',
      'HTTP': 'Always use HTTPS URLs instead of HTTP',
      'SharedPreferences': 'Use EncryptedSharedPreferences or Android Keystore for sensitive data',
      'UserDefaults': 'Use iOS Keychain for sensitive data or encrypt before storing',
      'addJavascriptInterface': 'Use @JavascriptInterface annotation and restrict to trusted origins only',
      'setJavaScriptEnabled': 'Only enable JavaScript when absolutely necessary and implement proper input validation',
    };

    for (const [key, fix] of Object.entries(fixes)) {
      if (issue.name.toLowerCase().includes(key.toLowerCase()) || 
          issue.code.toLowerCase().includes(key.toLowerCase())) {
        return fix;
      }
    }

    return 'Review the code and implement proper input validation, sanitization, and secure storage practices.';
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      kt: 'kotlin',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
      rb: 'ruby',
      php: 'php',
      dart: 'dart',
      xml: 'xml',
      json: 'json',
    };
    return languageMap[ext] || 'text';
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
        'Store secrets in secure storage or environment variables',
      ],
      codeLanguage: this.detectLanguage(issue.file),
    };
  }
}
