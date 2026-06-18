"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsRunner = void 0;
class ActionsRunner {
    page;
    baseUrl;
    constructor(page, baseUrl) {
        this.page = page;
        this.baseUrl = this.normalizeUrl(baseUrl);
    }
    async runStep(step) {
        const normalized = step.toLowerCase();
        const safeStep = this.redactSensitiveText(step);
        try {
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
                await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
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
                }
                else {
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
                }
                else {
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
                await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { });
                await this.sleep(800);
                return { type: 'navigate', stepText: safeStep, value: 'back', status: 'passed' };
            }
            if (/^go\s+forward$/i.test(normalized.trim())) {
                await this.page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { });
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
            return {
                type: 'wait',
                stepText: safeStep,
                status: 'failed',
                detail: 'Unsupported instruction. Supported: Open [URL], Click [Button], [Field]: [Value], Hover [Element], Press [Key], Scroll to [Text], Scroll top/bottom, Assert text [Text], Check URL [URL], Close modal, Go back, Go forward, Wait [Time], Screenshot'
            };
        }
        catch (err) {
            return {
                type: 'click', // Default category
                stepText: safeStep,
                status: 'failed',
                detail: this.redactSensitiveText(err instanceof Error ? err.message : String(err))
            };
        }
    }
    // --- Helper Scorer Logic ---
    async clickByName(names) {
        for (const name of this.expandClickNames(names)) {
            const pattern = this.flexibleNamePattern(name);
            const clicked = await this.clickFirstVisible([
                this.page.getByRole('link', { name: pattern }),
                this.page.getByRole('button', { name: pattern }),
                this.page.getByRole('tab', { name: pattern }),
                this.page.getByRole('menuitem', { name: pattern }),
                this.page.getByText(pattern),
            ]);
            if (clicked)
                return;
            const normalizedClick = await this.clickByNormalizedText(name);
            if (normalizedClick)
                return;
        }
        throw new Error(`Could not locate any clickable target matching: ${names.join(', ')}`);
    }
    async clickByNormalizedText(name) {
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
    async findBestClickableLocator(context, name) {
        const selector = [
            'a', 'button', '[role="button"]', '[role="link"]', '[role="menuitem"]',
            '[role="tab"]', '[role="option"]', '[onclick]', '[tabindex]:not([tabindex="-1"])',
            '[data-testid]', '[data-test]', '[data-qa]'
        ].join(', ');
        const locator = context.locator(selector);
        const best = await locator.evaluateAll((elements, rawTarget) => {
            const normalize = (value) => String(value || '')
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
            if (!target || targetTokens.length === 0)
                return null;
            const elementText = (element) => [
                element.textContent,
                element.getAttribute('aria-label'),
                element.getAttribute('title'),
                element.getAttribute('name'),
                element.getAttribute('id'),
                element.getAttribute('data-testid'),
                element.getAttribute('data-test'),
                element.getAttribute('data-qa')
            ].filter(Boolean).join(' ');
            const scoreCandidate = (candidateValue) => {
                const candidate = normalize(candidateValue);
                const candidateCompact = candidate.replace(/\s+/g, '');
                if (!candidate)
                    return 0;
                if (candidate === target || candidateCompact === targetCompact)
                    return 140;
                if (candidate.startsWith(target) || candidateCompact.startsWith(targetCompact))
                    return 120;
                if (candidate.includes(target) || candidateCompact.includes(targetCompact))
                    return 105;
                const matchedTokens = targetTokens.filter((token) => candidate.includes(token)).length;
                if (matchedTokens === targetTokens.length)
                    return 90;
                return matchedTokens > 0 ? matchedTokens * 20 : 0;
            };
            let bestIndex = -1;
            let bestScore = 0;
            elements.forEach((element, index) => {
                const htmlElement = element;
                const ariaDisabled = element.getAttribute('aria-disabled') === 'true';
                const input = element;
                if (htmlElement.hidden || input.disabled || ariaDisabled)
                    return;
                const rect = htmlElement.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0)
                    return;
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
    async clickFirstVisible(locators) {
        for (const locator of locators) {
            const count = Math.min(await locator.count().catch(() => 0), 10);
            for (let index = 0; index < count; index += 1) {
                const candidate = locator.nth(index);
                if (!(await candidate.isVisible({ timeout: 500 }).catch(() => false)))
                    continue;
                if (!(await candidate.isEnabled({ timeout: 500 }).catch(() => false)))
                    continue;
                await this.clickLocator(candidate);
                return true;
            }
        }
        return false;
    }
    async clickLocator(locator) {
        const popupPromise = this.page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
        await locator.click({ timeout: 7000, noWaitAfter: true }).catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            if (/click action done/i.test(message) && /waiting for scheduled navigations|navigation/i.test(message))
                return;
            throw err;
        });
        const popup = await popupPromise;
        if (popup) {
            await popup.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
            await popup.bringToFront().catch(() => { });
            this.page = popup; // Swap the current active tab
        }
    }
    async fillField(label, value) {
        try {
            await this.fillFieldOnce(label, value);
        }
        catch (err) {
            if (!this.isPasswordLabel(label))
                throw err;
            // If filling a password field fails, maybe we need to click "Next" or "Continue" first (e.g. multi-step login flows)
            await this.clickByName(['Next', 'Continue']).catch(() => { });
            await this.sleep(1200);
            await this.fillFieldOnce(label, value);
        }
    }
    async fillFieldOnce(label, value) {
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
                if (await this.tryFillLocator(locator, value))
                    return;
            }
            const scoredLocator = await this.findBestFieldLocator(context, label);
            if (scoredLocator && await this.tryFillLocator(scoredLocator, value)) {
                return;
            }
        }
        throw new Error(`Could not detect a visible form input matching label: "${label}"`);
    }
    async findBestFieldLocator(context, label) {
        const locator = context.locator('input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]');
        const requestedLabel = this.cleanFieldLabel(label);
        const best = await locator.evaluateAll((elements, rawLabel) => {
            const normalize = (value) => String(value || '')
                .toLowerCase()
                .replace(/[_-]+/g, ' ')
                .replace(/[^a-z0-9]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            const stopWords = new Set(['required', 'field', 'input', 'enter', 'type', 'fill', 'your', 'the', 'a', 'an']);
            const labelText = normalize(rawLabel);
            const labelTokens = labelText.split(' ').filter((token) => token && !stopWords.has(token));
            const hasAllTokens = (candidate) => labelTokens.length > 0 && labelTokens.every((token) => candidate.includes(token));
            const tokenMatches = (candidate) => labelTokens.filter((token) => candidate.includes(token)).length;
            const elementLabels = (element) => {
                const labels = [];
                const input = element;
                if ('labels' in input && input.labels) {
                    labels.push(...Array.from(input.labels).map((item) => item.textContent || ''));
                }
                const parentLabel = element.closest('label');
                if (parentLabel)
                    labels.push(parentLabel.textContent || '');
                const labelledBy = element.getAttribute('aria-labelledby');
                if (labelledBy) {
                    labels.push(...labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent || ''));
                }
                return labels;
            };
            const scoreCandidate = (candidateValue, exactScore, containsScore, tokenScore) => {
                const candidate = normalize(candidateValue);
                if (!candidate)
                    return 0;
                if (candidate === labelText)
                    return exactScore;
                if (candidate.includes(labelText) || labelText.includes(candidate))
                    return containsScore;
                if (hasAllTokens(candidate))
                    return tokenScore;
                const matches = tokenMatches(candidate);
                return matches > 0 ? Math.min(tokenScore - 10, matches * 18) : 0;
            };
            let bestIndex = -1;
            let bestScore = 0;
            elements.forEach((element, index) => {
                const htmlElement = element;
                const input = element;
                if (htmlElement.hidden || input.disabled || input.readOnly)
                    return;
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
                if (labelTokens.some((token) => token.includes('pass')) && type === 'password')
                    score += 70;
                if (labelTokens.some((token) => ['email', 'mail'].includes(token)) && type === 'email')
                    score += 45;
                if (labelTokens.some((token) => ['phone', 'mobile', 'tel'].includes(token)) && type === 'tel')
                    score += 45;
                if (tagName === 'textarea' && labelTokens.some((token) => ['message', 'comment', 'description', 'details'].includes(token)))
                    score += 35;
                if (score > bestScore) {
                    bestIndex = index;
                    bestScore = score;
                }
            });
            return bestIndex >= 0 && bestScore >= 45 ? { index: bestIndex, score: bestScore } : null;
        }, requestedLabel).catch(() => null);
        return best ? locator.nth(best.index) : null;
    }
    async tryFillLocator(locator, value) {
        try {
            if (!(await locator.count()))
                return false;
            if (!(await locator.isVisible({ timeout: 1000 }).catch(() => false)))
                return false;
            if (!(await locator.isEnabled({ timeout: 1000 }).catch(() => false)))
                return false;
            const meta = await locator.evaluate((element) => ({
                tagName: element.tagName.toLowerCase(),
                type: element.type?.toLowerCase() || ''
            })).catch(() => ({ tagName: '', type: '' }));
            if (meta.tagName === 'select') {
                await locator.selectOption({ label: value }, { timeout: 5000 })
                    .catch(() => locator.selectOption(value, { timeout: 5000 }));
                return true;
            }
            if (meta.type === 'checkbox') {
                const shouldCheck = /^(1|true|yes|y|on|check|checked)$/i.test(value.trim());
                const shouldUncheck = /^(0|false|no|n|off|uncheck|unchecked)$/i.test(value.trim());
                if (!shouldCheck && !shouldUncheck)
                    return false;
                await locator.setChecked(shouldCheck, { timeout: 5000 });
                return true;
            }
            if (meta.type === 'radio') {
                await locator.check({ timeout: 5000 });
                return true;
            }
            await locator.fill(value, { timeout: 5000 });
            return true;
        }
        catch {
            return false;
        }
    }
    async closeModal() {
        const closePatterns = /^(close|dismiss|cancel|done|not now|maybe later|skip|x|×)$/i;
        const dialog = this.page.getByRole('dialog').last();
        const scopes = await dialog.count().catch(() => 0) ? [dialog, this.page] : [this.page];
        for (const scope of scopes) {
            const clicked = await this.clickFirstVisible([
                scope.getByRole('button', { name: closePatterns }),
                scope.locator('button[aria-label*="close" i], [role="button"][aria-label*="close" i], button[class*="close" i], [role="button"][class*="close" i], [data-testid*="close" i], [data-test*="close" i], [data-qa*="close" i]'),
                scope.getByText(/^(×|x)$/i)
            ]);
            if (clicked)
                return true;
        }
        await this.page.keyboard.press('Escape').catch(() => { });
        return false;
    }
    async waitForExpectedUrl(expectedUrl) {
        const expected = this.normalizeUrl(expectedUrl);
        const context = this.page.context();
        const deadline = Date.now() + 30000;
        let currentUrl = this.page.isClosed?.() ? '<closed>' : this.page.url();
        while (Date.now() < deadline) {
            const pages = context.pages().filter((p) => !p.isClosed?.());
            const match = pages.find((p) => this.urlsMatch(p.url(), expected));
            if (match) {
                await match.bringToFront().catch(() => { });
                this.page = match;
                return;
            }
            currentUrl = pages[pages.length - 1]?.url() || currentUrl;
            await this.sleep(500);
        }
        throw new Error(`Expected URL ${expected}, but current URL was ${currentUrl}`);
    }
    // --- String Parsers & Normalizers ---
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
    flexibleNamePattern(value) {
        const escaped = this.escapeRegExp(this.removeTrailingCount(value).trim())
            .replace(/\s+/g, '[\\s-]*');
        return new RegExp(`${escaped}(?:\\s*\\(\\s*\\d+\\s*\\))?`, 'i');
    }
    removeTrailingCount(value) {
        return value.replace(/\s*\(\s*\d+\s*\)\s*$/g, '');
    }
    redactSensitiveText(value) {
        return value
            .split('\n')
            .map((line) => {
            const field = this.parseFieldInstruction(line);
            return field ? `${field.label} : [redacted]` : line;
        })
            .join('\n')
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
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
            if (/\bhttps?$/i.test(label) && value.startsWith('//'))
                return null;
            if (!this.isLikelyFieldLabel(label))
                return null;
            if (!value)
                return null;
            return { label, value };
        }
        return this.parseNaturalFieldInstruction(step);
    }
    parseNaturalFieldInstruction(step) {
        const match = step.trim().replace(/\s+/g, ' ').match(/^(?:enter|type|fill|set)\s+(.+)$/i);
        if (!match)
            return null;
        const remainder = match[1].trim();
        const emailMatch = remainder.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        if (emailMatch?.index && emailMatch.index > 0) {
            const label = remainder.slice(0, emailMatch.index).trim();
            const value = remainder.slice(emailMatch.index).trim();
            if (this.isLikelyFieldLabel(label) && value)
                return { label, value };
        }
        const commonFieldLabels = [
            'email or mobile number', 'email or phone number', 'email or mobile', 'email or phone',
            'email address', 'mobile number', 'phone number', 'user name', 'username', 'password',
            'passcode', 'email', 'e-mail', 'phone', 'mobile', 'text'
        ];
        const normalizedRemainder = this.normalizeCommandText(remainder);
        for (const label of commonFieldLabels) {
            const normalizedLabel = this.normalizeCommandText(label);
            if (normalizedRemainder === normalizedLabel)
                continue;
            if (!normalizedRemainder.startsWith(`${normalizedLabel} `))
                continue;
            const value = remainder.slice(label.length).trim();
            if (value)
                return { label, value };
        }
        return null;
    }
    normalizeCommandText(value) {
        return value
            .toLowerCase()
            .replace(/[_-]+/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    isLikelyFieldLabel(label) {
        const cleaned = this.cleanFieldLabel(label);
        if (cleaned.length > 80 || !/[a-z0-9]/i.test(cleaned))
            return false;
        if (/[{}[\]<>="`\\.:]/.test(cleaned))
            return false;
        if (/\b(locator|call log|timeout|waiting|getbyrole|getbytext|error|clickable target|could not find)\b/i.test(cleaned))
            return false;
        return /^[a-z0-9\s#&/()',+*-]+$/i.test(cleaned);
    }
    cleanFieldLabel(label) {
        return label
            .replace(/^\s*(?:required|enter|type|fill)\s+/i, '')
            .replace(/\s*\*\s*$/g, '')
            .trim();
    }
    isPasswordLabel(label) {
        return /\b(pass(word|code)?|pwd)\b/i.test(label);
    }
    hasRedactedPlaceholder(value) {
        return /\[redactedHeader(?:-email)?\]|\[redacted(?:-email)?\]/i.test(value);
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
    stripWrappingQuotes(value) {
        return value.trim().replace(/^["']|["']$/g, '');
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
        return Math.min(Math.max(Math.round(ms), 250), 120000);
    }
    urlsMatch(currentUrl, expectedUrl) {
        const current = this.normalizeComparableUrl(currentUrl);
        const expected = this.normalizeComparableUrl(expectedUrl);
        return current === expected
            || current.startsWith(`${expected}?`)
            || current.startsWith(`${expected}#`)
            || current.startsWith(`${expected}/`)
            || current.includes(expected);
    }
    normalizeComparableUrl(value) {
        return value.trim().replace(/\/+$/, '');
    }
    expandClickNames(names) {
        return names.flatMap((name) => {
            const cleaned = this.removeTrailingCount(name.replace(/\b(button|link|tab|menu item)\b/gi, '')).trim();
            if (/^(log\s*in|login|sign\s*in|signin)$/i.test(cleaned)) {
                return [cleaned, 'Log In', 'Login', 'Sign In', 'Sign in', 'Sign-in'];
            }
            return [cleaned || name, name];
        });
    }
    // ─── Hover ───────────────────────────────────────────────────────────────
    parseHoverTarget(step) {
        const match = step.trim().replace(/\s+/g, ' ')
            .match(/^(?:hover(?:\s+over)?(?:\s+(?:on|the))?)(?:\s+on)?\s+(.+)$/i);
        if (!match)
            return null;
        return this.stripWrappingQuotes(match[1]).replace(/^(?:on|the)\s+/i, '').trim() || null;
    }
    async hoverByName(name) {
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
                        await candidate.hover({ timeout: 7000 });
                        return;
                    }
                }
            }
            // Fallback: scored locator search
            const scored = await this.findBestClickableLocator(this.page, n);
            if (scored) {
                await scored.hover({ timeout: 7000 });
                return;
            }
        }
        throw new Error(`Could not locate any element to hover matching: "${name}"`);
    }
    // ─── Press key ───────────────────────────────────────────────────────────
    parsePressKey(step) {
        const match = step.trim().replace(/\s+/g, ' ')
            .match(/^(?:press|hit|type\s+key)\s+(.+)$/i);
        if (!match)
            return null;
        const raw = this.stripWrappingQuotes(match[1]).trim();
        // Map common aliases to Playwright key names
        const aliases = {
            enter: 'Enter', return: 'Enter', tab: 'Tab', escape: 'Escape', esc: 'Escape',
            space: 'Space', backspace: 'Backspace', delete: 'Delete', del: 'Delete',
            arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
            up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
            pageup: 'PageUp', pagedown: 'PageDown', home: 'Home', end: 'End',
        };
        return aliases[raw.toLowerCase()] ?? raw;
    }
    // ─── Assert text ──────────────────────────────────────────────────────────
    parseAssertText(step) {
        const match = step.trim().replace(/\s+/g, ' ')
            .match(/^(?:assert|check|verify|expect)(?:\s+(?:text|that|page\s+contains?|contains?))?\s+["']?(.+?)["']?$/i);
        if (!match)
            return null;
        // Avoid matching "check url" — already handled
        if (/^url\b/i.test(match[1].trim()))
            return null;
        return match[1].trim() || null;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.ActionsRunner = ActionsRunner;
//# sourceMappingURL=actions.js.map