import { Injectable } from '@nestjs/common';

export interface ProjectType {
  type: 'web' | 'mobile' | 'backend' | 'desktop' | 'other';
  framework?: string;
  platform?: 'android' | 'ios' | 'web' | 'windows' | 'macos' | 'linux' | 'cross-platform';
  language?: string;
  buildSystem?: string;
  confidence: number;
  detectedFiles: string[];
  dependencies?: string[];
  // Security-specific information
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'maven' | 'gradle' | 'composer' | 'bundler' | 'cargo' | 'go' | 'nuget' | 'cocoapods' | 'pod';
  securityFrameworks?: string[];
  usesAuth?: boolean;
  hasDatabase?: boolean;
  detectedBy?: string[];
}

export interface TechnologyFingerprint {
  name: string;
  type: 'build' | 'framework' | 'language' | 'platform' | 'dependency';
  confidence: number;
  indicators: string[];
}

export interface FileAnalysis {
  path: string;
  content: string;
  language: string;
}

@Injectable()
export class EnhancedProjectDetectorService {
  async detectProjectType(sessionId: string, repoId: string): Promise<ProjectType> {
    // This would be implemented with GitHub file fetching
    // For now, returning a more detailed structure
    return {
      type: 'web',
      framework: 'React',
      platform: 'web',
      language: 'TypeScript',
      buildSystem: 'npm',
      confidence: 95,
      detectedFiles: [],
      dependencies: ['react', 'typescript'],
      packageManager: 'npm',
      detectedBy: ['package.json', 'react dependency'],
    };
  }

  async analyzeRepository(files: FileAnalysis[]): Promise<ProjectType> {
    const fingerprints = this.generateFingerprints(files);
    const projectType = this.determineProjectFromFingerprints(fingerprints);
    
    return {
      ...projectType,
      detectedFiles: files.map(f => f.path),
      dependencies: this.extractDependencies(files),
    };
  }

  private generateFingerprints(files: FileAnalysis[]): TechnologyFingerprint[] {
    const fingerprints: TechnologyFingerprint[] = [];

    // Build system detection
    fingerprints.push(...this.detectBuildSystems(files));
    
    // Framework detection
    fingerprints.push(...this.detectFrameworks(files));
    
    // Language detection
    fingerprints.push(...this.detectLanguages(files));
    
    // Platform detection
    fingerprints.push(...this.detectPlatforms(files));

    return fingerprints;
  }

  private detectBuildSystems(files: FileAnalysis[]): TechnologyFingerprint[] {
    const fingerprints: TechnologyFingerprint[] = [];

    // Node.js build systems
    if (files.some(f => f.path.includes('package.json'))) {
      fingerprints.push({
        name: 'npm',
        type: 'build',
        confidence: 90,
        indicators: ['package.json'],
      });
    }
    
    if (files.some(f => f.path.includes('yarn.lock'))) {
      fingerprints.push({
        name: 'yarn',
        type: 'build',
        confidence: 95,
        indicators: ['yarn.lock'],
      });
    }

    if (files.some(f => f.path.includes('pnpm-lock.yaml'))) {
      fingerprints.push({
        name: 'pnpm',
        type: 'build',
        confidence: 95,
        indicators: ['pnpm-lock.yaml'],
      });
    }

    // Python build systems
    if (files.some(f => f.path.includes('requirements.txt'))) {
      fingerprints.push({
        name: 'pip',
        type: 'build',
        confidence: 90,
        indicators: ['requirements.txt'],
      });
    }

    if (files.some(f => f.path.includes('pyproject.toml'))) {
      fingerprints.push({
        name: 'poetry',
        type: 'build',
        confidence: 90,
        indicators: ['pyproject.toml'],
      });
    }

    // Java build systems
    if (files.some(f => f.path.includes('pom.xml'))) {
      fingerprints.push({
        name: 'maven',
        type: 'build',
        confidence: 90,
        indicators: ['pom.xml'],
      });
    }

    if (files.some(f => f.path.includes('build.gradle'))) {
      fingerprints.push({
        name: 'gradle',
        type: 'build',
        confidence: 90,
        indicators: ['build.gradle'],
      });
    }

    // Flutter
    if (files.some(f => f.path.includes('pubspec.yaml'))) {
      fingerprints.push({
        name: 'flutter',
        type: 'build',
        confidence: 95,
        indicators: ['pubspec.yaml'],
      });
    }

    // iOS/CocoaPods
    if (files.some(f => f.path.includes('Podfile'))) {
      fingerprints.push({
        name: 'cocoapods',
        type: 'build',
        confidence: 90,
        indicators: ['Podfile'],
      });
    }

    return fingerprints;
  }

