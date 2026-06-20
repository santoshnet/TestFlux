import { chromium, firefox, webkit, Browser, Page, BrowserType } from 'playwright';
import { CrawlOptions, CrawlResult, PageSnapshot, SEOIssue } from '../types';

export class Crawler {
  async crawl(options: CrawlOptions): Promise<CrawlResult> {
    const maxDepth = options.maxDepth ?? 3;
    const maxPages = options.maxPages ?? 50;
    const seedUrl = this.normalizeUrl(options.url);
    const origin = new URL(seedUrl).origin;

    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: seedUrl, depth: 0 }];
    const snapshots: PageSnapshot[] = [];

    let browser: Browser | null = null;

    // Resolve which browser engine to use
    const browserTypeMap: Record<string, BrowserType> = { chromium, firefox, webkit };
    const selectedBrowserType: BrowserType = browserTypeMap[options.browserType ?? 'chromium'] || chromium;

    try {
      browser = await selectedBrowserType.launch({ headless: options.headless ?? true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      while (queue.length > 0 && visited.size < maxPages) {
        const current = queue.shift()!;
        if (visited.has(current.url)) continue;
        visited.add(current.url);

        console.log(`Crawling URL: ${current.url} (depth ${current.depth}, total visited: ${visited.size})`);
        const page = await context.newPage();

        const consoleLogs: string[] = [];
        const networkFailures: string[] = [];

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
            const issues: string[] = [];
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

          // Comprehensive SEO Analysis
          const seoIssues = await page.evaluate(() => {
            const issues: any[] = [];
            
            // Check page title
            const title = document.querySelector('title');
            if (!title) {
              issues.push({
                title: 'Missing page title',
                description: 'Page has no <title> tag, which is essential for SEO',
                severity: 'critical',
                category: 'title',
                selector: 'head'
              });
            } else if (title.textContent && title.textContent.length < 10) {
              issues.push({
                title: 'Page title too short',
                description: `Page title is only ${title.textContent.length} characters. Recommended length is 50-60 characters.`,
                severity: 'high',
                category: 'title',
                selector: 'title'
              });
            } else if (title.textContent && title.textContent.length > 60) {
              issues.push({
                title: 'Page title too long',
                description: `Page title is ${title.textContent.length} characters. Recommended length is 50-60 characters for optimal search engine display.`,
                severity: 'medium',
                category: 'title',
                selector: 'title'
              });
            }

            // Check meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
              issues.push({
                title: 'Missing meta description',
                description: 'Page has no meta description. This reduces click-through rates from search results.',
                severity: 'high',
                category: 'meta',
                selector: 'meta[name="description"]'
              });
            } else {
              const descContent = metaDesc.getAttribute('content');
              if (descContent && descContent.length < 50) {
                issues.push({
                  title: 'Meta description too short',
                  description: `Meta description is only ${descContent.length} characters. Recommended length is 150-160 characters.`,
                  severity: 'medium',
                  category: 'meta',
                  selector: 'meta[name="description"]'
                });
              } else if (descContent && descContent.length > 160) {
                issues.push({
                  title: 'Meta description too long',
                  description: `Meta description is ${descContent.length} characters. Recommended length is 150-160 characters for optimal search engine display.`,
                  severity: 'low',
                  category: 'meta',
                  selector: 'meta[name="description"]'
                });
              }
            }

            // Check canonical tag
            const canonical = document.querySelector('link[rel="canonical"]');
            if (!canonical) {
              issues.push({
                title: 'Missing canonical tag',
                description: 'Page has no canonical tag, which can lead to duplicate content issues.',
                severity: 'medium',
                category: 'meta',
                selector: 'link[rel="canonical"]'
              });
            }

            // Check Open Graph tags
            const ogTitle = document.querySelector('meta[property="og:title"]');
            const ogDesc = document.querySelector('meta[property="og:description"]');
            const ogImage = document.querySelector('meta[property="og:image"]');
            const ogUrl = document.querySelector('meta[property="og:url"]');
            const ogType = document.querySelector('meta[property="og:type"]');
            const ogSiteName = document.querySelector('meta[property="og:site_name"]');
            
            if (!ogTitle) {
              issues.push({
                title: 'Missing og:title tag',
                description: 'Page is missing og:title tag, which is important for social media sharing.',
                severity: 'medium',
                category: 'meta',
                selector: 'meta[property="og:title"]'
              });
            }
            if (!ogDesc) {
              issues.push({
                title: 'Missing og:description tag',
                description: 'Page is missing og:description tag, which is important for social media sharing.',
                severity: 'medium',
                category: 'meta',
                selector: 'meta[property="og:description"]'
              });
            }
            if (!ogImage) {
              issues.push({
                title: 'Missing og:image tag',
                description: 'Page is missing og:image tag, which is important for social media sharing.',
                severity: 'medium',
                category: 'meta',
                selector: 'meta[property="og:image"]'
              });
            }
            if (!ogUrl) {
              issues.push({
                title: 'Missing og:url tag',
                description: 'Page is missing og:url tag, which helps specify the canonical URL for social media.',
                severity: 'low',
                category: 'meta',
                selector: 'meta[property="og:url"]'
              });
            }
            if (!ogType) {
              issues.push({
                title: 'Missing og:type tag',
                description: 'Page is missing og:type tag, which specifies the type of object (e.g., website).',
                severity: 'low',
                category: 'meta',
                selector: 'meta[property="og:type"]'
              });
            }

            // Check Twitter Card tags
            const twitterCard = document.querySelector('meta[name="twitter:card"]');
            const twitterTitle = document.querySelector('meta[name="twitter:title"]');
            const twitterDesc = document.querySelector('meta[name="twitter:description"]');
            const twitterImage = document.querySelector('meta[name="twitter:image"]');
            
            if (!twitterCard) {
              issues.push({
                title: 'Missing twitter:card tag',
                description: 'Page is missing twitter:card tag, which is important for Twitter card display.',
                severity: 'low',
                category: 'meta',
                selector: 'meta[name="twitter:card"]'
              });
            }
            if (!twitterTitle && !ogTitle) {
              issues.push({
                title: 'Missing twitter:title tag',
                description: 'Page is missing twitter:title tag, which is important for Twitter card display.',
                severity: 'low',
                category: 'meta',
                selector: 'meta[name="twitter:title"]'
              });
            }
            if (!twitterDesc && !ogDesc) {
              issues.push({
                title: 'Missing twitter:description tag',
                description: 'Page is missing twitter:description tag, which is important for Twitter card display.',
                severity: 'low',
                category: 'meta',
                selector: 'meta[name="twitter:description"]'
              });
            }
            if (!twitterImage && !ogImage) {
              issues.push({
                title: 'Missing twitter:image tag',
                description: 'Page is missing twitter:image tag, which is important for Twitter card display.',
                severity: 'low',
                category: 'meta',
                selector: 'meta[name="twitter:image"]'
              });
            }

            // Check for structured data (JSON-LD)
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            if (jsonLdScripts.length === 0) {
              issues.push({
                title: 'Missing structured data (JSON-LD)',
                description: 'Page has no JSON-LD structured data, which can help search engines understand content better.',
                severity: 'medium',
                category: 'meta',
                selector: 'script[type="application/ld+json"]'
              });
            }

            // Check heading structure
            const h1 = document.querySelectorAll('h1');
            if (h1.length === 0) {
              issues.push({
                title: 'Missing H1 tag',
                description: 'Page has no H1 heading, which is important for SEO and content structure.',
                severity: 'critical',
                category: 'headings',
                selector: 'body'
              });
            } else if (h1.length > 1) {
              issues.push({
                title: 'Multiple H1 tags',
                description: `Page has ${h1.length} H1 headings. Only one H1 per page is recommended for proper SEO structure.`,
                severity: 'high',
                category: 'headings',
                selector: 'h1'
              });
            }

            // Check for skipped heading levels
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            let prevLevel = 0;
            for (const heading of headings) {
              const level = parseInt(heading.tagName[1]);
              if (level > prevLevel + 1 && prevLevel !== 0) {
                issues.push({
                  title: 'Skipped heading level',
                  description: `Heading structure jumps from H${prevLevel} to H${level}. Headings should follow a logical sequence.`,
                  severity: 'medium',
                  category: 'headings',
                  selector: heading.tagName
                });
                break;
              }
              prevLevel = level;
            }

            // Check for images without alt text
            const images = document.querySelectorAll('img');
            let imagesWithoutAlt = 0;
            let largeImages = 0;
            images.forEach((img) => {
              if (!img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
                imagesWithoutAlt++;
              }
              // Check for large images
              if (img.naturalWidth > 2500 || img.naturalHeight > 2500) {
                largeImages++;
              }
            });
            if (imagesWithoutAlt > 0) {
              issues.push({
                title: 'Images missing alt text',
                description: `${imagesWithoutAlt} image(s) missing alt text. Alt text is important for accessibility and SEO.`,
                severity: 'high',
                category: 'images',
                selector: 'img'
              });
            }
            if (largeImages > 0) {
              issues.push({
                title: 'Large images detected',
                description: `${largeImages} image(s) are larger than 2500px. Consider optimizing for better performance.`,
                severity: 'low',
                category: 'performance',
                selector: 'img'
              });
            }

            // Check for broken internal links
            const links = document.querySelectorAll('a[href]');
            const brokenLinks: string[] = [];
            links.forEach((link) => {
              const href = link.getAttribute('href');
              if (href && (href === '#' || href === 'javascript:void(0)' || href === 'javascript:;')) {
                brokenLinks.push(link.textContent?.trim() || 'empty link');
              }
            });
            if (brokenLinks.length > 0) {
              issues.push({
                title: 'Empty or broken links found',
                description: `${brokenLinks.length} link(s) with empty or JavaScript href attributes detected.`,
                severity: 'medium',
                category: 'links',
                selector: 'a[href]'
              });
            }

            // Check for nofollow links
            const nofollowLinks = document.querySelectorAll('a[rel*="nofollow"]');
            if (nofollowLinks.length > 0) {
              issues.push({
                title: 'Nofollow links detected',
                description: `${nofollowLinks.length} link(s) with rel="nofollow" detected. Review if intentional.`,
                severity: 'low',
                category: 'links',
                selector: 'a[rel*="nofollow"]'
              });
            }

            // Check viewport meta tag for mobile
            const viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
              issues.push({
                title: 'Missing viewport meta tag',
                description: 'Page has no viewport meta tag, which can cause mobile display issues.',
                severity: 'critical',
                category: 'mobile',
                selector: 'meta[name="viewport"]'
              });
            } else {
              const viewportContent = viewport.getAttribute('content');
              if (viewportContent && !viewportContent.includes('width=device-width')) {
                issues.push({
                  title: 'Viewport meta tag missing responsive width',
                  description: 'Viewport meta tag does not include width=device-width, which may cause mobile display issues.',
                  severity: 'high',
                  category: 'mobile',
                  selector: 'meta[name="viewport"]'
                });
              }
            }

            // Check for favicon
            const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            if (!favicon) {
              issues.push({
                title: 'Missing favicon',
                description: 'Page has no favicon, which affects branding and user experience in browser tabs.',
                severity: 'low',
                category: 'meta',
                selector: 'link[rel="icon"]'
              });
            }

            // Check for video/audio elements
            const videos = document.querySelectorAll('video');
            const audios = document.querySelectorAll('audio');
            if (videos.length > 0 || audios.length > 0) {
              issues.push({
                title: 'Video/audio elements detected',
                description: `Page contains ${videos.length} video(s) and ${audios.length} audio(s). Ensure they have proper accessibility attributes.`,
                severity: 'low',
                category: 'content',
                selector: 'video, audio'
              });
            }

            // Check content length
            const bodyText = document.body?.textContent?.trim() || '';
            if (bodyText.length < 300) {
              issues.push({
                title: 'Insufficient content',
                description: `Page has only ${bodyText.length} characters of text content. Pages with more content tend to rank better in search results.`,
                severity: 'medium',
                category: 'content',
                selector: 'body'
              });
            }

            // Check for language attribute
            const htmlLang = document.documentElement.getAttribute('lang');
            if (!htmlLang) {
              issues.push({
                title: 'Missing HTML language attribute',
                description: 'HTML tag is missing lang attribute, which helps search engines understand the page language.',
                severity: 'medium',
                category: 'meta',
                selector: 'html'
              });
            }

            return issues;
          });

          // Save page snapshots
          snapshots.push({
            url: current.url,
            domSnapshot: html,
            screenshotBuffer,
            consoleLogs,
            networkFailures,
            a11yIssues,
            seoIssues
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
        } catch (err) {
          console.error(`Failed crawling page ${current.url}:`, err);
          networkFailures.push(`Crawl Navigation Failed: ${err instanceof Error ? err.message : String(err)}`);
          snapshots.push({
            url: current.url,
            domSnapshot: '',
            consoleLogs,
            networkFailures,
            a11yIssues: [],
            seoIssues: []
          });
        } finally {
          await page.close();
        }
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return {
      visitedUrls: Array.from(visited),
      snapshots
    };
  }

  private normalizeUrl(url: string) {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }

  private normalizeComparableUrl(url: string) {
    try {
      const parsed = new URL(url);
      parsed.hash = ''; // ignore hashes
      let path = parsed.pathname.trim();
      if (path.endsWith('/') && path.length > 1) {
        path = path.slice(0, -1);
      }
      return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
    } catch {
      return url;
    }
  }
}
