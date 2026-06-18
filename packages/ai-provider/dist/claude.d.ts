import { IAIProvider, PageAnalysisParams, PageAnalysisResult, TestGenParams, TestGenResult } from './types';
export declare class ClaudeProvider implements IAIProvider {
    private client?;
    constructor(apiKey?: string);
    analyzePage(params: PageAnalysisParams): Promise<PageAnalysisResult>;
    generatePlaywrightTest(params: TestGenParams): Promise<TestGenResult>;
    private parseJSONResponse;
    private generateMockAnalysis;
    private generateMockTest;
}
//# sourceMappingURL=claude.d.ts.map