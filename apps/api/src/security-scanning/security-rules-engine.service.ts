import { Injectable } from '@nestjs/common';
import { ProjectType } from '../unit-test-generation/project-detector.service';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  cwe?: string;
  owasp?: string;
  patterns: string[];
  frameworks?: string[];
  languages?: string[];
}

export interface SecurityIssue {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  cwe?: string;
  owasp?: string;
  file: string;
  line: number;
  code: string;
  suggestion?: string;
  fix?: string;
}

@Injectable()
export class SecurityRulesEngine {
  private rules: SecurityRule[] = this.initializeRules();

  getRulesForProject(projectType: ProjectType): SecurityRule[] {
    return this.rules.filter(rule => {
      // Filter by language/framework if specified
      if (rule.languages && !rule.languages.includes(this.mapProjectTypeToLanguage(projectType.type))) {
        return false;
      }
      
      if (rule.frameworks && !rule.frameworks.some(f => 
        projectType.framework?.toLowerCase().includes(f.toLowerCase())
      )) {
        return false;
      }
      
      return true;
    });
  }

  private mapProjectTypeToLanguage(type: string): string {
    const mapping: Record<string, string> = {
      react: 'javascript',
      'react-native': 'javascript',
      vue: 'javascript',
      angular: 'javascript',
      java: 'java',
      python: 'python',
      node: 'javascript',
      go: 'go',
      rust: 'rust',
      laravel: 'php',
      dotnet: 'csharp',
      other: 'javascript',
    };
    return mapping[type] || 'javascript';
  }

