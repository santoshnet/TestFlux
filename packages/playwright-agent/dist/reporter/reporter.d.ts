export declare class Reporter {
    generatePlaywrightTest(url: string, userSteps: string[]): string;
    private generateStepCode;
    private envKeyForField;
    private normalizeUrl;
    private escapeRegExp;
    private normalizeComparableUrl;
    private stripWrappingQuotes;
    private parseFieldInstruction;
    private parseOpenInstruction;
    private parseClickTarget;
    private parseUrlCheck;
    private parseScrollTarget;
    private isCloseModalInstruction;
    private parseWaitMs;
    private redactSensitiveText;
}
//# sourceMappingURL=reporter.d.ts.map