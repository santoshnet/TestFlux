"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const playwright_1 = require("playwright");
const actions_1 = require("../actions/actions");
class Validator {
    async validateSteps(baseUrl, steps) {
        let browser = null;
        try {
            browser = await playwright_1.chromium.launch({ headless: true });
            const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            const page = await context.newPage();
            const runner = new actions_1.ActionsRunner(page, baseUrl);
            for (const step of steps) {
                const result = await runner.runStep(step);
                if (result.status === 'failed') {
                    return {
                        reproducible: true,
                        failedStep: step,
                        error: result.detail
                    };
                }
            }
            return { reproducible: false };
        }
        catch (err) {
            return {
                reproducible: true,
                error: `Validation runner failed to execute script: ${err instanceof Error ? err.message : String(err)}`
            };
        }
        finally {
            if (browser) {
                await browser.close().catch(() => { });
            }
        }
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map