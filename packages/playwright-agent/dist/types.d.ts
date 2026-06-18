export interface PageSnapshot {
    url: string;
    domSnapshot: string;
    screenshotBuffer?: Buffer;
    consoleLogs: string[];
    networkFailures: string[];
    a11yIssues: string[];
}
export interface CrawlOptions {
    maxDepth?: number;
    maxPages?: number;
    url: string;
    headless?: boolean;
    browserType?: 'chromium' | 'firefox' | 'webkit';
}
export interface CrawlResult {
    visitedUrls: string[];
    snapshots: PageSnapshot[];
}
export interface BrowserAction {
    type: 'click' | 'fill' | 'navigate' | 'scroll' | 'wait' | 'close_modal' | 'assert_url' | 'hover' | 'press_key' | 'assert_text' | 'screenshot';
    selector?: string;
    value?: string;
    stepText: string;
    status: 'passed' | 'failed';
    detail?: string;
    screenshotPath?: string;
}
export interface BugReport {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'accessibility' | 'js-error' | 'layout' | 'functional';
    reproductionSteps: string;
    selector: string;
    pageUrl: string;
    screenshotUrl?: string;
    aiExplanation?: string;
}
//# sourceMappingURL=types.d.ts.map