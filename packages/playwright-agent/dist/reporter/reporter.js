"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reporter = void 0;
class Reporter {
    generatePlaywrightTest(url, userSteps) {
        const dataVars = new Map();
        const lines = userSteps.flatMap((step, index) => this.generateStepCode(step, url, index, dataVars));
        const dataBlock = Array.from(dataVars.values()).map(({ label, envKey }) => `  ${JSON.stringify(label)}: process.env.${envKey} ?? '',`);
        return [
            `import { expect, test, type Page } from '@playwright/test';`,
            '',
            `const baseUrl = process.env.TEST_BASE_URL ?? ${JSON.stringify(url)};`,
            dataBlock.length ? `const testData: Record<string, string> = {\n${dataBlock.join('\n')}\n};` : `const testData: Record<string, string> = {};`,
            '',
            `test('generated functional test', async ({ page }) => {`,
            ...lines.map((line) => `  ${line}`),
            `});`,
            '',
            `async function clickByText(page: Page, target: string) {`,
            `  const pattern = flexiblePattern(target);`,
            `  const locators = [`,
            `    page.getByRole('link', { name: pattern }),`,
            `    page.getByRole('button', { name: pattern }),`,
            `    page.getByRole('tab', { name: pattern }),`,
            `    page.getByRole('menuitem', { name: pattern }),`,
            `    page.getByText(pattern),`,
            `  ];`,
            `  for (const locator of locators) {`,
            `    const count = Math.min(await locator.count().catch(() => 0), 10);`,
            `    for (let index = 0; index < count; index += 1) {`,
            `      const candidate = locator.nth(index);`,
            `      if (!(await candidate.isVisible().catch(() => false))) continue;`,
            `      if (!(await candidate.isEnabled().catch(() => false))) continue;`,
            `      await candidate.click();`,
            `      return;`,
            `    }`,
            `  }`,
            `  throw new Error(\`Could not click target: \${target}\`);`,
            `}`,
            '',
            `async function fillField(page: Page, label: string, value: string) {`,
            `  if (!value) throw new Error(\`Missing test data for field: \${label}\`);`,
            `  const pattern = flexiblePattern(label);`,
            `  const locators = [`,
            `    page.getByLabel(pattern),`,
            `    page.getByPlaceholder(pattern),`,
            `    page.getByRole('textbox', { name: pattern }),`,
            `    page.getByRole('combobox', { name: pattern }),`,
            `  ];`,
            `  for (const locator of locators) {`,
            `    if (await locator.first().isVisible().catch(() => false)) {`,
            `      await locator.first().fill(value);`,
            `      return;`,
            `    }`,
            `  }`,
            `  throw new Error(\`Could not fill field: \${label}\`);`,
            `}`,
            '',
            `async function closeModal(page: Page) {`,
            `  await page.getByRole('button', { name: /^(close|dismiss|cancel|done|not now|maybe later|skip|x|×)$/i }).first().click().catch(async () => {`,
            `    await page.keyboard.press('Escape');`,
            `  });`,
            `}`,
            '',
            `function flexiblePattern(value: string) {`,
            "  const escaped = value.replace(/\\s*\\(\\s*\\d+\\s*\\)\\s*$/, '').replace(/[.*+?^\\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\s+/g, '[\\\\s-]*');",
            "  return new RegExp(`${escaped}(?:\\\\s*\\\\(\\\\s*\\\\d+\\\\s*\\\\))?`, 'i');",
            `}`,
            ''
        ].join('\n');
    }
    generateStepCode(step, url, index, dataVars) {
        const safeStep = this.redactSensitiveText(step);
        const prefix = [`// Step ${index + 1}: ${safeStep}`];
        const field = this.parseFieldInstruction(step);
        if (field) {
            const envKey = this.envKeyForField(field.label);
            dataVars.set(field.label, { label: field.label, envKey });
            return [...prefix, `await fillField(page, ${JSON.stringify(field.label)}, testData[${JSON.stringify(field.label)}]);`];
        }
        const openInstruction = this.parseOpenInstruction(step);
        if (openInstruction) {
            return [...prefix, `await page.goto(${openInstruction.isHome ? 'baseUrl' : JSON.stringify(this.normalizeUrl(openInstruction.target))});`];
        }
        const clickTarget = this.parseClickTarget(step);
        if (clickTarget) {
            return [...prefix, `await clickByText(page, ${JSON.stringify(clickTarget)});`];
        }
        const expectedUrl = this.parseUrlCheck(step);
        if (expectedUrl) {
            return [...prefix, `await expect(page).toHaveURL(new RegExp(${JSON.stringify(this.escapeRegExp(this.normalizeComparableUrl(this.normalizeUrl(expectedUrl))))}, 'i'));`];
        }
        if (this.isCloseModalInstruction(step)) {
            return [...prefix, `await closeModal(page);`];
        }
        const scrollTarget = this.parseScrollTarget(step);
        if (scrollTarget) {
            return [...prefix, `await page.getByText(flexiblePattern(${JSON.stringify(scrollTarget)})).first().scrollIntoViewIfNeeded().catch(async () => page.mouse.wheel(0, 2500));`];
        }
        if (/^wait\b/i.test(step)) {
            return [...prefix, `await page.waitForTimeout(${this.parseWaitMs(step)});`];
        }
        return [...prefix, `// Unsupported instruction in generated code: ${safeStep}`];
    }
    envKeyForField(label) {
        const normalized = label.toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().replace(/\s+/g, '_');
        return `TEST_${normalized || 'FIELD'}`;
    }
    normalizeUrl(url) {
        if (/^(data|about|file):/i.test(url))
            return url;
        if (/^https?:\/\//i.test(url))
            return url;
        return `https://${url}`;
    }
    escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    normalizeComparableUrl(value) {
        return value.trim().replace(/\/+$/, '');
    }
    stripWrappingQuotes(value) {
        return value.trim().replace(/^["']|["']$/g, '');
    }
    parseFieldInstruction(step) {
        const fieldInstructionPattern = /^(?:(?:enter|type|fill|set)(?:\s+text)?\s+)?([^:=]+?)\s*[:=]\s*(.+)$/i;
        const actionLabelPattern = /^(open|click|tap|press|select|choose|scroll|wait|go|goto|navigate|check|verify|assert|close|dismiss|enter|type|fill|set)\b/i;
        const match = step.trim().match(fieldInstructionPattern);
        if (match) {
            const label = match[1].trim().replace(/\s+/g, ' ');
            const value = match[2].trim();
            if (!label || actionLabelPattern.test(label))
                return null;
            return { label, value };
        }
        return null;
    }
    parseOpenInstruction(step) {
        const match = step.trim().replace(/\s+/g, ' ').match(/^(?:open|go\s+to|goto|navigate(?:\s+to)?)(?:\s+(?:page|url|site|website))?\s+(.+)$/i);
        if (!match)
            return null;
        const target = this.stripWrappingQuotes(match[1].trim());
        if (/^(home|home\s+page|homepage)$/i.test(target)) {
            return { target, isHome: true };
        }
        return target ? { target, isHome: false } : null;
    }
    parseClickTarget(step) {
        const match = step.trim().replace(/\s+/g, ' ').match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(.+)$/i);
        if (!match)
            return null;
        return this.stripWrappingQuotes(match[1])
            .replace(/^(?:on|the)\s+/i, '')
            .trim();
    }
    parseUrlCheck(step) {
        const match = step.trim().replace(/\s+/g, ' ').match(/^(?:check|verify|assert)(?:\s+(?:current|page))?\s+url(?:\s+(?:is|equals|contains))?\s+(.+)$/i);
        if (!match)
            return null;
        return this.stripWrappingQuotes(match[1].trim()) || null;
    }
    parseScrollTarget(step) {
        const match = step.trim().replace(/\s+/g, ' ').match(/^scroll(?:\s+(?:to|down\s+to|into\s+view))?\s+(.+)$/i);
        if (!match)
            return null;
        return this.stripWrappingQuotes(match[1].trim()) || null;
    }
    isCloseModalInstruction(step) {
        return /^(?:close|dismiss)(?:\s+the)?\s+(?:modal|dialog|popup)$/i.test(step.trim().replace(/\s+/g, ' '));
    }
    parseWaitMs(step) {
        const match = step.match(/^wait(?:\s+for)?(?:\s+(\d+(?:\.\d+)?)\s*(milliseconds?|msecs?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m))?/i);
        if (!match?.[1])
            return 1500;
        const amount = Number(match[1]);
        const unit = (match[2] || 'seconds').toLowerCase();
        const ms = unit.startsWith('m') && !unit.startsWith('ms') && !unit.startsWith('millisecond')
            ? amount * 60000
            : unit.startsWith('ms') || unit.startsWith('millisecond') || unit.startsWith('msec')
                ? amount
                : amount * 1000;
        return Math.round(ms);
    }
    redactSensitiveText(value) {
        return value
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
    }
}
exports.Reporter = Reporter;
//# sourceMappingURL=reporter.js.map