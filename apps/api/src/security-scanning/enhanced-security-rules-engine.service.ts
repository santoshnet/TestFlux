import { Injectable } from '@nestjs/common';

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
  platforms?: string[];
  languages?: string[];
  fix?: string;
  bestPractices?: string[];
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
  platform?: string;
  framework?: string;
  codeLanguage?: string;
}

@Injectable()
export class EnhancedSecurityRulesEngine {
  private rules: SecurityRule[] = this.initializeRules();

  getRulesForProject(projectType: any): SecurityRule[] {
    return this.rules.filter(rule => {
      // Filter by language if specified
      if (rule.languages && !rule.languages.includes(projectType.language?.toLowerCase())) {
        return false;
      }
      
      // Filter by framework if specified
      if (rule.frameworks && !rule.frameworks.some(f => 
        projectType.framework?.toLowerCase().includes(f.toLowerCase())
      )) {
        return false;
      }

      // Filter by platform if specified
      if (rule.platforms && !rule.platforms.some(p => 
        projectType.platform?.toLowerCase().includes(p.toLowerCase())
      )) {
        return false;
      }
      
      return true;
    });
  }

  private initializeRules(): SecurityRule[] {
    return [
      // === ANDROID SPECIFIC RULES ===
      {
        id: 'ANDROID-SECRET-001',
        name: 'Hardcoded API Key',
        description: 'Hardcoded API keys can be extracted from APK files',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['String API_KEY = "AIza', 'String KEY = "', 'String SECRET = "'],
        languages: ['java', 'kotlin'],
        platforms: ['android'],
        fix: 'Use Android Keystore or secure remote configuration service',
        bestPractices: ['Store secrets in Android Keystore', 'Use Firebase Remote Config', 'Use environment variables at build time'],
      },
      {
        id: 'ANDROID-STORAGE-001',
        name: 'Insecure SharedPreferences',
        description: 'Storing sensitive data in SharedPreferences without encryption',
        severity: 'high',
        category: 'Insecure Storage',
        cwe: 'CWE-922',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['SharedPreferences', 'putString("password"', 'putString("token"', 'putString("secret"'],
        languages: ['java', 'kotlin'],
        platforms: ['android'],
        fix: 'Use EncryptedSharedPreferences or Android Keystore',
        bestPractices: ['Use EncryptedSharedPreferences for sensitive data', 'Consider using Android Keystore', 'Never store passwords in plain SharedPreferences'],
      },
      {
        id: 'ANDROID-WEBVIEW-001',
        name: 'JavaScript Enabled WebView',
        description: 'WebView with JavaScript enabled can execute arbitrary code',
        severity: 'medium',
        category: 'XSS',
        cwe: 'CWE-79',
        owasp: 'A03:2021 - Injection',
        patterns: ['setJavaScriptEnabled(true)'],
        languages: ['java', 'kotlin'],
        platforms: ['android'],
        fix: 'Only enable JavaScript when absolutely necessary and implement proper input validation',
        bestPractices: ['Disable JavaScript by default', 'Use Chrome Custom Tabs for external links', 'Validate all JavaScript input'],
      },
      {
        id: 'ANDROID-WEBVIEW-002',
        name: 'Unsafe addJavascriptInterface',
        description: 'addJavascriptInterface can expose app internals to JavaScript',
        severity: 'high',
        category: 'Code Injection',
        cwe: 'CWE-939',
        owasp: 'A03:2021 - Injection',
        patterns: ['addJavascriptInterface('],
        languages: ['java', 'kotlin'],
        platforms: ['android'],
        fix: 'Use @JavascriptInterface annotation and restrict to trusted origins only',
        bestPractices: ['Always use @JavascriptInterface annotation', 'Only expose necessary methods', 'Validate all JavaScript calls'],
      },
      {
        id: 'ANDROID-HTTP-001',
        name: 'Insecure HTTP Connection',
        description: 'Using HTTP instead of HTTPS can lead to man-in-the-middle attacks',
        severity: 'high',
        category: 'Insecure Communication',
        cwe: 'CWE-319',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['http://'],
        languages: ['java', 'kotlin'],
        platforms: ['android'],
        fix: 'Always use HTTPS URLs',
        bestPractices: ['Use HTTPS for all API calls', 'Implement certificate pinning', 'Use Network Security Configuration'],
      },
      {
        id: 'ANDROID-SQL-001',
        name: 'SQL Injection in rawQuery',
        description: 'Building SQL queries with string concatenation allows SQL injection',
        severity: 'critical',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['rawQuery("SELECT *', 'rawQuery("INSERT INTO', 'rawQuery("UPDATE', 'rawQuery("DELETE FROM'],
        languages: ['java', 'kotlin'],
        platforms: ['android'],
        fix: 'Use parameterized queries with query() or @Query annotation',
        bestPractices: ['Use Room database with @Query', 'Use parameterized queries', 'Never concatenate user input into SQL'],
      },
      {
        id: 'ANDROID-FIREBASE-001',
        name: 'Firebase Insecure Rules',
        description: 'Firebase rules allowing public read/write access',
        severity: 'critical',
        category: 'Access Control',
        cwe: 'CWE-284',
        owasp: 'A01:2021 - Broken Access Control',
        patterns: ['.read: true', '.write: true', 'read: true', 'write: true'],
        languages: ['json'],
        platforms: ['android'],
        fix: 'Implement proper Firebase security rules with authentication',
        bestPractices: ['Always require authentication for read/write', 'Use Firestore rules to enforce data validation', 'Regularly audit security rules'],
      },

      // === IOS/SWIFT SPECIFIC RULES ===
      {
        id: 'IOS-SECRET-001',
        name: 'Hardcoded API Key',
        description: 'Hardcoded API keys can be extracted from IPA files',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['let apiKey = "AIza', 'let secret = "', 'let token = "'],
        languages: ['swift'],
        platforms: ['ios'],
        fix: 'Use iOS Keychain or secure environment variables',
        bestPractices: ['Store secrets in Keychain', 'Use environment variables at build time', 'Use iCloud Keychain for sync'],
      },
      {
        id: 'IOS-STORAGE-001',
        name: 'Insecure UserDefaults',
        description: 'Storing sensitive data in UserDefaults without encryption',
        severity: 'high',
        category: 'Insecure Storage',
        cwe: 'CWE-922',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['UserDefaults.standard.set(', 'password:', 'token:', 'secret:'],
        languages: ['swift'],
        platforms: ['ios'],
        fix: 'Use Keychain for sensitive data or encrypt before storing',
        bestPractices: ['Use Keychain for passwords and tokens', 'Encrypt sensitive data before UserDefaults', 'Never store credentials in UserDefaults'],
      },
      {
        id: 'IOS-HTTP-001',
        name: 'Insecure HTTP Connection',
        description: 'Using HTTP instead of HTTPS can lead to man-in-the-middle attacks',
        severity: 'high',
        category: 'Insecure Communication',
        cwe: 'CWE-319',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['http://'],
        languages: ['swift'],
        platforms: ['ios'],
        fix: 'Always use HTTPS URLs and implement App Transport Security',
        bestPractices: ['Enable App Transport Security', 'Use HTTPS for all API calls', 'Implement certificate pinning'],
      },
      {
        id: 'IOS-WEBVIEW-001',
        name: 'Unsafe WKWebView Configuration',
        description: 'WebView configuration that allows arbitrary JavaScript execution',
        severity: 'medium',
        category: 'XSS',
        cwe: 'CWE-79',
        owasp: 'A03:2021 - Injection',
        patterns: ['javaScriptEnabled = true', 'evaluateJavaScript('],
        languages: ['swift'],
        platforms: ['ios'],
        fix: 'Disable JavaScript unless necessary and validate all scripts',
        bestPractices: ['Use Safari View Controller instead', 'Disable JavaScript by default', 'Validate all JavaScript input'],
      },

      // === FLUTTER SPECIFIC RULES ===
      {
        id: 'FLUTTER-SECRET-001',
        name: 'Hardcoded API Key',
        description: 'Hardcoded API keys in Flutter code',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['const apiKey = "AIza', 'final String secret = "'],
        languages: ['dart'],
        frameworks: ['flutter'],
        fix: 'Use flutter_dotenv or secure storage',
        bestPractices: ['Use flutter_dotenv for environment variables', 'Use flutter_secure_storage for secrets', 'Use platform-specific secure storage'],
      },
      {
        id: 'FLUTTER-HTTP-001',
        name: 'Insecure HTTP Connection',
        description: 'Using HTTP instead of HTTPS in Flutter',
        severity: 'high',
        category: 'Insecure Communication',
        cwe: 'CWE-319',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['http://'],
        languages: ['dart'],
        frameworks: ['flutter'],
        fix: 'Always use HTTPS URLs',
        bestPractices: ['Use HTTPS for all API calls', 'Implement SSL pinning', 'Use dio package with SSL verification'],
      },

      // === REACT NATIVE SPECIFIC RULES ===
      {
        id: 'RN-SECRET-001',
        name: 'Hardcoded API Key',
        description: 'Hardcoded API keys in React Native code',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['const API_KEY = "AIza', 'const secret = "'],
        languages: ['javascript', 'typescript'],
        frameworks: ['react-native'],
        fix: 'Use react-native-dotenv or secure storage',
        bestPractices: ['Use react-native-dotenv for environment variables', 'Use react-native-keychain for secure storage', 'Use Expo SecureStore for Expo apps'],
      },
      {
        id: 'RN-ASYNCSTORAGE-001',
        name: 'Insecure AsyncStorage Usage',
        description: 'Storing sensitive data in AsyncStorage without encryption',
        severity: 'high',
        category: 'Insecure Storage',
        cwe: 'CWE-922',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['AsyncStorage.setItem("password"', 'AsyncStorage.setItem("token"', 'AsyncStorage.setItem("secret"'],
        languages: ['javascript', 'typescript'],
        frameworks: ['react-native'],
        fix: 'Use react-native-encrypted-storage or react-native-keychain',
        bestPractices: ['Use react-native-keychain for sensitive data', 'Encrypt before storing in AsyncStorage', 'Never store passwords in AsyncStorage'],
      },
      {
        id: 'RN-HTTP-001',
        name: 'Insecure HTTP Connection',
        description: 'Using HTTP instead of HTTPS in React Native',
        severity: 'high',
        category: 'Insecure Communication',
        cwe: 'CWE-319',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['http://'],
        languages: ['javascript', 'typescript'],
        frameworks: ['react-native'],
        fix: 'Always use HTTPS URLs',
        bestPractices: ['Use HTTPS for all API calls', 'Implement SSL pinning', 'Use axios with SSL verification'],
      },

      // === WEB FRAMEWORK RULES ===
      {
        id: 'WEB-EVAL-001',
        name: 'Use of eval()',
        description: 'The eval() function executes arbitrary code and can lead to code injection',
        severity: 'critical',
        category: 'Code Injection',
        cwe: 'CWE-95',
        owasp: 'A03:2021 - Injection',
        patterns: ['eval('],
        languages: ['javascript', 'typescript'],
        frameworks: ['react', 'vue', 'angular', 'next'],
        fix: 'Avoid using eval(). Use JSON.parse() for JSON data or safer alternatives',
        bestPractices: ['Never use eval() with user input', 'Use JSON.parse() for JSON data', 'Use Function constructor with caution'],
      },
      {
        id: 'WEB-XSS-001',
        name: 'Use of dangerouslySetInnerHTML',
        description: 'Rendering raw HTML can lead to XSS attacks',
        severity: 'high',
        category: 'XSS',
        cwe: 'CWE-79',
        owasp: 'A03:2021 - Injection',
        patterns: ['dangerouslySetInnerHTML'],
        frameworks: ['react', 'next'],
        fix: 'Use DOMPurify for sanitization or React\'s safe rendering',
        bestPractices: ['Always sanitize HTML before rendering', 'Use DOMPurify library', 'Prefer React\'s safe rendering'],
      },
      {
        id: 'WEB-TARGET-001',
        name: 'External links without rel="noopener noreferrer"',
        description: 'External links without noopener noreferrer are vulnerable to tabnabbing attacks',
        severity: 'medium',
        category: 'XSS',
        cwe: 'CWE-1022',
        owasp: 'A05:2021 - Security Misconfiguration',
        patterns: ['target="_blank"'],
        frameworks: ['react', 'vue', 'angular', 'next'],
        fix: 'Always add rel="noopener noreferrer" to external links',
        bestPractices: ['Add rel="noopener noreferrer" to external links', 'Use Next.js Link component for internal links', 'Consider security policies for external links'],
      },
      {
        id: 'NEXT-SECRET-001',
        name: 'Hardcoded secrets in environment files',
        description: 'Hardcoded secrets should not be committed to version control',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['API_KEY=', 'SECRET_KEY=', 'PASSWORD=', 'TOKEN='],
        frameworks: ['next'],
        fix: 'Use environment variables and never commit .env files',
        bestPractices: ['Use .env files and add to .gitignore', 'Use server-side environment variables', 'Use secret management services in production'],
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
        fix: 'Validate and sanitize user-provided URLs before making requests',
        bestPractices: ['Use URL validation before requests', 'Implement allowlist of allowed domains', 'Use SSRF protection libraries'],
      },

      // === BACKEND FRAMEWORK RULES ===
      {
        id: 'BACKEND-SQL-001',
        name: 'SQL Injection via string concatenation',
        description: 'Building SQL queries with string concatenation allows SQL injection',
        severity: 'critical',
        category: 'SQL Injection',
        cwe: 'CWE-89',
        owasp: 'A03:2021 - Injection',
        patterns: ['SELECT * FROM', 'INSERT INTO', 'UPDATE', 'DELETE FROM'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'php'],
        frameworks: ['express', 'nestjs', 'django', 'flask', 'spring boot', 'laravel'],
        fix: 'Use parameterized queries or ORM',
        bestPractices: ['Use parameterized queries', 'Use ORM with built-in protection', 'Never concatenate user input into SQL'],
      },
      {
        id: 'BACKEND-SECRET-001',
        name: 'Hardcoded API Key',
        description: 'Hardcoded API keys in backend code',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['sk-', 'pk-', 'api_key=', 'apikey=', 'API_KEY='],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'php'],
        frameworks: ['express', 'nestjs', 'django', 'flask', 'spring boot', 'laravel'],
        fix: 'Use environment variables and secret management services',
        bestPractices: ['Use environment variables', 'Use secret management services', 'Never commit secrets to code'],
      },
      {
        id: 'BACKEND-JWT-001',
        name: 'Weak JWT Secret',
        description: 'JWT secrets that are too short or predictable',
        severity: 'high',
        category: 'Cryptographic Failures',
        cwe: 'CWE-327',
        owasp: 'A02:2021 - Cryptographic Failures',
        patterns: ['JWT_SECRET=', 'jwt_secret=', 'jwtSecret='],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'php'],
        frameworks: ['express', 'nestjs', 'django', 'flask', 'spring boot', 'laravel'],
        fix: 'Use strong, random JWT secrets with sufficient length',
        bestPractices: ['Use at least 32-character random secrets', 'Rotate JWT secrets regularly', 'Use secret management services'],
      },