  private initializeRules(): SecurityRule[] {
    return [
      // JavaScript/Node.js/React Rules
      {
        id: 'JS-EVAL-001',
        name: 'Use of eval()',
        description: 'The eval() function executes arbitrary JavaScript code and can lead to code injection vulnerabilities',
        severity: 'critical',
        category: 'Code Injection',
        cwe: 'CWE-95',
        owasp: 'A03:2021 - Injection',
        patterns: ['eval('],
        languages: ['javascript'],
      },
      {
        id: 'JS-FUNCTION-001',
        name: 'Use of new Function()',
        description: 'Creating functions from strings is dangerous and can lead to code injection',
        severity: 'critical',
        category: 'Code Injection',
        cwe: 'CWE-95',
        owasp: 'A03:2021 - Injection',
        patterns: ['new Function('],
        languages: ['javascript'],
      },
      {
        id: 'JS-COMMAND-001',
        name: 'Use of child_process.exec()',
        description: 'Executing shell commands with user input can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['child_process.exec('],
        languages: ['javascript'],
      },
      {
        id: 'JS-SQL-001',
        name: 'SQL Injection via string concatenation',
        description: 'Building SQL queries with string concatenation allows SQL injection attacks',
        severity: 'critical',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['SELECT *', 'INSERT INTO', 'UPDATE', 'DELETE FROM'],
        languages: ['javascript'],
      },
      {
        id: 'REACT-XSS-001',
        name: 'Use of dangerouslySetInnerHTML',
        description: 'Rendering raw HTML can lead to XSS attacks',
        severity: 'high',
        category: 'XSS',
        cwe: 'CWE-79',
        owasp: 'A03:2021 - Injection',
        patterns: ['dangerouslySetInnerHTML'],
        frameworks: ['react', 'next'],
      },
      {
        id: 'REACT-TARGET-001',
        name: 'External links without rel="noopener noreferrer"',
        description: 'External links without noopener noreferrer are vulnerable to tabnabbing attacks',
        severity: 'medium',
        category: 'XSS',
        cwe: 'CWE-1022',
        owasp: 'A05:2021 - Security Misconfiguration',
        patterns: ['target="_blank"'],
        frameworks: ['react', 'next'],
      },
      // Next.js Specific Rules
      {
        id: 'NEXT-SECRET-001',
        name: 'Hardcoded secrets in environment files',
        description: 'Hardcoded secrets should not be committed to version control',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['API_KEY', 'SECRET_KEY', 'PASSWORD', 'TOKEN'],
        frameworks: ['next'],
      },
      {
        id: 'NEXT-SSRF-001',
        name: 'Potential Server-Side Request Forgery',
        description: 'Making HTTP requests to user-provided URLs can lead to SSRF attacks',
        severity: 'high',
        category: 'SSRF',
        cwe: 'CWE-918',
        owasp: 'A10:2021 - Server-Side Request Forgery',
        patterns: ['fetch(req.url)', 'axios.get(req.url)'],
        frameworks: ['next'],
      },
      // Python Rules
      {
        id: 'PY-EVAL-001',
        name: 'Use of eval()',
        description: 'The eval() function executes arbitrary Python code and can lead to code injection vulnerabilities',
        severity: 'critical',
        category: 'Code Injection',
        cwe: 'CWE-95',
        owasp: 'A03:2021 - Injection',
        patterns: ['eval('],
        languages: ['python'],
      },
      {
        id: 'PY-EXEC-001',
        name: 'Use of exec()',
        description: 'The exec() function executes arbitrary Python code and can lead to code injection vulnerabilities',
        severity: 'critical',
        category: 'Code Injection',
        cwe: 'CWE-95',
        owasp: 'A03:2021 - Injection',
        patterns: ['exec('],
        languages: ['python'],
      },
      {
        id: 'PY-OS-001',
        name: 'Use of os.system()',
        description: 'Executing shell commands with os.system() can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['os.system('],
        languages: ['python'],
      },
      {
        id: 'PY-SQL-001',
        name: 'SQL Injection via string concatenation',
        description: 'Building SQL queries with string concatenation allows SQL injection attacks',
        severity: 'critical',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['SELECT * FROM', 'INSERT INTO', 'UPDATE', 'DELETE FROM'],
        languages: ['python'],
      },
      // Java Rules
      {
        id: 'JAVA-EXEC-001',
        name: 'Use of Runtime.exec()',
        description: 'Executing shell commands with Runtime.exec() can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['Runtime.exec('],
        languages: ['java'],
      },
      {
        id: 'JAVA-PROCESS-001',
        name: 'Use of ProcessBuilder',
        description: 'ProcessBuilder with user input can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['ProcessBuilder'],
        languages: ['java'],
      },
      {
        id: 'JAVA-SQL-001',
        name: 'SQL Injection via string concatenation',
        description: 'Building SQL queries with string concatenation allows SQL injection attacks',
        severity: 'critical',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['SELECT * FROM', 'INSERT INTO', 'UPDATE', 'DELETE FROM'],
        languages: ['java'],
      },
      // Laravel/PHP Rules
      {
        id: 'LARAVEL-RAW-001',
        name: 'Use of DB::raw()',
        description: 'Using raw SQL queries with DB::raw() can lead to SQL injection if not properly escaped',
        severity: 'high',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['DB::raw('],
        frameworks: ['laravel'],
      },
      {
        id: 'PHP-EXEC-001',
        name: 'Use of exec() or shell_exec()',
        description: 'Executing shell commands with exec() or shell_exec() can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['exec(', 'shell_exec('],
        languages: ['php'],
      },
      {
        id: 'PHP-EVAL-001',
        name: 'Use of eval()',
        description: 'The eval() function executes arbitrary PHP code and can lead to code injection vulnerabilities',
        severity: 'critical',
        category: 'Code Injection',
        cwe: 'CWE-95',
        owasp: 'A03:2021 - Injection',
        patterns: ['eval('],
        languages: ['php'],
      },
      // Go Rules
      {
        id: 'GO-EXEC-001',
        name: 'Use of exec.Command with user input',
        description: 'Executing commands with user input can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['exec.Command('],
        languages: ['go'],
      },
      {
        id: 'GO-SQL-001',
        name: 'SQL Injection via string concatenation',
        description: 'Building SQL queries with string concatenation allows SQL injection attacks',
        severity: 'critical',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['SELECT * FROM', 'INSERT INTO', 'UPDATE', 'DELETE FROM'],
        languages: ['go'],
      },
      // Rust Rules
      {
        id: 'RUST-EXEC-001',
        name: 'Use of Command with user input',
        description: 'Executing commands with user input can lead to command injection',
        severity: 'critical',
        category: 'Command Injection',
        cwe: 'CWE-78',
        owasp: 'A03:2021 - Injection',
        patterns: ['Command::new('],
        languages: ['rust'],
      },
      // General Secret Detection Rules
      {
        id: 'SEC-SECRET-001',
        name: 'Hardcoded API Key',
        description: 'Hardcoded API keys detected in source code',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['sk-', 'pk-', 'api_key=', 'apikey=', 'API_KEY='],
        languages: ['javascript', 'python', 'java', 'go', 'rust', 'php', 'csharp'],
      },
      {
        id: 'SEC-SECRET-002',
        name: 'Hardcoded AWS Key',
        description: 'Hardcoded AWS access keys detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['AKIA', 'AWS_ACCESS_KEY', 'aws_secret_access_key'],
        languages: ['javascript', 'python', 'java', 'go', 'rust', 'php', 'csharp'],
      },
      {
        id: 'SEC-SECRET-003',
        name: 'Hardcoded JWT Secret',
        description: 'Hardcoded JWT secrets detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['JWT_SECRET=', 'jwt_secret=', 'jwtSecret='],
        languages: ['javascript', 'python', 'java', 'go', 'rust', 'php', 'csharp'],
      },
      {
        id: 'SEC-SECRET-004',
        name: 'Hardcoded Database Password',
        description: 'Hardcoded database passwords detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['password=', 'db_password=', 'DATABASE_PASSWORD='],
        languages: ['javascript', 'python', 'java', 'go', 'rust', 'php', 'csharp'],
      },
      {
        id: 'SEC-SECRET-005',
        name: 'Hardcoded Private Key',
        description: 'Hardcoded private keys detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['-----BEGIN PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----'],
        languages: ['javascript', 'python', 'java', 'go', 'rust', 'php', 'csharp'],
      },
    ];
  }
}
