import { chromium } from 'playwright';
import { ActionsRunner } from '../actions/actions';

export class Validator {
  async validateSteps(baseUrl: string, steps: string[]): Promise<{ reproducible: boolean; failedStep?: string; error?: string }> {
    let browser = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      
      const runner = new ActionsRunner(page, baseUrl);

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
    } catch (err) {
      return {
        reproducible: true,
        error: `Validation runner failed to execute script: ${err instanceof Error ? err.message : String(err)}`
      };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }
}
