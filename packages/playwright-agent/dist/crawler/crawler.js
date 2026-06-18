"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawler = void 0;
const playwright_1 = require("playwright");
class Crawler {
    async crawl(options) {
        const maxDepth = options.maxDepth ?? 3;
        const maxPages = options.maxPages ?? 50;
        const seedUrl = this.normalizeUrl(options.url);
        const origin = new URL(seedUrl).origin;
        const visited = new Set();
        const queue = [{ url: seedUrl, depth: 0 }];
        const snapshots = [];
        let browser = null;
        // Resolve which browser engine to use
        const browserTypeMap = { chromium: playwright_1.chromium, firefox: playwright_1.firefox, webkit: playwright_1.webkit };
        const selectedBrowserType = browserTypeMap[options.browserType ?? 'chromium'] || playwright_1.chromium;
        try {
            browser = await selectedBrowserType.launch({ headless: options.headless ?? true });
            const context = await browser.newContext({
                viewport: { width: 1440, height: 900 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            while (queue.length > 0 && visited.size < maxPages) {
                const current = queue.shift();
                if (visited.has(current.url))
                    continue;
                visited.add(current.url);
                console.log(`Crawling URL: ${current.url} (depth ${current.depth}, total visited: ${visited.size})`);
                const page = await context.newPage();
                const consoleLogs = [];
                const networkFailures = [];
                // Attach console log listeners
                page.on('console', (msg) => {
                    if (msg.type() === 'error') {
                        consoleLogs.push(msg.text());
                    }
                });
                // Attach page error listener (unhandled JS errors)
                page.on('pageerror', (err) => {
                    consoleLogs.push(`Uncaught Exception: ${err.message}`);
                });
                // Attach network request listener to capture failed requests
                page.on('requestfailed', (req) => {
                    const failure = req.failure();
                    networkFailures.push(`Failed Request: ${req.url()} (${failure?.errorText || 'Unknown error'})`);
                });
                page.on('response', (res) => {
                    if (res.status() >= 400) {
                        networkFailures.push(`HTTP Response ${res.status()}: ${res.url()}`);
                    }
                });
                try {
                    await page.goto(current.url, { waitUntil: 'load', timeout: 30000 });
                    // Give dynamic elements some time to settle
                    await page.waitForTimeout(1000);
                    const html = await page.content();
                    const screenshotBuffer = await page.screenshot({ fullPage: true }).catch(() => undefined);
                    // Custom basic accessibility checklist (A11y)
                    const a11yIssues = await page.evaluate(() => {
                        const issues = [];
                        // Check for missing image alt attributes
                        document.querySelectorAll('img').forEach((img) => {
                            if (!img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
                                issues.push(`Image missing alt attribute: ${img.src}`);
                            }
                        });
                        // Check for empty button text
                        document.querySelectorAll('button').forEach((btn) => {
                            const text = btn.textContent?.trim() || btn.getAttribute('aria-label')?.trim();
                            if (!text) {
                                issues.push(`Interactive button lacks readable text or aria-label: ${btn.outerHTML.substring(0, 100)}`);
                            }
                        });
                        // Check for empty link text
                        document.querySelectorAll('a').forEach((link) => {
                            const text = link.textContent?.trim() || link.getAttribute('aria-label')?.trim();
                            if (!text && !link.querySelector('img')) {
                                issues.push(`Anchor link lacks readable text: ${link.outerHTML.substring(0, 100)}`);
                            }
                        });
                        return issues;
                    });
                    // Save page snapshots
                    snapshots.push({
                        url: current.url,
                        domSnapshot: html,
                        screenshotBuffer,
                        consoleLogs,
                        networkFailures,
                        a11yIssues
                    });
                    // Extract new links if we haven't reached max depth
                    if (current.depth < maxDepth) {
                        const links = await page.evaluate(() => {
                            return Array.from(document.querySelectorAll('a'))
                                .map((a) => a.href)
                                .filter(Boolean);
                        });
                        for (const link of links) {
                            const cleanLink = this.normalizeComparableUrl(link);
                            if (cleanLink.startsWith(origin) && !visited.has(cleanLink) && !queue.some((item) => item.url === cleanLink)) {
                                queue.push({ url: cleanLink, depth: current.depth + 1 });
                            }
                        }
                    }
                }
                catch (err) {
                    console.error(`Failed crawling page ${current.url}:`, err);
                    networkFailures.push(`Crawl Navigation Failed: ${err instanceof Error ? err.message : String(err)}`);
                    snapshots.push({
                        url: current.url,
                        domSnapshot: '',
                        consoleLogs,
                        networkFailures,
                        a11yIssues: []
                    });
                }
                finally {
                    await page.close();
                }
            }
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
        return {
            visitedUrls: Array.from(visited),
            snapshots
        };
    }
    normalizeUrl(url) {
        if (/^https?:\/\//i.test(url))
            return url;
        return `https://${url}`;
    }
    normalizeComparableUrl(url) {
        try {
            const parsed = new URL(url);
            parsed.hash = ''; // ignore hashes
            let path = parsed.pathname.trim();
            if (path.endsWith('/') && path.length > 1) {
                path = path.slice(0, -1);
            }
            return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
        }
        catch {
            return url;
        }
    }
}
exports.Crawler = Crawler;
//# sourceMappingURL=crawler.js.map