      // === GENERAL SECRET DETECTION RULES ===
      {
        id: 'SEC-AWS-001',
        name: 'Hardcoded AWS Access Key',
        description: 'Hardcoded AWS access keys detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['AKIA', 'AWS_ACCESS_KEY', 'aws_secret_access_key'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'csharp', 'swift', 'kotlin', 'dart'],
        fix: 'Use AWS IAM roles or environment variables',
        bestPractices: ['Use AWS IAM roles when possible', 'Use environment variables for credentials', 'Use AWS Secrets Manager'],
      },
      {
        id: 'SEC-DB-PASSWORD-001',
        name: 'Hardcoded Database Password',
        description: 'Hardcoded database passwords detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['password=', 'db_password=', 'DATABASE_PASSWORD=', 'DB_PASSWORD='],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'csharp', 'swift', 'kotlin', 'dart'],
        fix: 'Use environment variables or secret management services',
        bestPractices: ['Use environment variables for database credentials', 'Use secret management services', 'Rotate database credentials regularly'],
      },
      {
        id: 'SEC-PRIVATE-KEY-001',
        name: 'Hardcoded Private Key',
        description: 'Hardcoded private keys detected',
        severity: 'critical',
        category: 'Secret Management',
        cwe: 'CWE-798',
        owasp: 'A07:2021 - Identification and Authentication Failures',
        patterns: ['-----BEGIN PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'php', 'csharp', 'swift', 'kotlin', 'dart'],
        fix: 'Remove private keys from code and use proper key management',
        bestPractices: ['Never commit private keys to version control', 'Use key management services', 'Use environment variables for key paths'],
      },
    ];
  }
}
