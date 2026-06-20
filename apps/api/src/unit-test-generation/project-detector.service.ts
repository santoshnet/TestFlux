import { Injectable } from '@nestjs/common';
import { GitHubRepositoriesService } from '../github-repositories/github-repositories.service';
import axios from 'axios';

export interface ProjectType {
  type: 'react' | 'react-native' | 'vue' | 'angular' | 'java' | 'python' | 'node' | 'go' | 'rust' | 'laravel' | 'dotnet' | 'other';
  framework?: string;
  testingFramework?: string;
  confidence: number;
  detectedFiles: string[];
  // Security-specific information
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'maven' | 'gradle' | 'composer' | 'bundler' | 'cargo' | 'go' | 'nuget';
  securityFrameworks?: string[];
  usesAuth?: boolean;
  hasDatabase?: boolean;
}

export interface FileAnalysis {
  path: string;
  content: string;
  language: string;
}

@Injectable()
export class ProjectDetectorService {
  constructor(private githubRepositoriesService: GitHubRepositoriesService) {}

  async detectProjectType(sessionId: string, repoId: string): Promise<ProjectType> {
    try {
      // Get repository files
      const files = await this.githubRepositoriesService.getRepositoryFiles(sessionId, repoId, '');
      
      // Analyze key files to determine project type
      const analysis = await this.analyzeRepositoryFiles(sessionId, repoId, files);
      
      return this.determineProjectType(analysis);
    } catch (error) {
      console.error('Error detecting project type:', error);
      return {
        type: 'other',
        confidence: 0,
        detectedFiles: [],
      };
    }
  }

  private async analyzeRepositoryFiles(sessionId: string, repoId: string, files: any[]): Promise<FileAnalysis[]> {
    const analysis: FileAnalysis[] = [];
    const keyFiles = this.getKeyFilesToAnalyze(files);
    
    for (const file of keyFiles) {
      try {
        if (file.type === 'file') {
          const content = await this.githubRepositoriesService.getFileContent(sessionId, repoId, file.path);
          analysis.push({
            path: file.path,
            content: content.content,
            language: this.detectLanguage(file.path),
          });
        }
      } catch (error) {
        console.warn(`Could not analyze file: ${file.path}`, error);
      }
    }
    
    return analysis;
  }

  private getKeyFilesToAnalyze(files: any[]): any[] {
    const keyFilePatterns = [
      'package.json', // Node.js
      'pom.xml', // Maven/Java
      'build.gradle', // Gradle/Java
      'requirements.txt', // Python
      'setup.py', // Python
      'pyproject.toml', // Python
      'go.mod', // Go
      'Cargo.toml', // Rust
      'tsconfig.json', // TypeScript
      'composer.json', // PHP
      'Gemfile', // Ruby
      '.gitignore', // General
      'README.md', // General
    ];

    // First, look for key configuration files
    const configFiles = files.filter(file => 
      keyFilePatterns.some(pattern => 
        file.name.toLowerCase() === pattern.toLowerCase()
      )
    );

    // If we found config files, analyze those
    if (configFiles.length > 0) {
      return configFiles;
    }

    // Otherwise, look for common source directories
    const sourceDirPatterns = ['src', 'lib', 'app', 'server', 'client', 'components', 'pages', 'utils'];
    const sourceFiles = files.filter(file =>
      sourceDirPatterns.some(pattern => 
        file.path.toLowerCase().startsWith(pattern.toLowerCase() + '/')
      )
    ).slice(0, 10); // Limit to 10 files

    if (sourceFiles.length > 0) {
      return sourceFiles;
    }

    // Fallback: just take first 10 files
    return files.slice(0, 10);
  }

