import { IAIProvider, PageAnalysisParams, PageAnalysisResult, TestGenParams, TestGenResult } from './types';
export declare class OpenAIProvider implements IAIProvider {
    private client?;
    constructor(apiKey?: string);
    analyzePage(params: PageAnalysisParams): Promise<PageAnalysisResult>;
    generatePlaywrightTest(params: TestGenParams): Promise<TestGenResult>;
    chat(prompt: string, context?: string): Promise<string>;
    private generateMockAnalysis;
    private generateMockTest;
    private generateMockChat;
}
//# sourceMappingURL=openai.d.ts.map