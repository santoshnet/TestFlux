import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProjectDetectorService, ProjectType } from './project-detector.service';
import { createAIProvider, IAIProvider } from '@aia/ai-provider';
import { ConfigService } from '@nestjs/config';
import { GitHubRepositoriesService } from '../github-repositories/github-repositories.service';

export interface GeneratedTestFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

export interface TestGenerationResult {
  projectType: ProjectType;
  generatedTests: GeneratedTestFile[];
  summary: string;
  instructions: string;
}

@Injectable()
export class UnitTestGenerationService {
  private aiProvider: IAIProvider | null = null;

  constructor(
    private projectDetector: ProjectDetectorService,
    private configService: ConfigService,
    private githubRepositoriesService: GitHubRepositoriesService,
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
      console.warn('Failed to initialize AI provider for test generation:', error);
    }
  }

  async generateUnitTests(sessionId: string, repoId: string): Promise<TestGenerationResult> {
    try {
      // Detect project type
      const projectType = await this.projectDetector.detectProjectType(sessionId, repoId);
      
      // Get source files to analyze
      const sourceFiles = await this.getSourceFiles(sessionId, repoId, projectType);
      
      if (sourceFiles.length === 0) {
        // No source files found, generate a basic template instead
        return this.generateFallbackResult(projectType, repoId);
      }
      
      // Generate tests for each source file
      const generatedTests = await this.generateTestsForFiles(sourceFiles, projectType);
      
      if (generatedTests.length === 0) {
        return this.generateFallbackResult(projectType, repoId);
      }
      
      // Create summary and instructions
      const summary = this.generateSummary(projectType, generatedTests);
      const instructions = this.generateInstructions(projectType);

      return {
        projectType,
        generatedTests,
        summary,
        instructions,
      };
    } catch (error) {
      console.error('Error generating unit tests:', error);
      throw new InternalServerErrorException('Failed to generate unit tests');
    }
  }

  private async getSourceFiles(sessionId: string, repoId: string, projectType: ProjectType) {
    const sourcePaths = this.getSourcePathsForProjectType(projectType.type);
    const sourceFiles: Array<{ path: string; content: string; language: string }> = [];

    // Try to get files from each source path
    for (const path of sourcePaths) {
      try {
        const files = await this.githubRepositoriesService.getRepositoryFiles(sessionId, repoId, path);
        
        for (const file of files) {
          if (file.type === 'file' && this.isSourceFile(file.name)) {
            try {
              const fileContent = await this.githubRepositoriesService.getFileContent(sessionId, repoId, file.path);
              sourceFiles.push({
                path: file.path,
                content: this.decodeContent(fileContent.content, fileContent.encoding),
                language: this.detectLanguage(file.name),
              });
            } catch (error) {
              console.warn(`Could not read file: ${file.path}`);
            }
          }
        }
      } catch (error) {
        console.warn(`Could not access path: ${path}`);
        // Continue to next path
      }
    }

    // If no files found in specific paths, try root directory
    if (sourceFiles.length === 0) {
      try {
        const rootFiles = await this.githubRepositoriesService.getRepositoryFiles(sessionId, repoId, '');
        for (const file of rootFiles) {
          if (file.type === 'file' && this.isSourceFile(file.name)) {
            try {
              const fileContent = await this.githubRepositoriesService.getFileContent(sessionId, repoId, file.path);
              sourceFiles.push({
                path: file.path,
                content: this.decodeContent(fileContent.content, fileContent.encoding),
                language: this.detectLanguage(file.name),
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

    // Return files if found, otherwise return empty array but with a note
    return sourceFiles.slice(0, 8); // Limit to 8 files for performance
  }

  private getSourcePathsForProjectType(projectType: string): string[] {
    const paths: Record<string, string[]> = {
      react: ['src', 'src/components', 'src/pages', 'src/hooks', 'src/utils'],
      'react-native': ['src', 'components', 'screens', 'hooks', 'utils'],
      vue: ['src', 'src/components', 'src/views', 'src/composables'],
      angular: ['src', 'src/app', 'src/components', 'src/services'],
      java: ['src/main/java', 'src/main'],
      python: ['src', 'app', 'lib'],
      node: ['src', 'lib', 'server'],
      go: ['cmd', 'pkg', 'internal'],
      rust: ['src'],
      other: ['src', 'lib', 'app'],
    };

    return paths[projectType] || paths.other;
  }

  private isSourceFile(fileName: string): boolean {
    const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.vue', '.rb', '.php', '.cs', '.c', '.cpp', '.h', '.hpp', '.swift', '.kt', '.scala', '.clj', '.ex', '.exs'];
    const excludePatterns = ['.test.', '.spec.', '.config.', '.d.ts', '.min.', '.bundle.', '.map', '.lock'];
    
    const hasSourceExtension = sourceExtensions.some(ext => fileName.endsWith(ext));
    const isNotTestFile = !excludePatterns.some(pattern => fileName.includes(pattern));
    const isNotLockFile = !fileName.endsWith('.lock');
    const isNotMinified = !fileName.includes('.min.');
    
    return hasSourceExtension && isNotTestFile && isNotLockFile && isNotMinified;
  }

  private decodeContent(content: string, encoding: string): string {
    if (encoding === 'base64') {
      return Buffer.from(content, 'base64').toString('utf-8');
    }
    return content;
  }

  private detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
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
    };
    return languageMap[ext] || 'javascript';
  }

  private async generateTestsForFiles(
    sourceFiles: Array<{ path: string; content: string; language: string }>,
    projectType: ProjectType
  ): Promise<GeneratedTestFile[]> {
    const generatedTests: GeneratedTestFile[] = [];

    for (const sourceFile of sourceFiles) {
      try {
        const testContent = await this.generateTestForFile(sourceFile, projectType);
        
        const testPath = this.getTestPath(sourceFile.path, projectType.type);
        
        generatedTests.push({
          path: testPath,
          content: testContent,
          language: sourceFile.language,
          description: `Unit tests for ${sourceFile.path}`,
        });
      } catch (error) {
        console.warn(`Failed to generate tests for ${sourceFile.path}:`, error);
      }
    }

    return generatedTests;
  }

  private async generateTestForFile(
    sourceFile: { path: string; content: string; language: string },
    projectType: ProjectType
  ): Promise<string> {
    if (!this.aiProvider) {
      return this.generateMockTest(sourceFile, projectType);
    }

    const prompt = `Generate comprehensive unit tests for the following source code.

Project Type: ${projectType.type}
Framework: ${projectType.framework || 'Unknown'}
Testing Framework: ${projectType.testingFramework || 'Jest'}
Language: ${sourceFile.language}

File: ${sourceFile.path}

Source Code:
\`\`\`
${sourceFile.content}
\`\`\`

Requirements:
1. Generate complete, runnable unit tests
2. Test all major functions and components
3. Include edge cases and error handling
4. Use appropriate assertions for the testing framework
5. Add clear comments explaining what each test does
6. Mock external dependencies appropriately
7. Follow testing best practices for ${projectType.testingFramework || 'Jest'}

Return only the test code, no explanations.`;

    try {
      const response = await this.aiProvider.chat(prompt);
      return response;
    } catch (error) {
      console.error('AI test generation failed, falling back to mock:', error);
      return this.generateMockTest(sourceFile, projectType);
    }
  }

  private generateMockTest(
    sourceFile: { path: string; content: string; language: string },
    projectType: ProjectType
  ): string {
    const testingFramework = projectType.testingFramework || 'Jest';
    const fileName = sourceFile.path.split('/').pop()?.split('.')[0] || 'module';
    
    let testTemplate = '';

    switch (projectType.type) {
      case 'react':
      case 'react-native':
      case 'vue':
      case 'angular':
      case 'node':
        testTemplate = this.generateJavaScriptTest(fileName, testingFramework);
        break;
      case 'java':
        testTemplate = this.generateJavaTest(fileName, testingFramework);
        break;
      case 'python':
        testTemplate = this.generatePythonTest(fileName, testingFramework);
        break;
      case 'go':
        testTemplate = this.generateGoTest(fileName, testingFramework);
        break;
      case 'rust':
        testTemplate = this.generateRustTest(fileName, testingFramework);
        break;
      default:
        testTemplate = this.generateJavaScriptTest(fileName, testingFramework);
    }

    return testTemplate;
  }

  private generateJavaScriptTest(fileName: string, framework: string): string {
    if (framework === 'Mocha' || framework === 'Jasmine') {
      return `// Unit tests for ${fileName}
// Generated for ${framework}

const expect = require('chai').expect;

describe('${fileName}', () => {
  describe('Basic functionality', () => {
    it('should initialize correctly', () => {
      // Add test implementation here
      expect(true).to.be.true;
    });

    it('should handle edge cases', () => {
      // Add edge case tests here
      expect(true).to.be.true;
    });

    it('should handle errors gracefully', () => {
      // Add error handling tests here
      expect(true).to.be.true;
    });
  });

  describe('Integration scenarios', () => {
    it('should work with dependencies', () => {
      // Add integration tests here
      expect(true).to.be.true;
    });
  });
});
`;
    }
    
    // Default to Jest
    return `// Unit tests for ${fileName}
// Generated for Jest

describe('${fileName}', () => {
  describe('Basic functionality', () => {
    it('should initialize correctly', () => {
      // Add test implementation here
      expect(true).toBe(true);
    });

    it('should handle edge cases', () => {
      // Add edge case tests here
      expect(true).toBe(true);
    });

    it('should handle errors gracefully', () => {
      // Add error handling tests here
      expect(() => {
        // Add error test here
      }).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should work with dependencies', () => {
      // Add integration tests here
      expect(true).toBe(true);
    });
  });
});
`;
  }

  private generateJavaTest(fileName: string, framework: string): string {
    return `// Unit tests for ${fileName}
// Generated for ${framework || 'JUnit'}

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

class ${fileName}Test {

    @BeforeEach
    void setUp() {
        // Setup test data here
    }

    @Test
    void shouldInitializeCorrectly() {
        // Add test implementation here
        assertTrue(true);
    }

    @Test
    void shouldHandleEdgeCases() {
        // Add edge case tests here
        assertTrue(true);
    }

    @Test
    void shouldHandleErrorsGracefully() {
        // Add error handling tests here
        assertDoesNotThrow(() -> {
            // Add error test here
        });
    }
}
`;
  }

  private generatePythonTest(fileName: string, framework: string): string {
    return `# Unit tests for ${fileName}
# Generated for ${framework || 'Pytest'}

import pytest

class Test${fileName.charAt(0).toUpperCase() + fileName.slice(1)}:

    def test_initialization(self):
        # Add test implementation here
        assert True

    def test_edge_cases(self):
        # Add edge case tests here
        assert True

    def test_error_handling(self):
        # Add error handling tests here
        with pytest.raises(Exception):
            pass

    def test_integration_scenarios(self):
        # Add integration tests here
        assert True
`;
  }

  private generateGoTest(fileName: string, framework: string): string {
    return `// Unit tests for ${fileName}
// Generated for Go testing

package main

import (
    "testing"
)

func Test${fileName.charAt(0).toUpperCase() + fileName.slice(1)}(t *testing.T) {
    t.Run("initialization", func(t *testing.T) {
        // Add test implementation here
    })

    t.Run("edge_cases", func(t *testing.T) {
        // Add edge case tests here
    })

    t.Run("error_handling", func(t *testing.T) {
        // Add error handling tests here
    })
}
`;
  }

  private generateRustTest(fileName: string, framework: string): string {
    return `// Unit tests for ${fileName}
// Generated for Rust testing

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initialization() {
        // Add test implementation here
        assert!(true);
    }

    #[test]
    fn test_edge_cases() {
        // Add edge case tests here
        assert!(true);
    }

    #[test]
    fn test_error_handling() {
        // Add error handling tests here
    }
}
`;
  }

  private getTestPath(sourcePath: string, projectType: string): string {
    const ext = sourcePath.split('.').pop();
    const basePath = sourcePath.substring(0, sourcePath.lastIndexOf('.'));
    
    // Test file naming conventions
    let testExt = '.test.';
    let testSuffix = 'spec';
    
    switch (projectType) {
      case 'java':
        return `${basePath}Test.java`;
      case 'python':
        return `test_${basePath.replace(/\//g, '_')}.py`;
      case 'go':
        return `${basePath}_test.go`;
      case 'rust':
        return `${basePath}_test.rs`;
      default:
        // JavaScript/TypeScript frameworks
        return `${basePath}.test.${ext}`;
    }
  }

  private generateSummary(projectType: ProjectType, tests: GeneratedTestFile[]): string {
    return `Generated ${tests.length} unit test files for ${projectType.type} project using ${projectType.testingFramework || 'Jest'}.
Framework: ${projectType.framework || 'Unknown'}
Project Type: ${projectType.type}
Confidence: ${Math.round(projectType.confidence * 100)}%
`;
  }

  private generateInstructions(projectType: ProjectType): string {
    let instructions = `## Running the Generated Tests\n\n`;
    
    switch (projectType.type) {
      case 'react':
      case 'react-native':
      case 'vue':
      case 'angular':
      case 'node':
        instructions += `### Using ${projectType.testingFramework || 'Jest'}:
\`\`\`bash
npm install
npm test
\`\`\`

### Running specific tests:
\`\`\`bash
npm test -- --testPathPattern=filename
\`\`\`

### With coverage:
\`\`\`bash
npm test -- --coverage
\`\`\``;
        break;
      case 'java':
        instructions += `### Using ${projectType.testingFramework || 'JUnit'}:
\`\`\`bash
mvn test
\`\`\`

### Running specific tests:
\`\`\`bash
mvn test -Dtest=ClassName
\`\`\``;
        break;
      case 'python':
        instructions += `### Using ${projectType.testingFramework || 'Pytest'}:
\`\`\`bash
pip install pytest
pytest
\`\`\`

### Running specific tests:
\`\`\`bash
pytest test_filename.py
\`\`\`

### With coverage:
\`\`\`bash
pytest --cov=src --cov-report=html
\`\`\``;
        break;
      case 'go':
        instructions += `### Using Go test:
\`\`\`bash
go test ./...
\`\`\`

### Running specific tests:
\`\`\`bash
go test ./path/to/package
\`\`\`

### With coverage:
\`\`\`bash
go test -cover ./...
\`\`\``;
        break;
      case 'rust':
        instructions += `### Using Cargo test:
\`\`\`bash
cargo test
\`\`\`

### Running specific tests:
\`\`\`bash
cargo test test_name
\`\`\`

### With coverage:
\`\`\`bash
cargo test --coverage
\`\`\``;
        break;
      default:
        instructions += `Please consult your framework's documentation for running tests.`;
    }

    return instructions;
  }

  private generateFallbackResult(projectType: ProjectType, repoId: string): TestGenerationResult {
    // Generate a basic test file as a fallback
    const testFileName = this.getFallbackTestFileName(projectType.type);
    const testContent = this.generateFallbackTestContent(projectType);
    
    const fallbackTest: GeneratedTestFile = {
      path: testFileName,
      content: testContent,
      language: this.getLanguageForProjectType(projectType.type),
      description: `Template test file for ${projectType.type} project`,
    };

    return {
      projectType,
      generatedTests: [fallbackTest],
      summary: `Generated 1 template unit test file for ${projectType.type} project. 
Note: No source files were detected in the repository structure, so a template test file was generated as a starting point.`,
      instructions: this.generateInstructions(projectType),
    };
  }

  private getFallbackTestFileName(projectType: string): string {
    const fileNames: Record<string, string> = {
      react: 'src/__tests__/App.test.tsx',
      'react-native': 'src/__tests__/App.test.tsx',
      vue: 'src/__tests__/App.spec.ts',
      angular: 'src/app/app.component.spec.ts',
      java: 'src/test/java/AppTest.java',
      python: 'tests/test_app.py',
      node: 'src/app.test.js',
      go: 'app_test.go',
      rust: 'tests/basic_test.rs',
      other: 'test.example.js',
    };
    
    return fileNames[projectType] || fileNames.other;
  }

  private getLanguageForProjectType(projectType: string): string {
    const languages: Record<string, string> = {
      react: 'typescript',
      'react-native': 'typescript',
      vue: 'typescript',
      angular: 'typescript',
      java: 'java',
      python: 'python',
      node: 'javascript',
      go: 'go',
      rust: 'rust',
      other: 'javascript',
    };
    
    return languages[projectType] || languages.other;
  }

  private generateFallbackTestContent(projectType: ProjectType): string {
    const fileName = 'ExampleComponent';
    const testingFramework = projectType.testingFramework || 'Jest';
    
    let template = '';
    
    if (['react', 'react-native', 'vue', 'angular', 'node'].includes(projectType.type)) {
      template = `// Template test file for ${projectType.type}
// Replace this with your actual test cases
// Framework: ${testingFramework}

${this.getJavaScriptTestTemplate(fileName, testingFramework)}`;
    } else if (projectType.type === 'java') {
      template = `// Template test file for Java
// Replace this with your actual test cases
// Framework: ${testingFramework || 'JUnit'}

${this.getJavaTestTemplate(fileName, testingFramework || 'JUnit')}`;
    } else if (projectType.type === 'python') {
      template = `# Template test file for Python
// Replace this with your actual test cases
// Framework: ${testingFramework || 'Pytest'}

${this.getPythonTestTemplate(fileName, testingFramework || 'Pytest')}`;
    } else if (projectType.type === 'go') {
      template = `// Template test file for Go
// Replace this with your actual test cases
// Framework: Go test

${this.getGoTestTemplate(fileName)}`;
    } else if (projectType.type === 'rust') {
      template = `// Template test file for Rust
// Replace this with your actual test cases
// Framework: Rust test

${this.getRustTestTemplate(fileName)}`;
    } else {
      template = this.getJavaScriptTestTemplate(fileName, testingFramework);
    }
    
    return template;
  }

  private getJavaScriptTestTemplate(fileName: string, framework: string): string {
    if (framework === 'Mocha' || framework === 'Jasmine') {
      return `const expect = require('chai').expect;

describe('${fileName}', () => {
  describe('Basic functionality', () => {
    it('should initialize correctly', () => {
      expect(true).to.be.true;
    });

    it('should handle expected inputs', () => {
      expect(true).to.be.true;
    });

    it('should handle error cases', () => {
      expect(() => {
        // Add error test here
      }).to.not.throw();
    });
  });
});`;
    }
    
    // Default to Jest
    return `describe('${fileName}', () => {
  describe('Basic functionality', () => {
    it('should initialize correctly', () => {
      expect(true).toBe(true);
    });

    it('should handle expected inputs', () => {
      expect(true).toBe(true);
    });

    it('should handle error cases', () => {
      expect(() => {
        // Add error test here
      }).not.toThrow();
    });
  });
});`;
  }

  private getJavaTestTemplate(fileName: string, framework: string): string {
    return `import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ${fileName}Test {

    @Test
    void shouldInitializeCorrectly() {
        assertTrue(true);
    }

    @Test
    void shouldHandleExpectedInputs() {
        assertTrue(true);
    }

    @Test
    void shouldHandleErrorCases() {
        assertDoesNotThrow(() -> {
            // Add error test here
        });
    }
}`;
  }

  private getPythonTestTemplate(fileName: string, framework: string): string {
    return `import pytest

class Test${fileName.charAt(0).toUpperCase() + fileName.slice(1)}:

    def test_initialization(self):
        assert True

    def test_expected_behavior(self):
        assert True

    def test_error_handling(self):
        with pytest.raises(Exception):
            pass`;
  }

  private getGoTestTemplate(fileName: string): string {
    return `func Test${fileName.charAt(0).toUpperCase() + fileName.slice(1)}(t *testing.T) {
    t.Run("initialization", func(t *testing.T) {
        // Add test implementation
    })

    t.Run("expected_behavior", func(t *testing.T) {
        // Add test implementation
    })

    t.Run("error_handling", func(t *testing.T) {
        // Add test implementation
    })
}`;
  }

  private getRustTestTemplate(fileName: string): string {
    return `#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initialization() {
        assert!(true);
    }

    #[test]
    fn test_expected_behavior() {
        assert!(true);
    }

    #[test]
    fn test_error_handling() {
        // Add error test here
    }
}`;
  }
}
