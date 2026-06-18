"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
class GroqProvider {
    client;
    constructor(apiKey) {
        if (apiKey) {
            this.client = new groq_sdk_1.default({ apiKey });
        }
    }
    async analyzePage(params) {
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
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            });
            const text = response.choices[0].message.content || '{}';
            return JSON.parse(text);
        }
        catch (err) {
            console.error('Groq API analysis failed, returning mock fallback:', err);
            return this.generateMockAnalysis(params);
        }
    }
    async generatePlaywrightTest(params) {
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
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ]
            });
            const code = response.choices[0].message.content || '';
            return { code: code.trim().replace(/^```typescript\n|```$/g, '') };
        }
        catch (err) {
            console.error('Groq API test gen failed, returning mock fallback:', err);
            return this.generateMockTest(params);
        }
    }
    async chat(prompt, context) {
        if (!this.client) {
            return this.generateMockChat(prompt);
        }
        try {
            const systemPrompt = `You are an expert QA engineer and automation specialist helping users with Playwright testing, website auditing, and quality assurance.
Provide clear, actionable, and technical advice. When appropriate, include code examples using Playwright syntax.
Keep responses concise but comprehensive.`;
            const messages = [
                { role: 'system', content: systemPrompt }
            ];
            if (context) {
                messages.push({ role: 'user', content: `Context: ${context}` });
            }
            messages.push({ role: 'user', content: prompt });
            const response = await this.client.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages
            });
            return response.choices[0].message.content || '';
        }
        catch (err) {
            console.error('Groq API chat failed, returning mock fallback:', err);
            return this.generateMockChat(prompt);
        }
    }
    generateMockAnalysis(params) {
        const bugs = [];
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
    generateMockTest(params) {
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
    generateMockChat(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('playwright') || lowerPrompt.includes('test')) {
            return `I can help you with Playwright testing! Here are some key points:

1. **Setup**: Install Playwright with \`npm init playwright@latest\`
2. **Selectors**: Use role-based selectors like \`page.getByRole('button')\` for better reliability
3. **Waits**: Playwright has auto-waiting, but use \`waitForSelector()\` for dynamic content
4. **Assertions**: Use \`expect()\` with built-in matchers like \`toBeVisible()\`

For your specific query about "${prompt.substring(0, 50)}...", I'd recommend:
- Start with a simple navigation test
- Add assertions for key elements
- Use test fixtures for shared setup

Would you like me to generate a specific test script for your use case?`;
        }
        if (lowerPrompt.includes('bug') || lowerPrompt.includes('error') || lowerPrompt.includes('debug')) {
            return `For debugging and bug analysis, I recommend:

1. **Console Logs**: Check browser console for JavaScript errors
2. **Network Tab**: Monitor failed API calls and slow responses
3. **Accessibility**: Use axe-devtools or Playwright's a11y audit
4. **Screenshots**: Capture screenshots at failure points

Common issues to look for:
- Missing ARIA labels on interactive elements
- Contrast ratio below 4.5:1
- Unhandled promise rejections
- Memory leaks in single-page apps

What specific issue are you encountering?`;
        }
        return `I'm here to help with your QA and automation needs! I can assist with:

- **Playwright Test Generation**: Create automated test scripts
- **Bug Analysis**: Identify and categorize website issues
- **Accessibility Audits**: Check for WCAG compliance
- **Performance Testing**: Analyze page load times and bottlenecks

Your query: "${prompt}"

Please provide more details about what you'd like to accomplish, and I'll give you specific guidance and code examples.`;
    }
}
exports.GroqProvider = GroqProvider;
//# sourceMappingURL=groq.js.map