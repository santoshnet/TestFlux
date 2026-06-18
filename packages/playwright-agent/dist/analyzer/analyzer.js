"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analyzer = void 0;
class Analyzer {
    async analyze(snapshot, aiProvider) {
        const bugs = [];
        // 1. Static Audit: Console Errors
        for (const log of snapshot.consoleLogs) {
            if (log.toLowerCase().includes('error') || log.includes('Uncaught') || log.includes('Exception')) {
                bugs.push({
                    title: 'JavaScript console error detected',
                    description: `An error was logged to the browser console: "${log}"`,
                    severity: 'high',
                    category: 'js-error',
                    reproductionSteps: `1. Visit ${snapshot.url}\n2. Open Browser DevTools Console\n3. Observe the reported console error log`,
                    selector: 'window',
                    pageUrl: snapshot.url
                });
            }
        }
        // 2. Static Audit: Network Failures
        for (const failure of snapshot.networkFailures) {
            // Exclude minor logs/analytics if needed, otherwise compile all 4xx/5xx responses
            if (failure.includes('Failed Request') || failure.includes('HTTP Response 4') || failure.includes('HTTP Response 5')) {
                bugs.push({
                    title: 'Failed network request or resource load',
                    description: `A critical page asset or API endpoint failed to load successfully: "${failure}"`,
                    severity: 'high',
                    category: 'functional',
                    reproductionSteps: `1. Navigating to ${snapshot.url}\n2. Inspect network traffic logs\n3. Locate failed resource request`,
                    selector: 'network',
                    pageUrl: snapshot.url
                });
            }
        }
        // 3. Static Audit: Basic Accessibility Issues
        for (const a11y of snapshot.a11yIssues) {
            bugs.push({
                title: 'Accessibility violation detected',
                description: a11y,
                severity: 'medium',
                category: 'accessibility',
                reproductionSteps: `1. Visit ${snapshot.url}\n2. Inspect DOM structures for image alt attributes and element naming rules`,
                selector: 'dom',
                pageUrl: snapshot.url
            });
        }
        // 4. LLM-based audit (Optional, if AI provider is present)
        if (aiProvider && snapshot.domSnapshot) {
            try {
                const aiResult = await aiProvider.analyzePage({
                    url: snapshot.url,
                    domSnapshot: snapshot.domSnapshot,
                    consoleLogs: snapshot.consoleLogs,
                    networkFailures: snapshot.networkFailures,
                    a11yIssues: snapshot.a11yIssues
                });
                if (aiResult && Array.isArray(aiResult.bugs)) {
                    for (const aiBug of aiResult.bugs) {
                        // Check for duplicates before adding
                        const isDup = bugs.some((b) => b.category === aiBug.category &&
                            b.title.toLowerCase() === aiBug.title.toLowerCase());
                        if (!isDup) {
                            bugs.push({
                                title: aiBug.title,
                                description: aiBug.description,
                                severity: aiBug.severity || 'low',
                                category: aiBug.category || 'layout',
                                reproductionSteps: aiBug.reproductionSteps || `1. Visit ${snapshot.url}`,
                                selector: aiBug.selector || 'body',
                                pageUrl: snapshot.url,
                                aiExplanation: aiBug.aiExplanation
                            });
                        }
                    }
                }
            }
            catch (err) {
                console.error('AI analysis of page failed:', err);
            }
        }
        return bugs;
    }
}
exports.Analyzer = Analyzer;
//# sourceMappingURL=analyzer.js.map