  private determineProjectType(analysis: FileAnalysis[]): ProjectType {
    const indicators = {
      react: 0,
      'react-native': 0,
      vue: 0,
      angular: 0,
      java: 0,
      python: 0,
      node: 0,
      go: 0,
      rust: 0,
      laravel: 0,
      dotnet: 0,
    };

    const detectedFiles: string[] = [];
    let packageManager: ProjectType['packageManager'] = undefined;
    const securityFrameworks: string[] = [];
    let usesAuth = false;
    let hasDatabase = false;

    for (const file of analysis) {
      detectedFiles.push(file.path);
      const content = file.content;
      const path = file.path.toLowerCase();

      // Package manager detection
      if (path.includes('package.json')) packageManager = 'npm';
      if (path.includes('yarn.lock')) packageManager = 'yarn';
      if (path.includes('pnpm-lock.yaml')) packageManager = 'pnpm';
      if (path.includes('requirements.txt') || path.includes('pipfile')) packageManager = 'pip';
      if (path.includes('pom.xml')) packageManager = 'maven';
      if (path.includes('build.gradle')) packageManager = 'gradle';
      if (path.includes('composer.json')) packageManager = 'composer';
      if (path.includes('gemfile')) packageManager = 'bundler';
      if (path.includes('cargo.toml')) packageManager = 'cargo';
      if (path.includes('go.mod')) packageManager = 'go';
      if (path.includes('.csproj')) packageManager = 'nuget';

      // Security framework detection
      if (content.includes('jsonwebtoken') || content.includes('passport') || content.includes('auth')) usesAuth = true;
      if (content.includes('bcrypt') || content.includes('argon2') || content.includes('crypto')) securityFrameworks.push('cryptography');
      if (content.includes('helmet') || content.includes('cors')) securityFrameworks.push('web-security');
      if (content.includes('sequelize') || content.includes('mongoose') || content.includes('typeorm') || content.includes('hibernate')) hasDatabase = true;

      // React detection
      if (path.includes('package.json')) {
        try {
          const pkg = JSON.parse(content);
          if (pkg.dependencies?.react) indicators.react += 3;
          if (pkg.dependencies?.['react-native']) indicators['react-native'] += 3;
          if (pkg.dependencies?.vue) indicators.vue += 3;
          if (pkg.dependencies?.['@angular/core']) indicators.angular += 3;
          if (pkg.dependencies?.next) indicators.react += 2; // Next.js is React-based
        } catch (e) {
          // Invalid JSON, continue with string analysis
        }
      }

      if (content.includes('react') && content.includes('jsx')) indicators.react += 2;
      if (content.includes('react-native')) indicators['react-native'] += 2;
      if (content.includes('vue')) indicators.vue += 2;
      if (content.includes('@angular')) indicators.angular += 2;

      // Java detection
      if (path.includes('pom.xml') || path.includes('build.gradle')) indicators.java += 3;
      if (content.includes('import java.') || content.includes('public class')) indicators.java += 1;

      // Python detection
      if (path.includes('requirements.txt') || path.includes('setup.py')) indicators.python += 2;
      if (content.includes('import ') && content.includes('def ')) indicators.python += 1;

      // Node.js detection
      if (path.includes('package.json')) indicators.node += 1;
      if (content.includes('require(') || content.includes('module.exports')) indicators.node += 1;

      // Laravel detection
      if (path.includes('composer.json') || path.includes('artisan') || path.includes('routes/web.php')) indicators.laravel += 3;
      if (content.includes('Illuminate') || content.includes('Route::')) indicators.laravel += 2;

      // Go detection
      if (path.includes('go.mod')) indicators.go += 3;
      if (content.includes('package main') || content.includes('func main')) indicators.go += 1;

      // Rust detection
      if (path.includes('Cargo.toml')) indicators.rust += 3;
      if (content.includes('fn main') && content.includes('use ')) indicators.rust += 1;

      // .NET detection
      if (path.includes('.csproj') || path.includes('.sln')) indicators.dotnet += 3;
      if (content.includes('using System') || content.includes('namespace')) indicators.dotnet += 1;
    }

    // Determine the project type with highest confidence
    let maxIndicators = 0;
    let projectType = 'other';
    
    for (const [type, count] of Object.entries(indicators)) {
      if (count > maxIndicators) {
        maxIndicators = count;
        projectType = type as any;
      }
    }

    const confidence = Math.min(maxIndicators / 5, 1); // Normalize to 0-1

    return {
      type: projectType as any,
      framework: this.detectFramework(analysis, projectType),
      testingFramework: this.detectTestingFramework(analysis, projectType),
      confidence,
      detectedFiles,
      packageManager,
      securityFrameworks: securityFrameworks.length > 0 ? securityFrameworks : undefined,
      usesAuth,
      hasDatabase,
    };
  }

  private detectFramework(analysis: FileAnalysis[], projectType: string): string | undefined {
    for (const file of analysis) {
      if (file.path.includes('package.json')) {
        try {
          const pkg = JSON.parse(file.content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          
          if (projectType === 'react') {
            if (deps['next.js']) return 'Next.js';
            if (deps['gatsby']) return 'Gatsby';
            if (deps['@remix-run/react']) return 'Remix';
            if (deps['@vitejs/plugin-react']) return 'Vite + React';
          }
          
          if (projectType === 'vue') {
            if (deps['nuxt']) return 'Nuxt.js';
            if (deps['vue-router']) return 'Vue Router';
          }
          
          if (projectType === 'angular') {
            return deps['@angular/core'] ? 'Angular' : undefined;
          }
        } catch (e) {
          // Continue with other detection methods
        }
      }
    }
    return undefined;
  }

  private detectTestingFramework(analysis: FileAnalysis[], projectType: string): string | undefined {
    for (const file of analysis) {
      if (file.path.includes('package.json')) {
        try {
          const pkg = JSON.parse(file.content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          
          if (deps['jest']) return 'Jest';
          if (deps['mocha']) return 'Mocha';
          if (deps['jasmine']) return 'Jasmine';
          if (deps['vitest']) return 'Vitest';
          if (deps['@testing-library/react']) return 'React Testing Library';
          if (deps['@testing-library/vue']) return 'Vue Testing Library';
          if (deps['pytest']) return 'Pytest';
          if (deps['junit']) return 'JUnit';
          if (deps['testng']) return 'TestNG';
        } catch (e) {
          // Continue with other detection
        }
      }
    }
    
    // Default testing frameworks based on project type
    const defaults: Record<string, string> = {
      react: 'Jest',
      'react-native': 'Jest',
      vue: 'Vitest',
      angular: 'Jasmine',
      java: 'JUnit',
      python: 'Pytest',
      node: 'Jest',
      go: 'Go test',
      rust: 'Rust test',
    };
    
    return defaults[projectType];
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'vue': 'vue',
      'xml': 'xml',
      'json': 'json',
      'md': 'markdown',
    };
    return languageMap[ext] || 'unknown';
  }
}