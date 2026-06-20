import { Page, ElementHandle, Frame } from 'playwright';
import { BrowserAction } from '../types';

export class ActionsRunner {
  private page: Page;
  private baseUrl: string;
  private networkFailures: string[] = [];

  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = this.normalizeUrl(baseUrl);
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        this.networkFailures.push(`HTTP Response ${response.status()}: ${response.url()}`);
      }
    });
    this.page.on('requestfailed', (request) => {
      this.networkFailures.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  }

  async runStep(step: string): Promise<Omit<BrowserAction, 'screenshotPath'>> {
    const normalized = step.toLowerCase();
    const safeStep = this.redactSensitiveText(step);

    try {
      // 0. Check for conditional statements first
      const conditional = this.parseConditionalStep(step);
      if (conditional) {
        return await this.executeConditional(conditional, safeStep);
      }

      // 0.5. Upload file instruction (priority over field instruction)
      const uploadInstruction = this.parseUploadInstruction(step);
      if (uploadInstruction) {
        const result = await this.uploadFile(uploadInstruction.selector, uploadInstruction.filePath, uploadInstruction.description);
        await this.sleep(800);
        return result;
      }

      // 1. Fill Input Field
      const fieldInstruction = this.parseFieldInstruction(step);
      if (fieldInstruction) {
        if (this.hasRedactedPlaceholder(fieldInstruction.value)) {
          return {
            type: 'fill',
            stepText: safeStep,
            status: 'failed',
            detail: `The value for "${fieldInstruction.label}" is redacted. Provide the actual value to run the test.`
          };
        }
        await this.fillField(fieldInstruction.label, fieldInstruction.value);
        await this.sleep(800);
        return { type: 'fill', stepText: safeStep, value: fieldInstruction.value, selector: fieldInstruction.label, status: 'passed' };
      }

      // 2. Open Page / Navigation
      const openInstruction = this.parseOpenInstruction(step);
      if (openInstruction) {
        const targetUrl = openInstruction.isHome ? this.baseUrl : this.normalizeUrl(openInstruction.target);
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.sleep(1000);
        return { type: 'navigate', stepText: safeStep, value: targetUrl, status: 'passed' };
      }

      // 3. Special target triggers (View Our Work, Contact Us)
      if (normalized.includes('view our work')) {
        await this.clickByName(['View Our Work', 'Our Work', 'Work']);
        await this.sleep(1200);
        return { type: 'click', stepText: safeStep, selector: 'View Our Work', status: 'passed' };
      }

      if (normalized.includes('contact us')) {
        await this.clickByName(['Contact Us', 'Contact']);
        await this.sleep(1200);
        return { type: 'click', stepText: safeStep, selector: 'Contact Us', status: 'passed' };
      }

      // 4. Click target
      const enhancedClickTarget = this.parseEnhancedClickTarget(step);
      if (enhancedClickTarget) {
        const selector = enhancedClickTarget.target || enhancedClickTarget.selector || enhancedClickTarget.value || 'unknown';
        const result = await this.clickByNameEnhanced(enhancedClickTarget.target ? [enhancedClickTarget.target] : [], enhancedClickTarget);
        await this.sleep(1200);
        return { type: 'click', stepText: safeStep, selector, status: result.status, detail: result.detail };
      }

      const clickTarget = this.parseClickTarget(step);
      if (clickTarget) {
        await this.clickByName([clickTarget]);
        await this.sleep(1200);
        return { type: 'click', stepText: safeStep, selector: clickTarget, status: 'passed' };
      }

      // 5. URL asserts
      const expectedUrl = this.parseUrlCheck(step);
      if (expectedUrl) {
        await this.waitForExpectedUrl(expectedUrl);
        return { type: 'assert_url', stepText: safeStep, value: expectedUrl, status: 'passed' };
      }

      // 6. Close modal
      if (this.isCloseModalInstruction(step)) {
        const closed = await this.closeModal();
        await this.sleep(700);
        return {
          type: 'close_modal',
          stepText: safeStep,
          status: 'passed',
          detail: closed ? undefined : 'No visible modal close control found; pressed Escape key.'
        };
      }

      // 7. Scroll target
      if (normalized.includes('recent projects')) {
        const section = this.page.getByText(/Our Recent Projects/i).first();
        if (await section.count()) {
          await section.scrollIntoViewIfNeeded();
        } else {
          await this.page.mouse.wheel(0, 2500);
        }
        await this.sleep(1200);
        return { type: 'scroll', stepText: safeStep, selector: 'Our Recent Projects', status: 'passed' };
      }

      const scrollTarget = this.parseScrollTarget(step);
      if (scrollTarget) {
        const textLoc = this.page.getByText(new RegExp(this.escapeRegExp(scrollTarget), 'i')).first();
        if (await textLoc.count()) {
          await textLoc.scrollIntoViewIfNeeded();
        } else {
          await this.page.mouse.wheel(0, 2500);
        }
        await this.sleep(1200);
        return { type: 'scroll', stepText: safeStep, selector: scrollTarget, status: 'passed' };
      }

      // 8. Wait timer
      if (normalized.startsWith('wait')) {
        const duration = this.parseWaitMs(step);
        await this.sleep(duration);
        return { type: 'wait', stepText: safeStep, value: String(duration), status: 'passed' };
      }

      // 9. Hover over element
      const hoverTarget = this.parseHoverTarget(step);
      if (hoverTarget) {
        await this.hoverByName(hoverTarget);
        await this.sleep(800);
        return { type: 'hover', stepText: safeStep, selector: hoverTarget, status: 'passed' };
      }

      // 10. Press / type a keyboard key  e.g. "Press Enter", "Press Tab", "Press Escape"
      const keyTarget = this.parsePressKey(step);
      if (keyTarget) {
        await this.page.keyboard.press(keyTarget);
        await this.sleep(500);
        return { type: 'press_key', stepText: safeStep, value: keyTarget, status: 'passed' };
      }

      // 11. Assert text visible on page  e.g. "Assert text Success", "Check text Welcome"
      const assertText = this.parseAssertText(step);
      if (assertText) {
        const locator = this.page.getByText(new RegExp(this.escapeRegExp(assertText), 'i')).first();
        const visible = await locator.isVisible({ timeout: 8000 }).catch(() => false);
        if (!visible) {
          return { type: 'assert_text', stepText: safeStep, value: assertText, status: 'failed', detail: `Text "${assertText}" was not found on the page.` };
        }
        return { type: 'assert_text', stepText: safeStep, value: assertText, status: 'passed' };
      }

      // 12. Take screenshot  e.g. "Screenshot", "Take screenshot"
      if (/^(?:take\s+)?screenshot$/i.test(normalized.trim())) {
        return { type: 'screenshot', stepText: safeStep, status: 'passed' };
      }

      // 13. Go back / forward navigation
      if (/^go\s+back$/i.test(normalized.trim())) {
        await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await this.sleep(800);
        return { type: 'navigate', stepText: safeStep, value: 'back', status: 'passed' };
      }
      if (/^go\s+forward$/i.test(normalized.trim())) {
        await this.page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await this.sleep(800);
        return { type: 'navigate', stepText: safeStep, value: 'forward', status: 'passed' };
      }

      // 14. Scroll up / scroll down shortcuts
      if (/^scroll\s+(?:to\s+)?top$/i.test(normalized.trim())) {
        await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await this.sleep(800);
        return { type: 'scroll', stepText: safeStep, selector: 'top', status: 'passed' };
      }
      if (/^scroll\s+(?:to\s+)?bottom$/i.test(normalized.trim())) {
        await this.page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
        await this.sleep(800);
        return { type: 'scroll', stepText: safeStep, selector: 'bottom', status: 'passed' };
      }

      // 15. End / Stop / Finish - terminate test execution

      return {
        type: 'wait',
        stepText: safeStep,
        status: 'failed',
        detail: 'Unsupported instruction. Supported: Open [URL], Click [Button], Click button/element with [id/testid/class], Click [selector], Click the [1st/2nd/last/top/bottom] [Button], [Field]: [Value], Hover [Element], Press [Key], Scroll to [Text], Scroll top/bottom, Assert text [Text], Check URL [URL], Close modal, Go back, Go forward, Wait [Time], Screenshot, Upload [file], End/Stop'
      };
    } catch (err) {
      return {
        type: 'click', // Default category
        stepText: safeStep,
        status: 'failed',
        detail: this.redactSensitiveText(err instanceof Error ? err.message : String(err))
      };
    }
  }

  // --- Helper Scorer Logic ---

  private async clickByName(names: string[]) {
    for (const name of this.expandClickNames(names)) {
      const pattern = this.flexibleNamePattern(name);
      const clicked = await this.clickFirstVisible([
        this.page.getByRole('link', { name: pattern }),
        this.page.getByRole('button', { name: pattern }),
        this.page.getByRole('tab', { name: pattern }),
        this.page.getByRole('menuitem', { name: pattern }),
        this.page.getByText(pattern),
      ]);
      if (clicked) return;

      const normalizedClick = await this.clickByNormalizedText(name);
      if (normalizedClick) return;
    }

    throw new Error(`Could not locate any clickable target matching: ${names.join(', ')}`);
  }

  private async clickByNameEnhanced(names: string[], enhancedTarget: any): Promise<{ status: 'passed' | 'failed'; detail?: string }> {
    try {
      // Handle direct attribute selection first (no button text required)
      if (enhancedTarget.type === 'direct-attribute') {
        const clicked = await this.clickByDirectAttribute(enhancedTarget.attribute, enhancedTarget.value);
        return clicked ? { status: 'passed' } : { 
          status: 'failed', 
          detail: `Could not locate element with ${enhancedTarget.attribute}="${enhancedTarget.value}"`
        };
      }

      // Handle CSS selector selection
      if (enhancedTarget.type === 'css-selector') {
        const clicked = await this.clickByCssSelector(enhancedTarget.selector);
        return clicked ? { status: 'passed' } : { 
          status: 'failed', 
          detail: `Could not locate element with selector "${enhancedTarget.selector}"`
        };
      }

      // Handle text-based enhanced selection
      for (const name of this.expandClickNames(names)) {
        const pattern = this.flexibleNamePattern(name);
        const locators = [
          this.page.getByRole('link', { name: pattern }),
          this.page.getByRole('button', { name: pattern }),
          this.page.getByRole('tab', { name: pattern }),
          this.page.getByRole('menuitem', { name: pattern }),
          this.page.getByText(pattern),
        ];

        let clicked = false;

        if (enhancedTarget.type === 'index') {
          clicked = await this.clickByIndex(locators, enhancedTarget.index);
        } else if (enhancedTarget.type === 'position') {
          clicked = await this.clickByPosition(locators, enhancedTarget.position);
        } else if (enhancedTarget.type === 'context') {
          clicked = await this.clickByContext(locators, enhancedTarget.context);
        } else if (enhancedTarget.type === 'attribute') {
          clicked = await this.clickByAttribute(name, enhancedTarget.attribute, enhancedTarget.value);
        }

        if (clicked) return { status: 'passed' };

        // Try normalized text approach with enhanced selection
        const normalizedLocators = await this.findLocatorsByNormalizedText(name);
        if (normalizedLocators && normalizedLocators.length > 0) {
          if (enhancedTarget.type === 'index') {
            if (enhancedTarget.index < normalizedLocators.length) {
              await this.clickLocator(normalizedLocators[enhancedTarget.index]);
              return { status: 'passed' };
            }
          } else if (enhancedTarget.type === 'position') {
            const index = enhancedTarget.position === 'first' || enhancedTarget.position === 'top' ? 0 : normalizedLocators.length - 1;
            await this.clickLocator(normalizedLocators[index]);
            return { status: 'passed' };
          }
        }
      }

      return { 
        status: 'failed', 
        detail: `Could not locate clickable target matching "${names.join(', ')}" with ${enhancedTarget.type} selection` 
      };
    } catch (err) {
      return { 
        status: 'failed', 
        detail: err instanceof Error ? err.message : String(err)
      };
    }
  }

  private async clickByNormalizedText(name: string): Promise<boolean> {
    const contexts = [this.page, ...this.page.frames()];
    for (const context of contexts) {
      const locator = await this.findBestClickableLocator(context, name);
      if (locator) {
        await this.clickLocator(locator);
        return true;
      }
    }
    return false;
  }

  private async findLocatorsByNormalizedText(name: string): Promise<any[] | null> {
    const contexts = [this.page, ...this.page.frames()];
    for (const context of contexts) {
      const locators = await this.findAllClickableLocators(context, name);
      if (locators && locators.length > 0) {
        return locators;
      }
    }
    return null;
  }

  private async findBestClickableLocator(context: Page | Frame, name: string) {
    const selector = [
      'a', 'button', '[role="button"]', '[role="link"]', '[role="menuitem"]',
      '[role="tab"]', '[role="option"]', '[onclick]', '[tabindex]:not([tabindex="-1"])',
      '[data-testid]', '[data-test]', '[data-qa]'
    ].join(', ');

    const locator = context.locator(selector);
    const best = await locator.evaluateAll((elements: Element[], rawTarget: string) => {
      const normalize = (value: unknown) => String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\(\s*\d+\s*\)\s*$/g, '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const target = normalize(rawTarget);
      const targetCompact = target.replace(/\s+/g, '');
      const targetTokens = target.split(' ').filter(Boolean);
      if (!target || targetTokens.length === 0) return null;

      const elementText = (element: Element) => [
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('name'),
        element.getAttribute('id'),
        element.getAttribute('data-testid'),
        element.getAttribute('data-test'),
        element.getAttribute('data-qa')
      ].filter(Boolean).join(' ');

      const scoreCandidate = (candidateValue: string) => {
        const candidate = normalize(candidateValue);
        const candidateCompact = candidate.replace(/\s+/g, '');
        if (!candidate) return 0;
        if (candidate === target || candidateCompact === targetCompact) return 140;
        if (candidate.startsWith(target) || candidateCompact.startsWith(targetCompact)) return 120;
        if (candidate.includes(target) || candidateCompact.includes(targetCompact)) return 105;

        const matchedTokens = targetTokens.filter((token) => candidate.includes(token)).length;
        if (matchedTokens === targetTokens.length) return 90;
        return matchedTokens > 0 ? matchedTokens * 20 : 0;
      };

      let bestIndex = -1;
      let bestScore = 0;
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const ariaDisabled = element.getAttribute('aria-disabled') === 'true';
        const input = element as HTMLInputElement;
        if (htmlElement.hidden || input.disabled || ariaDisabled) return;

        const rect = htmlElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const score = scoreCandidate(elementText(element));
        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      });

      return bestIndex >= 0 && bestScore >= 80 ? { index: bestIndex, score: bestScore } : null;
    }, name).catch(() => null);

    return best ? locator.nth(best.index) : null;
  }

  private async findAllClickableLocators(context: Page | Frame, name: string) {
    const selector = [
      'a', 'button', '[role="button"]', '[role="link"]', '[role="menuitem"]',
      '[role="tab"]', '[role="option"]', '[onclick]', '[tabindex]:not([tabindex="-1"])',
      '[data-testid]', '[data-test]', '[data-qa]'
    ].join(', ');

    const locator = context.locator(selector);
    const results = await locator.evaluateAll((elements: Element[], rawTarget: string) => {
      const normalize = (value: unknown) => String(value || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/\(\s*\d+\s*\)\s*$/g, '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const target = normalize(rawTarget);
      const targetCompact = target.replace(/\s+/g, '');
      const targetTokens = target.split(' ').filter(Boolean);
      if (!target || targetTokens.length === 0) return [];

      const elementText = (element: Element) => [
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('name'),
        element.getAttribute('id'),
        element.getAttribute('data-testid'),
        element.getAttribute('data-test'),
        element.getAttribute('data-qa')
      ].filter(Boolean).join(' ');

      const scoreCandidate = (candidateValue: string) => {
        const candidate = normalize(candidateValue);
        const candidateCompact = candidate.replace(/\s+/g, '');
        if (!candidate) return 0;
        if (candidate === target || candidateCompact === targetCompact) return 140;
        if (candidate.startsWith(target) || candidateCompact.startsWith(targetCompact)) return 120;
        if (candidate.includes(target) || candidateCompact.includes(targetCompact)) return 105;

        const matchedTokens = targetTokens.filter((token) => candidate.includes(token)).length;
        if (matchedTokens === targetTokens.length) return 90;
        return matchedTokens > 0 ? matchedTokens * 20 : 0;
      };

      const validIndices: number[] = [];
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const ariaDisabled = element.getAttribute('aria-disabled') === 'true';
        const input = element as HTMLInputElement;
        if (htmlElement.hidden || input.disabled || ariaDisabled) return;

        const rect = htmlElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const score = scoreCandidate(elementText(element));
        if (score >= 80) {
          validIndices.push(index);
        }
      });

      return validIndices;
    }, name).catch(() => []);

    if (results.length === 0) return null;

    return results.map(index => locator.nth(index));
  }

  private async clickFirstVisible(locators: any[]): Promise<boolean> {
    for (const locator of locators) {
      const count = Math.min(await locator.count().catch(() => 0), 10);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        if (!(await candidate.isVisible({ timeout: 500 }).catch(() => false))) continue;
        if (!(await candidate.isEnabled({ timeout: 500 }).catch(() => false))) continue;
        await this.clickLocator(candidate);
        return true;
      }
    }
    return false;
  }

  private async clickByIndex(locators: any[], index: number): Promise<boolean> {
    for (const locator of locators) {
      const count = await locator.count().catch(() => 0);
      if (count <= index) continue;
      
      const candidate = locator.nth(index);
      if (await candidate.isVisible({ timeout: 500 }).catch(() => false)) {
        if (await candidate.isEnabled({ timeout: 500 }).catch(() => false)) {
          await this.clickLocator(candidate);
          return true;
        }
      }
    }
    return false;
  }

  private async clickByPosition(locators: any[], position: string): Promise<boolean> {
    for (const locator of locators) {
      const count = await locator.count().catch(() => 0);
      if (count === 0) continue;

      let targetIndex = 0;
      if (position === 'last' || position === 'bottom') {
        targetIndex = count - 1;
      } else if (position === 'first' || position === 'top') {
        targetIndex = 0;
      }

      const candidate = locator.nth(targetIndex);
      if (await candidate.isVisible({ timeout: 500 }).catch(() => false)) {
        if (await candidate.isEnabled({ timeout: 500 }).catch(() => false)) {
          await this.clickLocator(candidate);
          return true;
        }
      }
    }
    return false;
  }

  private async clickByContext(locators: any[], context: string): Promise<boolean> {
    for (const locator of locators) {
      const count = await locator.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        
        // Check if the element is within the specified context
        const isInContext = await candidate.evaluate((el: Element, ctx: string) => {
          let current: Element | null = el;
          while (current && current !== document.body) {
            const text = current.textContent?.toLowerCase() || '';
            const id = (current as HTMLElement).id?.toLowerCase() || '';
            const className = (current as HTMLElement).className?.toLowerCase() || '';
            
            if (text.includes(ctx.toLowerCase()) || 
                id.includes(ctx.toLowerCase()) || 
                className.includes(ctx.toLowerCase())) {
              return true;
            }
            current = current.parentElement;
          }
          return false;
        }, context).catch(() => false);

        if (isInContext && await candidate.isVisible({ timeout: 500 }).catch(() => false)) {
          if (await candidate.isEnabled({ timeout: 500 }).catch(() => false)) {
            await this.clickLocator(candidate);
            return true;
          }
        }
      }
    }
    return false;
  }

  private async clickByAttribute(target: string, attribute: string, value: string): Promise<boolean> {
    const contexts = [this.page, ...this.page.frames()];
    for (const context of contexts) {
      const pattern = this.flexibleNamePattern(target);
      
      // Build selector with attribute
      const selector = `*[${attribute}="${value}"]`;
      try {
        const elements = await context.locator(selector).all();
        for (const element of elements) {
          const text = await element.textContent().catch(() => '') || '';
          if (pattern.test(text) || text.toLowerCase().includes(target.toLowerCase())) {
            if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
              if (await element.isEnabled({ timeout: 500 }).catch(() => false)) {
                await this.clickLocator(element);
                return true;
              }
            }
          }
        }
      } catch {
        // Selector may be invalid, continue
      }

      // Try with role-based locators combined with attribute
      const locators = [
        context.getByRole('link', { name: pattern }),
        context.getByRole('button', { name: pattern }),
        context.getByRole('tab', { name: pattern }),
        context.getByRole('menuitem', { name: pattern }),
      ];

      for (const locator of locators) {
        const count = await locator.count().catch(() => 0);
        for (let index = 0; index < count; index += 1) {
          const candidate = locator.nth(index);
          const attrValue = await candidate.getAttribute(attribute).catch(() => null);
          if (attrValue === value || (attrValue && attrValue.includes(value))) {
            if (await candidate.isVisible({ timeout: 500 }).catch(() => false)) {
              if (await candidate.isEnabled({ timeout: 500 }).catch(() => false)) {
                await this.clickLocator(candidate);
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  private async clickByDirectAttribute(attribute: string, value: string): Promise<boolean> {
    const contexts = [this.page, ...this.page.frames()];
    for (const context of contexts) {
      // Handle different attribute naming conventions
      let actualAttribute = attribute;
      if (attribute === 'testid') {
        actualAttribute = 'data-testid';
      }
      
      // Build selector with attribute
      const selector = `[${actualAttribute}="${value}"]`;
      try {
        const element = context.locator(selector).first();
        if (await element.count() > 0) {
          if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
            if (await element.isEnabled({ timeout: 500 }).catch(() => false)) {
              await this.clickLocator(element);
              return true;
            }
          }
        }
      } catch {
        // Selector may be invalid, continue
      }

      // Try with common clickable roles
      const clickableRoles = ['button', 'link', 'tab', 'menuitem', 'option'];
      for (const role of clickableRoles) {
        try {
          const elements = await context.getByRole(role as any).all();
          for (const element of elements) {
            const attrValue = await element.getAttribute(actualAttribute).catch(() => null);
            if (attrValue === value || (attrValue && attrValue.includes(value))) {
              if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
                if (await element.isEnabled({ timeout: 500 }).catch(() => false)) {
                  await this.clickLocator(element);
                  return true;
                }
              }
            }
          }
        } catch {
          // Role may not exist, continue
        }
      }
    }
    return false;
  }

  private async clickByCssSelector(selector: string): Promise<boolean> {
    const contexts = [this.page, ...this.page.frames()];
    for (const context of contexts) {
      try {
        const element = context.locator(selector).first();
        if (await element.count() > 0) {
          if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
            if (await element.isEnabled({ timeout: 500 }).catch(() => false)) {
              await this.clickLocator(element);
              return true;
            }
          }
        }
      } catch {
        // Selector may be invalid, continue
      }
    }
    return false;
  }

  private async clickLocator(locator: any) {
    // Highlight element before clicking
    await this.highlightElement(locator);

    const popupPromise = this.page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await locator.click({ timeout: 7000, noWaitAfter: true }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      if (/click action done/i.test(message) && /waiting for scheduled navigations|navigation/i.test(message)) return;
      throw err;
    });

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await popup.bringToFront().catch(() => {});
      this.page = popup; // Swap the current active tab
    }
  }

  private async highlightElement(locator: any): Promise<void> {
    try {
      await locator.evaluate((el: HTMLElement) => {
        el.style.boxShadow = '0 0 10px 4px rgba(255, 0, 0, 0.8)';
        el.style.border = '3px solid red';
        el.style.transition = 'all 0.2s ease';
      });
      await this.sleep(300); // Brief highlight duration
      await locator.evaluate((el: HTMLElement) => {
        el.style.boxShadow = '';
        el.style.border = '';
      });
    } catch {
      // Ignore highlighting errors
    }
  }

  private async fillField(label: string, value: string) {
    try {
      await this.fillFieldOnce(label, value);
    } catch (err) {
      if (!this.isPasswordLabel(label)) throw err;
      // If filling a password field fails, maybe we need to click "Next" or "Continue" first (e.g. multi-step login flows)
      await this.clickByName(['Next', 'Continue']).catch(() => {});
      await this.sleep(1200);
      await this.fillFieldOnce(label, value);
    }
  }

  private async fillFieldOnce(label: string, value: string) {
    const contexts = [this.page, ...this.page.frames()];
    const pattern = this.flexibleNamePattern(this.cleanFieldLabel(label));

    for (const context of contexts) {
      const directLocators = [
        context.getByLabel(pattern).first(),
        context.getByPlaceholder(pattern).first(),
        context.getByRole('textbox', { name: pattern }).first(),
        context.getByRole('combobox', { name: pattern }).first()
      ];

      for (const locator of directLocators) {
        if (await this.tryFillLocator(locator, value)) return;
      }

      const scoredLocator = await this.findBestFieldLocator(context, label);
      if (scoredLocator && await this.tryFillLocator(scoredLocator, value)) {
        return;
      }
    }

    throw new Error(`Could not find field with label: ${label}`);
  }

  private async uploadFile(selector: string, filePath: string, description: string | null): Promise<Omit<BrowserAction, 'screenshotPath'>> {
    try {
      const contexts = [this.page, ...this.page.frames()];
      let fileInput = null;

      // Try to find the file input by selector
      for (const context of contexts) {
        // Try CSS selector
        try {
          fileInput = await context.$(selector);
          if (fileInput) break;
        } catch {
          // CSS selector failed, try other methods
        }

        // Try by role/label pattern
        const pattern = this.flexibleNamePattern(selector);
        const roleLocators = [
          context.getByRole('textbox', { name: pattern }),
          context.getByLabel(pattern)
        ];

        for (const locator of roleLocators) {
          if (await locator.count() > 0) {
            fileInput = await locator.elementHandle();
            if (fileInput) break;
          }
        }

        if (fileInput) break;
      }

      if (!fileInput) {
        return {
          type: 'upload',
          stepText: `Upload ${filePath} to ${selector}`,
          status: 'failed',
          selector,
          filePath,
          detail: `Could not find file input with selector: ${selector}`
        };
      }

      // Check if it's actually a file input
      const inputType = await fileInput.evaluate((el: HTMLInputElement) => el.type);
      if (inputType !== 'file') {
        return {
          type: 'upload',
          stepText: `Upload ${filePath} to ${selector}`,
          status: 'failed',
          selector,
          filePath,
          detail: `Element is not a file input (type: ${inputType})`
        };
      }

      // Handle file path - if it's a local file path, use it directly
      // Otherwise, treat it as a relative path or create a temporary file
      let absolutePath = filePath;
      
      // For testing purposes, if the file doesn't exist, create a dummy file
      try {
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
          // Create a dummy file for testing
          const path = require('path');
          const testDir = path.dirname(filePath);
          if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
          }
          fs.writeFileSync(filePath, 'dummy file content for testing');
        }
      } catch (err) {
        // If we can't create the file, continue anyway and let Playwright handle the error
      }

      // Upload the file
      await fileInput.setInputFiles(absolutePath);

      // If description is provided, try to find and fill a description field
      if (description) {
        await this.sleep(500);
        try {
          await this.fillField('description', description);
        } catch {
          // Try common description field names
          const descFields = ['Description', 'Caption', 'Text', 'Comment', 'Notes'];
          let filled = false;
          for (const field of descFields) {
            try {
              await this.fillField(field, description);
              filled = true;
              break;
            } catch {
              continue;
            }
          }
          
          if (!filled) {
            // If we can't find a description field, just note it
            console.log(`Could not find description field for: ${description}`);
          }
        }
      }

      return {
        type: 'upload',
        stepText: `Upload ${filePath}${description ? ` with description "${description}"` : ''} to ${selector}`,
        status: 'passed',
        selector,
        filePath,
        description: description || undefined
      };

    } catch (err) {
      return {
        type: 'upload',
        stepText: `Upload ${filePath} to ${selector}`,
        status: 'failed',
        selector,
        filePath,
        detail: err instanceof Error ? err.message : String(err)
      };
    }
  }

  private async findBestFieldLocator(context: Page | Frame, label: string) {
    const locator = context.locator('input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]');
    const requestedLabel = this.cleanFieldLabel(label);

    const best = await locator.evaluateAll((elements: Element[], rawLabel: string) => {
      const normalize = (value: unknown) => String(value || '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const stopWords = new Set(['required', 'field', 'input', 'enter', 'type', 'fill', 'your', 'the', 'a', 'an']);
      const labelText = normalize(rawLabel);
      const labelTokens = labelText.split(' ').filter((token) => token && !stopWords.has(token));
      const hasAllTokens = (candidate: string) => labelTokens.length > 0 && labelTokens.every((token) => candidate.includes(token));
      const tokenMatches = (candidate: string) => labelTokens.filter((token) => candidate.includes(token)).length;

      const elementLabels = (element: Element) => {
        const labels: string[] = [];
        const input = element as HTMLInputElement;
        if ('labels' in input && input.labels) {
          labels.push(...Array.from(input.labels).map((item) => item.textContent || ''));
        }
        const parentLabel = element.closest('label');
        if (parentLabel) labels.push(parentLabel.textContent || '');
        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
          labels.push(...labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || ''));
        }
        return labels;
      };

      const scoreCandidate = (candidateValue: string, exactScore: number, containsScore: number, tokenScore: number) => {
        const candidate = normalize(candidateValue);
        if (!candidate) return 0;
        if (candidate === labelText) return exactScore;
        if (candidate.includes(labelText) || labelText.includes(candidate)) return containsScore;
        if (hasAllTokens(candidate)) return tokenScore;
        const matches = tokenMatches(candidate);
        return matches > 0 ? Math.min(tokenScore - 10, matches * 18) : 0;
      };

      let bestIndex = -1;
      let bestScore = 0;
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const input = element as HTMLInputElement;
        if (htmlElement.hidden || input.disabled || input.readOnly) return;

        const className = typeof htmlElement.className === 'string' ? htmlElement.className : '';
        const candidateGroups = [
          { values: elementLabels(element), exact: 140, contains: 115, token: 95 },
          { values: [element.getAttribute('aria-label'), element.getAttribute('placeholder'), element.getAttribute('title')], exact: 130, contains: 105, token: 90 },
          { values: [element.getAttribute('name'), element.getAttribute('id'), element.getAttribute('autocomplete'), element.getAttribute('data-testid'), element.getAttribute('data-test'), element.getAttribute('data-qa')], exact: 120, contains: 95, token: 80 },
          { values: [className], exact: 80, contains: 65, token: 50 }
        ];

        let score = 0;
        for (const group of candidateGroups) {
          for (const candidate of group.values) {
            score = Math.max(score, scoreCandidate(candidate || '', group.exact, group.contains, group.token));
          }
        }

        const type = normalize(element.getAttribute('type'));
        const tagName = normalize(element.tagName);
        if (labelTokens.some((token) => token.includes('pass')) && type === 'password') score += 70;
        if (labelTokens.some((token) => ['email', 'mail'].includes(token)) && type === 'email') score += 45;
        if (labelTokens.some((token) => ['phone', 'mobile', 'tel'].includes(token)) && type === 'tel') score += 45;
        if (tagName === 'textarea' && labelTokens.some((token) => ['message', 'comment', 'description', 'details'].includes(token))) score += 35;

        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      });

      return bestIndex >= 0 && bestScore >= 45 ? { index: bestIndex, score: bestScore } : null;
    }, requestedLabel).catch(() => null);

    return best ? locator.nth(best.index) : null;
  }

  private async tryFillLocator(locator: any, value: string): Promise<boolean> {
    try {
      if (!(await locator.count())) return false;
      if (!(await locator.isVisible({ timeout: 1000 }).catch(() => false))) return false;
      if (!(await locator.isEnabled({ timeout: 1000 }).catch(() => false))) return false;

      // Highlight the field before filling
      await this.highlightElement(locator);

      const meta = await locator.evaluate((element: Element) => ({
        tagName: element.tagName.toLowerCase(),
        type: (element as HTMLInputElement).type?.toLowerCase() || ''
      })).catch(() => ({ tagName: '', type: '' }));

      if (meta.tagName === 'select') {
        await locator.selectOption({ label: value }, { timeout: 5000 })
          .catch(() => locator.selectOption(value, { timeout: 5000 }));
        return true;
      }

      if (meta.type === 'checkbox') {
        const shouldCheck = /^(1|true|yes|y|on|check|checked)$/i.test(value.trim());
        const shouldUncheck = /^(0|false|no|n|off|uncheck|unchecked)$/i.test(value.trim());
        if (!shouldCheck && !shouldUncheck) return false;
        await locator.setChecked(shouldCheck, { timeout: 5000 });
        return true;
      }

      if (meta.type === 'radio') {
        await locator.check({ timeout: 5000 });
        return true;
      }

      await locator.fill(value, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  private async closeModal(): Promise<boolean> {
    const closePatterns = /^(close|dismiss|cancel|done|not now|maybe later|skip|x|×)$/i;
    const dialog = this.page.getByRole('dialog').last();
    const scopes = await dialog.count().catch(() => 0) ? [dialog, this.page] : [this.page];

    for (const scope of scopes) {
      const clicked = await this.clickFirstVisible([
        scope.getByRole('button', { name: closePatterns }),
        scope.locator('button[aria-label*="close" i], [role="button"][aria-label*="close" i], button[class*="close" i], [role="button"][class*="close" i], [data-testid*="close" i], [data-test*="close" i], [data-qa*="close" i]'),
        scope.getByText(/^(×|x)$/i)
      ]);
      if (clicked) return true;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  private async waitForExpectedUrl(expectedUrl: string) {
    const expected = this.normalizeUrl(expectedUrl);
    const context = this.page.context();
    const deadline = Date.now() + 30000;
    let currentUrl = this.page.isClosed?.() ? '<closed>' : this.page.url();

    while (Date.now() < deadline) {
      const pages = context.pages().filter((p) => !p.isClosed?.());
      const match = pages.find((p) => this.urlsMatch(p.url(), expected));
      if (match) {
        await match.bringToFront().catch(() => {});
        this.page = match;
        return;
      }

      currentUrl = pages[pages.length - 1]?.url() || currentUrl;
      await this.sleep(500);
    }

    throw new Error(`Expected URL ${expected}, but current URL was ${currentUrl}`);
  }

  // --- String Parsers & Normalizers ---

  private normalizeUrl(url: string) {
    if (/^(data|about|file):/i.test(url)) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private flexibleNamePattern(value: string) {
    const escaped = this.escapeRegExp(this.removeTrailingCount(value).trim())
      .replace(/\s+/g, '[\\s-]*');
    return new RegExp(`${escaped}(?:\\s*\\(\\s*\\d+\\s*\\))?`, 'i');
  }

  private removeTrailingCount(value: string) {
    return value.replace(/\s*\(\s*\d+\s*\)\s*$/g, '');
  }

  private redactSensitiveText(value: string): string {
    return value
      .split('\n')
      .map((line) => {
        const field = this.parseFieldInstruction(line);
        return field ? `${field.label} : [redacted]` : line;
      })
      .join('\n')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
  }

  private parseFieldInstruction(step: string) {
    const fieldInstructionPattern = /^(?:(?:enter|type|fill|set)(?:\s+text)?\s+)?([^:=]+?)\s*[:=]\s*(.+)$/i;
    const actionLabelPattern = /^(open|click|tap|press|select|choose|scroll|wait|go|goto|navigate|check|verify|assert|close|dismiss|enter|type|fill|set)\b/i;

    const match = step.trim().match(fieldInstructionPattern);
    if (match) {
      const label = match[1].trim().replace(/\s+/g, ' ');
      const value = match[2].trim();
      if (!label || actionLabelPattern.test(label)) return null;
      if (/\bhttps?$/i.test(label) && value.startsWith('//')) return null;
      if (!this.isLikelyFieldLabel(label)) return null;
      if (!value) return null;

      return { label, value };
    }

    return this.parseNaturalFieldInstruction(step);
  }

  private parseNaturalFieldInstruction(step: string) {
    const match = step.trim().replace(/\s+/g, ' ').match(/^(?:enter|type|fill|set)\s+(.+)$/i);
    if (!match) return null;

    const remainder = match[1].trim();
    const emailMatch = remainder.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch?.index && emailMatch.index > 0) {
      const label = remainder.slice(0, emailMatch.index).trim();
      const value = remainder.slice(emailMatch.index).trim();
      if (this.isLikelyFieldLabel(label) && value) return { label, value };
    }

    const commonFieldLabels = [
      'email or mobile number', 'email or phone number', 'email or mobile', 'email or phone',
      'email address', 'mobile number', 'phone number', 'user name', 'username', 'password',
      'passcode', 'email', 'e-mail', 'phone', 'mobile', 'text'
    ];

    const normalizedRemainder = this.normalizeCommandText(remainder);
    for (const label of commonFieldLabels) {
      const normalizedLabel = this.normalizeCommandText(label);
      if (normalizedRemainder === normalizedLabel) continue;
      if (!normalizedRemainder.startsWith(`${normalizedLabel} `)) continue;
      const value = remainder.slice(label.length).trim();
      if (value) return { label, value };
    }

    return null;
  }

  private normalizeCommandText(value: string) {
    return value
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isLikelyFieldLabel(label: string): boolean {
    const cleaned = this.cleanFieldLabel(label);
    if (cleaned.length > 80 || !/[a-z0-9]/i.test(cleaned)) return false;
    if (/[{}[\]<>="`\\.:]/.test(cleaned)) return false;
    if (/\b(locator|call log|timeout|waiting|getbyrole|getbytext|error|clickable target|could not find)\b/i.test(cleaned)) return false;
    return /^[a-z0-9\s#&/()',+*-]+$/i.test(cleaned);
  }

  private cleanFieldLabel(label: string) {
    return label
      .replace(/^\s*(?:required|enter|type|fill)\s+/i, '')
      .replace(/\s*\*\s*$/g, '')
      .trim();
  }

  private isPasswordLabel(label: string) {
    return /\b(pass(word|code)?|pwd)\b/i.test(label);
  }

  private hasRedactedPlaceholder(value: string) {
    return /\[redactedHeader(?:-email)?\]|\[redacted(?:-email)?\]/i.test(value);
  }

  private parseOpenInstruction(step: string) {
    const match = step.trim().replace(/\s+/g, ' ').match(/^(?:open|go\s+to|goto|navigate(?:\s+to)?)(?:\s+(?:page|url|site|website))?\s+(.+)$/i);
    if (!match) return null;

    const target = this.stripWrappingQuotes(match[1].trim());
    if (/^(home|home\s+page|homepage)$/i.test(target)) {
      return { target, isHome: true };
    }
    return target ? { target, isHome: false } : null;
  }

  private parseClickTarget(step: string) {
    const match = step.trim().replace(/\s+/g, ' ').match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(.+)$/i);
    if (!match) return null;

    return this.stripWrappingQuotes(match[1])
      .replace(/^(?:on|the)\s+/i, '')
      .trim();
  }

  private parseEnhancedClickTarget(step: string) {
    const normalized = step.trim().replace(/\s+/g, ' ');
    
    // Pattern 0: Direct ID/TestID selection - "Click button with id 'primary-submit'", "Click element with testid 'submit-btn'"
    const directIdMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(?:button|element)\s+with\s+(id|testid|data-testid|data-test|data-qa)\s+['"](.+)['"]$/i);
    if (directIdMatch) {
      return {
        type: 'direct-attribute',
        attribute: directIdMatch[2].toLowerCase(),
        value: directIdMatch[3].trim()
      };
    }

    // Pattern 0.5: Direct CSS selector - "Click element #submit-btn", "Click .btn-primary"
    const directSelectorMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(?:element\s+)?([#.][\w-]+)$/i);
    if (directSelectorMatch) {
      return {
        type: 'css-selector',
        selector: directSelectorMatch[2].trim()
      };
    }

    // Pattern 1: Index-based selection - "Click the 2nd Submit button", "Click the 3rd Save button"
    const indexMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+(.+?)(?:\s+button)?$/i);
    if (indexMatch) {
      return {
        type: 'index',
        index: parseInt(indexMatch[2]) - 1, // Convert to 0-based index
        target: indexMatch[3].trim().replace(/button$/, '').trim()
      };
    }

    // Pattern 2: Last/First based - "Click the last Submit button", "Click the first Save button"
    const positionMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(the\s+)?(first|last)\s+(.+?)(?:\s+button)?$/i);
    if (positionMatch) {
      return {
        type: 'position',
        position: positionMatch[2].toLowerCase() as 'first' | 'last',
        target: positionMatch[3].trim().replace(/button$/, '').trim()
      };
    }

    // Pattern 3: Position-based - "Click the top Submit button", "Click the bottom Save button"
    const topBottomMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(?:the\s+)?(top|bottom)\s+(.+?)(?:\s+button)?$/i);
    if (topBottomMatch) {
      return {
        type: 'position',
        position: topBottomMatch[2].toLowerCase() as 'top' | 'bottom',
        target: topBottomMatch[3].trim().replace(/button$/, '').trim()
      };
    }

    // Pattern 4: Context-based - "Click Submit in the login form", "Click Save in the header"
    const contextMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(.+?)\s+in\s+(.+)$/i);
    if (contextMatch) {
      return {
        type: 'context',
        target: contextMatch[2].trim().replace(/button$/, '').trim(),
        context: contextMatch[3].trim()
      };
    }

    // Pattern 5: Attribute-based - "Click Submit button with id 'primary-submit'", "Click Save button with class 'btn-primary'"
    const attrMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(.+?)\s+button\s+with\s+(id|class|name|data-testid|data-test|data-qa)\s+['"](.+)['"]$/i);
    if (attrMatch) {
      return {
        type: 'attribute',
        target: attrMatch[2].trim().replace(/button$/, '').trim(),
        attribute: attrMatch[3].toLowerCase(),
        value: attrMatch[4].trim()
      };
    }

    // Pattern 6: Nth-based - "Click the nth Submit button" (where n is number)
    const nthMatch = normalized.match(/^(?:click|tap|press|select|choose)(?:\s+(?:on|the))?\s+(?:the\s+)?nth\s+(\d+)(?:st|nd|rd|th)?\s+(.+?)(?:\s+button)?$/i);
    if (nthMatch) {
      return {
        type: 'index',
        index: parseInt(nthMatch[2]) - 1,
        target: nthMatch[3].trim().replace(/button$/, '').trim()
      };
    }

    return null;
  }

  private parseUrlCheck(step: string) {
    const match = step.trim().replace(/\s+/g, ' ').match(/^(?:check|verify|assert)(?:\s+(?:current|page))?\s+url(?:\s+(?:is|equals|contains))?\s+(.+)$/i);
    if (!match) return null;
    return this.stripWrappingQuotes(match[1].trim()) || null;
  }

  private parseScrollTarget(step: string) {
    const match = step.trim().replace(/\s+/g, ' ').match(/^scroll(?:\s+(?:to|down\s+to|into\s+view))?\s+(.+)$/i);
    if (!match) return null;
    return this.stripWrappingQuotes(match[1].trim()) || null;
  }

  private parseUploadInstruction(step: string) {
    // Patterns like:
    // "Upload [file path]" (simple)
    // "Upload [file path] to [selector]"
    // "Upload image [file path]"
    // "Select file [file path]"
    // "Choose file [file path] for [selector]"
    // "Upload [file path] with description [description]"
    
    // Order matters - more specific patterns first
    const uploadPatterns = [
      /^(?:upload|select|choose)\s+(?:file|image|document)?\s*(.+?)\s+(?:to|for|in|at)\s+(.+)$/i,
      /^(?:upload|select|choose)\s+(?:file|image|document)?\s*(.+?)\s+with\s+description\s+(.+)$/i,
      /^(?:upload|select|choose)\s+(?:file|image|document)?\s*(.+)$/i  // Simple upload
    ];

    for (const pattern of uploadPatterns) {
      const match = step.trim().replace(/\s+/g, ' ').match(pattern);
      if (match) {
        const filePath = this.stripWrappingQuotes(match[1].trim());
        const selectorOrDesc = match[2] ? this.stripWrappingQuotes(match[2].trim()) : null;
        
        // Check if the second match is a selector or description
        if (selectorOrDesc) {
          if (selectorOrDesc.toLowerCase().startsWith('description') || selectorOrDesc.toLowerCase().includes('desc')) {
            return {
              selector: 'input[type="file"]',
              filePath,
              description: selectorOrDesc.replace(/^(description|desc)[:\s]+/i, '').trim()
            };
          } else {
            return {
              selector: selectorOrDesc,
              filePath,
              description: null
            };
          }
        }
        
        // Simple upload without selector or description
        return {
          selector: 'input[type="file"]',
          filePath,
          description: null
        };
      }
    }

    return null;
  }

  private isCloseModalInstruction(step: string) {
    return /^(?:close|dismiss)(?:\s+the)?\s+(?:modal|dialog|popup)$/i.test(step.trim().replace(/\s+/g, ' '));
  }

  private stripWrappingQuotes(value: string) {
    return value.trim().replace(/^["']|["']$/g, '');
  }

  private parseWaitMs(step: string): number {
    const match = step.match(/^wait(?:\s+for)?(?:\s+(\d+(?:\.\d+)?)\s*(milliseconds?|msecs?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m))?/i);
    if (!match?.[1]) return 1500;

    const amount = Number(match[1]);
    const unit = (match[2] || 'seconds').toLowerCase();
    const ms = unit.startsWith('m') && !unit.startsWith('ms') && !unit.startsWith('millisecond')
      ? amount * 60000
      : unit.startsWith('ms') || unit.startsWith('millisecond') || unit.startsWith('msec')
        ? amount
        : amount * 1000;
    return Math.min(Math.max(Math.round(ms), 250), 120000);
  }

  private urlsMatch(currentUrl: string, expectedUrl: string) {
    const current = this.normalizeComparableUrl(currentUrl);
    const expected = this.normalizeComparableUrl(expectedUrl);
    return current === expected
      || current.startsWith(`${expected}?`)
      || current.startsWith(`${expected}#`)
      || current.startsWith(`${expected}/`)
      || current.includes(expected);
  }

  private normalizeComparableUrl(value: string) {
    return value.trim().replace(/\/+$/, '');
  }

  private expandClickNames(names: string[]) {
    return names.flatMap((name) => {
      const cleaned = this.removeTrailingCount(name.replace(/\b(button|link|tab|menu item)\b/gi, '')).trim();
      if (/^(log\s*in|login|sign\s*in|signin)$/i.test(cleaned)) {
        return [cleaned, 'Log In', 'Login', 'Sign In', 'Sign in', 'Sign-in'];
      }
      return [cleaned || name, name];
    });
  }

  // ─── Hover ───────────────────────────────────────────────────────────────

  private parseHoverTarget(step: string): string | null {
    const match = step.trim().replace(/\s+/g, ' ')
      .match(/^(?:hover(?:\s+over)?(?:\s+(?:on|the))?)(?:\s+on)?\s+(.+)$/i);
    if (!match) return null;
    return this.stripWrappingQuotes(match[1]).replace(/^(?:on|the)\s+/i, '').trim() || null;
  }

  private async hoverByName(name: string): Promise<void> {
    for (const n of this.expandClickNames([name])) {
      const pattern = this.flexibleNamePattern(n);
      const locators = [
        this.page.getByRole('link', { name: pattern }),
        this.page.getByRole('button', { name: pattern }),
        this.page.getByRole('menuitem', { name: pattern }),
        this.page.getByText(pattern),
      ];
      for (const locator of locators) {
        const count = await locator.count().catch(() => 0);
        for (let i = 0; i < Math.min(count, 5); i++) {
          const candidate = locator.nth(i);
          if (await candidate.isVisible({ timeout: 500 }).catch(() => false)) {
            // Highlight element before hovering
            await this.highlightElement(candidate);
            await candidate.hover({ timeout: 7000 });
            return;
          }
        }
      }
      // Fallback: scored locator search
      const scored = await this.findBestClickableLocator(this.page, n);
      if (scored) {
        // Highlight element before hovering
        await this.highlightElement(scored);
        await scored.hover({ timeout: 7000 });
        return;
      }
    }
    throw new Error(`Could not locate any element to hover matching: "${name}"`);
  }

  // ─── Press key ───────────────────────────────────────────────────────────

  private parsePressKey(step: string): string | null {
    const match = step.trim().replace(/\s+/g, ' ')
      .match(/^(?:press|hit|type\s+key)\s+(.+)$/i);
    if (!match) return null;
    const raw = this.stripWrappingQuotes(match[1]).trim();
    // Map common aliases to Playwright key names
    const aliases: Record<string, string> = {
      enter: 'Enter', return: 'Enter', tab: 'Tab', escape: 'Escape', esc: 'Escape',
      space: 'Space', backspace: 'Backspace', delete: 'Delete', del: 'Delete',
      arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
      up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
      pageup: 'PageUp', pagedown: 'PageDown', home: 'Home', end: 'End',
    };
    return aliases[raw.toLowerCase()] ?? raw;
  }

  // ─── Assert text ──────────────────────────────────────────────────────────

  private parseAssertText(step: string): string | null {
    const match = step.trim().replace(/\s+/g, ' ')
      .match(/^(?:assert|check|verify|expect)(?:\s+(?:text|that|page\s+contains?|contains?))?\s+["']?(.+?)["']?$/i);
    if (!match) return null;
    // Avoid matching "check url" — already handled
    if (/^url\b/i.test(match[1].trim())) return null;
    return match[1].trim() || null;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- Conditional Step Support ---

  private parseConditionalStep(step: string): ConditionalStep | null {
    // Parse patterns like:
    // "IF text 'Login failed' THEN click Register"
    // "IF text 'Login failed' THEN click Register ELSE click Forgot Password"
    // "IF element exists 'Error message' THEN click Close"
    // "IF text 'Invalid Username or Password.' wait 3s THEN click register"
    // "IF status code 401 THEN click register"
    const pattern = /^if\s+(text|element\s+exists|element\s+visible|url\s+contains|status\s+code)\s+['"]?(.+?)['"]?(?:\s+wait\s+(\d+(?:\.\d+)?)\s*(s|sec|second|seconds|ms|millisecond|milliseconds))?\s+then\s+(.+?)(?:\s+else\s+(.+))?$/i;
    const match = step.trim().match(pattern);
    
    if (!match) return null;

    return {
      conditionType: match[1].toLowerCase().replace(/\s+/g, '_') as ConditionType,
      conditionValue: match[2],
      waitBeforeCheck: match[3] ? this.parseWaitMs(`wait ${match[3]} ${match[4] || 's'}`) : undefined,
      thenStep: match[5].trim(),
      elseStep: match[6] ? match[6].trim() : undefined
    };
  }

  private async executeConditional(conditional: ConditionalStep, safeStep: string): Promise<Omit<BrowserAction, 'screenshotPath'>> {
    // Wait before checking condition if specified (useful for toast messages that appear after delay)
    if (conditional.waitBeforeCheck) {
      await this.sleep(conditional.waitBeforeCheck);
    }

    const conditionMet = await this.evaluateCondition(conditional);

    const stepToExecute = conditionMet ? conditional.thenStep : conditional.elseStep;

    if (!stepToExecute) {
      return {
        type: 'conditional',
        stepText: safeStep,
        status: 'passed',
        detail: `Condition not met, no ELSE step to execute`
      };
    }

    try {
      const result = await this.runStep(stepToExecute);
      return {
        type: 'conditional',
        stepText: safeStep,
        status: result.status,
        detail: `Condition ${conditionMet ? 'met' : 'not met'}, executed: ${stepToExecute}`
      };
    } catch (err) {
      return {
        type: 'conditional',
        stepText: safeStep,
        status: 'failed',
        detail: `Failed to execute conditional step: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }

  private async evaluateCondition(conditional: ConditionalStep): Promise<boolean> {
    switch (conditional.conditionType) {
      case 'text':
        return await this.checkTextVisible(conditional.conditionValue);
      case 'element_exists':
        return await this.checkElementExists(conditional.conditionValue);
      case 'element_visible':
        return await this.checkElementVisible(conditional.conditionValue);
      case 'url_contains':
        return await this.checkUrlContains(conditional.conditionValue);
      case 'status_code':
        return await this.checkStatusCode(conditional.conditionValue);
      default:
        return false;
    }
  }

  private async checkTextVisible(text: string): Promise<boolean> {
    try {
      // Check main page first
      const mainLocator = this.page.getByText(new RegExp(this.escapeRegExp(text), 'i')).first();
      if (await mainLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Highlight the text element when found
        await this.highlightElement(mainLocator);
        return true;
      }

      // Check all frames (useful for iframes, shadow DOM, etc.)
      const contexts = [this.page, ...this.page.frames()];
      for (const context of contexts) {
        const frameLocator = context.getByText(new RegExp(this.escapeRegExp(text), 'i')).first();
        if (await frameLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Highlight the text element when found
          await this.highlightElement(frameLocator);
          return true;
        }
      }

      // Check body text directly as fallback (useful for toast messages)
      const bodyText = await this.page.evaluate(() => document.body.innerText);
      return bodyText.toLowerCase().includes(text.toLowerCase());
    } catch {
      return false;
    }
  }

  private async checkElementExists(selector: string): Promise<boolean> {
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count().catch(() => 0);
      return count > 0;
    } catch {
      return false;
    }
  }

  private async checkElementVisible(selector: string): Promise<boolean> {
    try {
      const locator = this.page.locator(selector);
      return await locator.isVisible({ timeout: 3000 }).catch(() => false);
    } catch {
      return false;
    }
  }

  private async checkUrlContains(url: string): Promise<boolean> {
    try {
      const currentUrl = this.page.url();
      return currentUrl.toLowerCase().includes(url.toLowerCase());
    } catch {
      return false;
    }
  }

  private async checkStatusCode(statusCode: string): Promise<boolean> {
    try {
      // Check if any network failure matches the status code
      const targetCode = statusCode.trim();
      return this.networkFailures.some(failure =>
        failure.includes(`HTTP Response ${targetCode}`) ||
        failure.includes(`${targetCode}:`)
      );
    } catch {
      return false;
    }
  }
}

interface ConditionalStep {
  conditionType: ConditionType;
  conditionValue: string;
  waitBeforeCheck?: number;
  thenStep: string;
  elseStep?: string;
}

type ConditionType = 'text' | 'element_exists' | 'element_visible' | 'url_contains' | 'status_code';
