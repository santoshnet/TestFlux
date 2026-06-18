import { IAIProvider, PageAnalysisParams, PageAnalysisResult, TestGenParams, TestGenResult } from './types';
import OpenAI from 'openai';

export class OpenAIProvider implements IAIProvider {
  private client?: OpenAI;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async analyzePage(params: PageAnalysisParams): Promise<PageAnalysisResult> {
    if (!this.client) {
      return this.generateMockAnalysis(params);
    }

    try {
      const systemPrompt = `You are an expert QA engineer and website auditor.
Analyze the provided DOM structure, console logs, accessibility problems, and network failures of a page.
Detect any bugs: layout issues, functional failures, console errors, or accessibility violations.
Output a JSON response containing an array of bugs and a summary.
The JSON MUST follow this schema strictly:
{
  "bugs": [
    {
      "title": "Short title describing the bug",
      "description": "Detailed description of the bug and why it is a problem",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "accessibility" | "js-error" | "layout" | "functional",
      "reproductionSteps": "Step-by-step instructions to reproduce this bug",
      "selector": "CSS selector or text descriptor of the target element",
      "aiExplanation": "AI reasoning behind why this is classified as a bug"
    }
  ],
  "summary": "Overall summary of the page health and findings"
}
Do NOT include markdown formatting or backticks around the JSON. Return ONLY the JSON object.`;

      const prompt = `URL: ${params.url}
Console Logs: ${JSON.stringify(params.consoleLogs || [])}
Network Failures: ${JSON.stringify(params.networkFailures || [])}
Accessibility Issues: ${JSON.stringify(params.a11yIssues || [])}

DOM Snapshot Snippet:
${params.domSnapshot.substring(0, 15000)}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const text = response.choices[0].message.content || '{}';
      return JSON.parse(text) as PageAnalysisResult;
    } catch (err) {
      console.error('OpenAI API analysis failed, returning mock fallback:', err);
      return this.generateMockAnalysis(params);
    }
  }

  async generatePlaywrightTest(params: TestGenParams): Promise<TestGenResult> {
    if (!this.client) {
      return this.generateMockTest(params);
    }

    try {
      const systemPrompt = `You are a world-class QA automation engineer.
Generate an executable Playwright test script (.spec.ts) replicating the specified user steps.
Use modern Playwright practices: role locators, text matching, wait states, and robust assertions.
Return ONLY the raw TypeScript code. Do NOT wrap it in markdown block tags (e.g. do not write \`\`\`typescript ... \`\`\`).`;

      const prompt = `Target URL: ${params.url}
User Steps to Replicate:
${params.userSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      });

      const code = response.choices[0].message.content || '';
      return { code: code.trim().replace(/^```typescript\n|```$/g, '') };
    } catch (err) {
      console.error('OpenAI API test gen failed, returning mock fallback:', err);
      return this.generateMockTest(params);
    }
  }

  private generateMockAnalysis(params: PageAnalysisParams): PageAnalysisResult {
    // Rely on ClaudeProvider's mock helper logic
    const bugs: any[] = [];
    const lowerUrl = params.url.toLowerCase();

    if (lowerUrl.includes('error') || lowerUrl.includes('broken') || params.consoleLogs?.length) {
      bugs.push({
        title: 'JavaScript runtime error detected in main thread',
        description: 'A console error occurred during rendering indicating that an object property cannot be accessed on undefined.',
        severity: 'critical',
        category: 'js-error',
        reproductionSteps: `1. Open browser and navigate to ${params.url}\n2. Open devtools console\n3. Observe reference error on load`,
        selector: 'window',
        aiExplanation: 'The console log explicitly lists a critical TypeError.'
      });
    }

    if (lowerUrl.includes('form') || lowerUrl.includes('contact')) {
      bugs.push({
        title: 'Submit button lacks accessibility description',
        description: 'The primary form submit button does not have an aria-label or accessible text inside, causing screen-reader failure.',
        severity: 'medium',
        category: 'accessibility',
        reproductionSteps: `1. Inspect the submit button on page ${params.url}\n2. Review ARIA attributes`,
        selector: 'button[type="submit"]',
        aiExplanation: 'Accessibility standards require all interactive buttons to contain readable content or labels.'
      });
    }

    if (bugs.length === 0) {
      bugs.push({
        title: 'Low contrast ratio on call-to-action link',
        description: 'The contrast ratio of the highlight button text is 3.1:1, which is below the WCAG AA minimum requirement of 4.5:1.',
        severity: 'low',
        category: 'accessibility',
        reproductionSteps: '1. Inspect the main landing header\n2. Note text color and background contrast',
        selector: '.hero-btn',
        aiExplanation: 'Discovered low contrast elements that might impact readability.'
      });
    }

    return {
      bugs,
      summary: `Audited ${params.url} (Mock Engine). Identified ${bugs.length} potential improvements related to UX, accessibility and standards.`
    };
  }

  private generateMockTest(params: TestGenParams): TestGenResult {
    const stepsCode = params.userSteps.map((step, idx) => {
      const lower = step.toLowerCase();
      if (lower.startsWith('open') || lower.startsWith('go to') || lower.startsWith('navigate')) {
        return `  // Step ${idx + 1}: ${step}\n  await page.goto(baseUrl);`;
      }
      if (lower.startsWith('click') || lower.startsWith('tap')) {
        const target = step.replace(/^(click|tap)\s+/i, '');
        return `  // Step ${idx + 1}: ${step}\n  await page.getByRole('button', { name: /${target}/i }).or(page.getByText(/${target}/i)).first().click();`;
      }
      if (step.includes(':')) {
        const [label, val] = step.split(':');
        return `  // Step ${idx + 1}: ${step}\n  await page.getByLabel(/${label.trim()}/i).fill(${JSON.stringify(val.trim())});`;
      }
      return `  // Step ${idx + 1}: ${step}\n  await page.waitForTimeout(1000);`;
    }).join('\n\n');

    const code = `import { test, expect } from '@playwright/test';

const baseUrl = process.env.TEST_BASE_URL ?? ${JSON.stringify(params.url)};

test('automated crawl run test', async ({ page }) => {
  await page.goto(baseUrl);
  
${stepsCode}

  // Final assertion to verify run completed
  await expect(page).toHaveURL(new RegExp(baseUrl.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&'), 'i'));
});
`;

    return { code };
  }
}