  private detectFrameworks(files: FileAnalysis[]): TechnologyFingerprint[] {
    const fingerprints: TechnologyFingerprint[] = [];

    // React Native detection
    const packageJson = files.find(f => f.path.includes('package.json'));
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        if (pkg.dependencies?.['react-native']) {
          const hasAndroid = files.some(f => f.path.includes('android/'));
          const hasIOS = files.some(f => f.path.includes('ios/'));
          
          fingerprints.push({
            name: 'React Native',
            type: 'framework',
            confidence: (hasAndroid && hasIOS) ? 99 : 85,
            indicators: ['react-native dependency', hasAndroid && 'android folder', hasIOS && 'ios folder'].filter(Boolean) as string[],
          });
        }

        // Next.js
        if (pkg.dependencies?.next) {
          fingerprints.push({
            name: 'Next.js',
            type: 'framework',
            confidence: 95,
            indicators: ['next dependency'],
          });
        }

        // Expo
        if (pkg.dependencies?.expo) {
          fingerprints.push({
            name: 'Expo React Native',
            type: 'framework',
            confidence: 95,
            indicators: ['expo dependency'],
          });
        }

        // Ionic
        if (pkg.dependencies?.['@ionic/react'] || pkg.dependencies?.['@ionic/angular']) {
          fingerprints.push({
            name: 'Ionic',
            type: 'framework',
            confidence: 90,
            indicators: ['@ionic dependency'],
          });
        }
      } catch (e) {
        // Invalid JSON, continue
      }
    }

    // Android detection
    if (files.some(f => f.path.includes('AndroidManifest.xml'))) {
      const buildGradle = files.some(f => f.path.includes('build.gradle'));
      const kotlinFiles = files.some(f => f.path.endsWith('.kt'));
      
      fingerprints.push({
        name: 'Android',
        type: 'framework',
        confidence: buildGradle ? 95 : 85,
        indicators: ['AndroidManifest.xml', buildGradle && 'build.gradle', kotlinFiles && 'Kotlin files'].filter(Boolean) as string[],
      });
    }

    // iOS detection
    if (files.some(f => f.path.endsWith('.xcodeproj')) || files.some(f => f.path.endsWith('.xcworkspace'))) {
      fingerprints.push({
        name: 'iOS',
        type: 'framework',
        confidence: 95,
        indicators: ['.xcodeproj or .xcworkspace'],
      });
    }

    if (files.some(f => f.path.includes('Info.plist'))) {
      fingerprints.push({
        name: 'iOS',
        type: 'framework',
        confidence: 90,
        indicators: ['Info.plist'],
      });
    }

    // Laravel detection
    if (files.some(f => f.path.includes('artisan')) || files.some(f => f.path.includes('routes/web.php'))) {
      fingerprints.push({
        name: 'Laravel',
        type: 'framework',
        confidence: 95,
        indicators: ['artisan', 'routes/web.php'],
      });
    }

    // Spring Boot detection
    for (const file of files) {
      if (file.content.includes('@SpringBootApplication')) {
        fingerprints.push({
          name: 'Spring Boot',
          type: 'framework',
          confidence: 95,
          indicators: ['@SpringBootApplication annotation'],
        });
        break;
      }
    }

    // Django detection
    if (files.some(f => f.path.includes('settings.py')) || files.some(f => f.path.includes('manage.py'))) {
      fingerprints.push({
        name: 'Django',
        type: 'framework',
        confidence: 90,
        indicators: ['settings.py', 'manage.py'],
      });
    }

    // FastAPI detection
    const requirements = files.find(f => f.path.includes('requirements.txt'));
    if (requirements) {
      if (requirements.content.includes('fastapi') || requirements.content.includes('uvicorn')) {
        fingerprints.push({
          name: 'FastAPI',
          type: 'framework',
          confidence: 90,
          indicators: ['fastapi in requirements'],
        });
      }
    }

    // .NET MAUI detection
    if (files.some(f => f.path.includes('MauiProgram.cs'))) {
      fingerprints.push({
        name: '.NET MAUI',
        type: 'framework',
        confidence: 95,
        indicators: ['MauiProgram.cs'],
      });
    }

    // Capacitor detection
    if (files.some(f => f.path.includes('capacitor.config.ts') || f.path.includes('capacitor.config.json'))) {
      fingerprints.push({
        name: 'Capacitor',
        type: 'framework',
        confidence: 95,
        indicators: ['capacitor.config'],
      });
    }

    return fingerprints;
  }

  private detectLanguages(files: FileAnalysis[]): TechnologyFingerprint[] {
    const fingerprints: TechnologyFingerprint[] = [];
    const extensions = files.map(f => f.path.split('.').pop()?.toLowerCase());

    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      jsx: 'JavaScript',
      ts: 'TypeScript',
      tsx: 'TypeScript',
      py: 'Python',
      java: 'Java',
      kt: 'Kotlin',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      rb: 'Ruby',
      php: 'PHP',
      dart: 'Dart',
    };

    const languageCounts: Record<string, number> = {};
    extensions.forEach(ext => {
      if (ext && languageMap[ext]) {
        languageCounts[languageMap[ext]] = (languageCounts[languageMap[ext]] || 0) + 1;
      }
    });

    Object.entries(languageCounts).forEach(([language, count]) => {
      fingerprints.push({
        name: language,
        type: 'language',
        confidence: Math.min(100, count * 10),
        indicators: [`${count} ${language} files`],
      });
    });

    return fingerprints;
  }

  private detectPlatforms(files: FileAnalysis[]): TechnologyFingerprint[] {
    const fingerprints: TechnologyFingerprint[] = [];

    // Android platform
    if (files.some(f => f.path.includes('android/') || f.path.includes('AndroidManifest.xml'))) {
      fingerprints.push({
        name: 'Android',
        type: 'platform',
        confidence: 90,
        indicators: ['android folder or AndroidManifest.xml'],
      });
    }

    // iOS platform
    if (files.some(f => f.path.includes('ios/') || f.path.includes('.xcodeproj'))) {
      fingerprints.push({
        name: 'iOS',
        type: 'platform',
        confidence: 90,
        indicators: ['ios folder or .xcodeproj'],
      });
    }

    // Web platform
    if (files.some(f => f.path.includes('index.html') || f.path.includes('public/'))) {
      fingerprints.push({
        name: 'Web',
        type: 'platform',
        confidence: 80,
        indicators: ['index.html or public folder'],
      });
    }

    return fingerprints;
  }

  private determineProjectFromFingerprints(fingerprints: TechnologyFingerprint[]): ProjectType {
    const frameworks = fingerprints.filter(f => f.type === 'framework');
    const platforms = fingerprints.filter(f => f.type === 'platform');
    const languages = fingerprints.filter(f => f.type === 'language');
    const builds = fingerprints.filter(f => f.type === 'build');

    // Determine project type based on framework
    const topFramework = frameworks.sort((a, b) => b.confidence - a.confidence)[0];
    
    let projectType: ProjectType = {
      type: 'other',
      confidence: 0,
      detectedFiles: [],
      detectedBy: [],
    };

    if (topFramework) {
      projectType.framework = topFramework.name;
      projectType.confidence = topFramework.confidence;
      projectType.detectedBy = topFramework.indicators;

      // Determine project type category
      if (['React Native', 'Flutter', 'Ionic', 'Android', 'iOS', '.NET MAUI', 'Capacitor'].includes(topFramework.name)) {
        projectType.type = 'mobile';
      } else if (['Laravel', 'Spring Boot', 'Django', 'FastAPI', 'Express', 'NestJS'].includes(topFramework.name)) {
        projectType.type = 'backend';
      } else if (['Electron', 'Tauri'].includes(topFramework.name)) {
        projectType.type = 'desktop';
      } else {
        projectType.type = 'web';
      }
    }

    // Determine platforms
    if (platforms.length > 0) {
      const platformNames = platforms.map(p => p.name);
      if (platformNames.length === 1) {
        projectType.platform = platformNames[0] as any;
      } else {
        projectType.platform = 'cross-platform';
      }
    }

    // Determine primary language
    const topLanguage = languages.sort((a, b) => b.confidence - a.confidence)[0];
    if (topLanguage) {
      projectType.language = topLanguage.name;
    }

    // Determine build system
    const topBuild = builds.sort((a, b) => b.confidence - a.confidence)[0];
    if (topBuild) {
      projectType.buildSystem = topBuild.name;
      projectType.packageManager = topBuild.name as any;
    }

    return projectType;
  }

  private extractDependencies(files: FileAnalysis[]): string[] {
    const dependencies: string[] = [];

    const packageJson = files.find(f => f.path.includes('package.json'));
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        dependencies.push(...Object.keys(allDeps));
      } catch (e) {
        // Invalid JSON
      }
    }

    const requirements = files.find(f => f.path.includes('requirements.txt'));
    if (requirements) {
      const deps = requirements.content.split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('==')[0].split('>=')[0].trim());
      dependencies.push(...deps);
    }

    return dependencies;
  }

  detectLanguage(path: string): string {
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
      gradle: 'gradle',
      maven: 'xml',
    };
    return languageMap[ext] || 'unknown';
  }
}
