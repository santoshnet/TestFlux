import { IAIProvider, PageAnalysisParams, PageAnalysisResult, TestGenParams, TestGenResult } from './types';
export declare class OpenAIProvider implements IAIProvider {
    private client?;
    constructor(apiKey?: string);
    analyzePage(params: PageAnalysisParams): Promise<PageAnalysisResult>;
    generatePlaywrightTest(params: TestGenParams): Promise<TestGenResult>;
    private generateMockAnalysis;
    private generateMockTest;
}
//# sourceMappingURL=openai.d.ts.map