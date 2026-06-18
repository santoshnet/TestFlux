import { IAIProvider, PageAnalysisParams, PageAnalysisResult, TestGenParams, TestGenResult } from './types';
export declare class ClaudeProvider implements IAIProvider {
    private client?;
    constructor(apiKey?: string);
    analyzePage(params: PageAnalysisParams): Promise<PageAnalysisResult>;
    generatePlaywrightTest(params: TestGenParams): Promise<TestGenResult>;
    chat(prompt: string, context?: string): Promise<string>;
    private parseJSONResponse;
    private generateMockAnalysis;
    private generateMockTest;
    private generateMockChat;
}
//# sourceMappingURL=claude.d.ts.map