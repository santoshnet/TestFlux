export interface BugAnalysis {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'accessibility' | 'js-error' | 'layout' | 'functional';
  reproductionSteps: string;
  selector: string;
  aiExplanation?: string;
}

export interface PageAnalysisParams {
  url: string;
  domSnapshot: string;
  screenshotUrl?: string;
  consoleLogs?: string[];
  networkFailures?: string[];
  a11yIssues?: string[];
}

export interface PageAnalysisResult {
  bugs: BugAnalysis[];
  summary: string;
}

export interface TestGenParams {
  url: string;
  userSteps: string[];
}

export interface TestGenResult {
  code: string;
}

export interface IAIProvider {
  analyzePage(params: PageAnalysisParams): Promise<PageAnalysisResult>;
  generatePlaywrightTest(params: TestGenParams): Promise<TestGenResult>;
}

export interface AIProviderConfig {
  apiKey?: string;
  provider: 'claude' | 'openai' | 'groq';
}
