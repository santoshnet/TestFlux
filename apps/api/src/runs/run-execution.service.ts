import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Run } from './run.entity';
import { Project } from '../projects/project.entity';
import { Bug } from '../bugs/bug.entity';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { createAIProvider } from '@aia/ai-provider';
import { Crawler, Analyzer, ActionsRunner, Reporter } from '@aia/playwright-agent';
import { chromium, firefox, webkit, BrowserType } from 'playwright';
import { SEOService } from '../seo/seo.service';
import * as fs from 'fs';

@Injectable()
export class RunExecutionService {
  constructor(
    @InjectRepository(Run)
    private runsRepository: Repository<Run>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Bug)
    private bugsRepository: Repository<Bug>,
    private storageService: StorageService,
    private configService: ConfigService,
    private seoService: SEOService
  ) {}

  async triggerRun(runId: string): Promise<void> {
    const run = await this.runsRepository.findOne({ where: { id: runId } });
    if (!run) {
      console.error(`Run ${runId} not found, unable to execute.`);
      return;
    }

    const project = await this.projectsRepository.findOne({ where: { id: run.projectId } });
    if (!project) {
      run.status = 'failed';
      run.errorMessage = 'Associated project not found.';
      await this.runsRepository.save(run);
      return;
    }

    // Mark as running and start async processing
    run.status = 'running';
    run.startedAt = new Date();
    await this.runsRepository.save(run);

    // Run in background
    this.executeRunBackground(run, project).catch((err) => {
      console.error(`Error executing run ${runId}:`, err);
    });
  }

  private async executeRunBackground(run: Run, project: Project): Promise<void> {
    const aiProviderName = project.aiProvider || this.configService.get<string>('AI_PROVIDER') || 'claude';
    const apiKey = aiProviderName === 'openai'
      ? this.configService.get<string>('OPENAI_API_KEY')
      : aiProviderName === 'groq'
      ? this.configService.get<string>('GROQ_API_KEY')
      : this.configService.get<string>('ANTHROPIC_API_KEY');

    const aiProvider = createAIProvider({
      provider: aiProviderName as 'claude' | 'openai' | 'groq',
      apiKey
    });

    const parsedSteps = run.userSteps ? JSON.parse(run.userSteps) : null;
    const snapshots: any[] = [];
    const stepResults: any[] = [];
    let generatedTestCode: string | null = null;
    let artifacts: any = {};
    let totalSEOIssues = 0;

    // Resolve the browser type from run.browser field (defaults to chromium)
    const browserTypeMap: Record<string, BrowserType> = { chromium, firefox, webkit };
    const browserType: BrowserType = browserTypeMap[run.browser] || chromium;

    // PLAYWRIGHT_HEADLESS=false → headed (visible window); anything else → headless
    const headlessEnv = this.configService.get<string>('PLAYWRIGHT_HEADLESS');
    const isHeadless = headlessEnv !== 'false';
    console.log(`[Run ${run.id}] browser=${run.browser} headless=${isHeadless} (PLAYWRIGHT_HEADLESS="${headlessEnv}")`);

    try {
      if (parsedSteps && Array.isArray(parsedSteps) && parsedSteps.length > 0) {
        // Targeted step execution flow
        console.log(`Running targeted steps for run ${run.id} on url: ${project.url} using ${run.browser}`);
        const browser = await browserType.launch({ headless: isHeadless });
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();

        const runner = new ActionsRunner(page, project.url);
        const analyzer = new Analyzer();

        let consoleLogs: string[] = [];
        let networkFailures: string[] = [];

        page.on('console', (msg: any) => { if (msg.type() === 'error') consoleLogs.push(msg.text()); });
        page.on('pageerror', (err: any) => { consoleLogs.push(`Uncaught Exception: ${err.message}`); });
        page.on('response', (res: any) => { if (res.status() >= 400) networkFailures.push(`HTTP Response ${res.status()}: ${res.url()}`); });

        let stepIndex = 0;
        let failed = false;

        for (const step of parsedSteps) {
          const result = await runner.runStep(step);
          const screenshotBuffer = await page.screenshot({ fullPage: true }).catch(() => undefined);
          
          let screenshotUrl = '';
          if (screenshotBuffer) {
            const filename = `runs/${run.id}/step-${stepIndex + 1}.png`;
            screenshotUrl = await this.storageService.uploadFile(filename, screenshotBuffer, 'image/png');
          }

          stepResults.push({
            step,
            status: result.status,
            detail: result.detail,
            screenshotUrl
          });

          if (result.status === 'failed') {
            failed = true;
            run.status = 'failed';
            run.errorMessage = `Step failed: "${step}". Detail: ${result.detail}`;
            break;
          }

          stepIndex++;
        }

        // Capture snapshot of the final page state for static and LLM analysis
        const domSnapshot = await page.content().catch(() => '');
        const finalScreenshot = await page.screenshot({ fullPage: true }).catch(() => undefined);
        let finalScreenshotUrl = '';
        if (finalScreenshot) {
          finalScreenshotUrl = await this.storageService.uploadFile(`runs/${run.id}/final.png`, finalScreenshot, 'image/png');
        }

        // Perform SEO analysis on the final page
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
          if (!ogTitle || !ogDesc || !ogImage) {
            issues.push({
              title: 'Missing Open Graph tags',
              description: 'Page is missing some Open Graph tags (og:title, og:description, og:image), which improve social media sharing.',
              severity: 'low',
              category: 'meta',
              selector: 'meta[property^="og:"]'
            });
          }

          // Check Twitter Card tags
          const twitterCard = document.querySelector('meta[name="twitter:card"]');
          if (!twitterCard) {
            issues.push({
              title: 'Missing twitter:card tag',
              description: 'Page is missing twitter:card tag, which is important for Twitter card display.',
              severity: 'low',
              category: 'meta',
              selector: 'meta[name="twitter:card"]'
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
          images.forEach((img) => {
            if (!img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
              imagesWithoutAlt++;
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

          return issues;
        });

        snapshots.push({
          url: page.url(),
          domSnapshot,
          screenshotUrl: finalScreenshotUrl,
          consoleLogs,
          networkFailures,
          a11yIssues: [],
          seoIssues
        });

        await browser.close();

        if (failed) {
          run.completedAt = new Date();
          run.artifacts = JSON.stringify({ stepResults });
          await this.runsRepository.save(run);
          return;
        }

        // Generate Playwright spec test code using Reporter
        const reporter = new Reporter();
        generatedTestCode = reporter.generatePlaywrightTest(project.url, parsedSteps);

        // Eagerly persist stepResults so the run details page can show them
        // even if the subsequent AI analysis step crashes or times out
        artifacts.stepResults = stepResults;
        run.artifacts = JSON.stringify(artifacts);
        await this.runsRepository.save(run);

        // Process SEO issues for the final page
        let totalSEOIssues = 0;
        for (const snap of snapshots) {
          if (snap.seoIssues && snap.seoIssues.length > 0) {
            await this.seoService.createBulk(run.id, project.id, snap.url, snap.seoIssues);
            totalSEOIssues += snap.seoIssues.length;
          }
        }

      } else {
        // General BFS Site Crawl flow
        console.log(`Running site crawl for run ${run.id} on seed: ${project.url} using ${run.browser}`);
        const crawler = new Crawler();
        const crawlResult = await crawler.crawl({
          url: project.url,
          maxDepth: project.maxDepth,
          maxPages: project.maxPages,
          headless: isHeadless,
          browserType: (run.browser || 'chromium') as 'chromium' | 'firefox' | 'webkit',
        });

        // Upload crawler screenshots
        for (let i = 0; i < crawlResult.snapshots.length; i++) {
          const snap = crawlResult.snapshots[i];
          let screenshotUrl = '';
          if (snap.screenshotBuffer) {
            const filename = `runs/${run.id}/page-${i + 1}.png`;
            screenshotUrl = await this.storageService.uploadFile(filename, snap.screenshotBuffer, 'image/png');
          }

          snapshots.push({
            url: snap.url,
            domSnapshot: snap.domSnapshot,
            screenshotUrl,
            consoleLogs: snap.consoleLogs,
            networkFailures: snap.networkFailures,
            a11yIssues: snap.a11yIssues,
            seoIssues: snap.seoIssues || []
          });
        }
      }

      // 3. Analyze all collected page snapshots for bugs (static rules + AI LLM audit)
      const analyzer = new Analyzer();
      let totalBugs = 0;

      for (const snap of snapshots) {
        console.log(`Analyzing page: ${snap.url}`);
        // Pass aiProvider to execute LLM visual & structural analysis
        const detectedBugs = await analyzer.analyze(snap, aiProvider);

        for (const det of detectedBugs) {
          const bug = this.bugsRepository.create({
            runId: run.id,
            projectId: project.id,
            title: det.title,
            description: det.description,
            pageUrl: snap.url,
            severity: det.severity,
            category: det.category,
            screenshotUrls: JSON.stringify(snap.screenshotUrl ? [snap.screenshotUrl] : []),
            reproductionSteps: det.reproductionSteps,
            aiExplanation: det.aiExplanation,
            status: 'open'
          });
          await this.bugsRepository.save(bug);
          totalBugs++;
        }
      }

      // 4. Process SEO issues for all pages
      let totalSEOIssues = 0;
      for (const snap of snapshots) {
        if (snap.seoIssues && snap.seoIssues.length > 0) {
          console.log(`Processing SEO issues for page: ${snap.url}, found ${snap.seoIssues.length} issues`);
          await this.seoService.createBulk(run.id, project.id, snap.url, snap.seoIssues);
          totalSEOIssues += snap.seoIssues.length;
        }
      }

      // 5. Save generated Playwright test script file as an artifact
      if (generatedTestCode) {
        const specFilename = `runs/${run.id}/functional.spec.ts`;
        const testCodeUrl = await this.storageService.uploadFile(
          specFilename, 
          Buffer.from(generatedTestCode, 'utf8'), 
          'text/plain'
        );
        artifacts.testCodeUrl = testCodeUrl;
      }

      // 6. Complete the run metadata
      run.status = 'completed';
      run.completedAt = new Date();
      run.pagesVisited = snapshots.length;
      run.bugsFound = totalBugs;
      run.seoIssuesFound = totalSEOIssues;
      run.pagesDiscovered = JSON.stringify(snapshots.map((s) => s.url));
      run.generatedTestCode = generatedTestCode;
      
      const durationMs = run.completedAt!.getTime() - run.startedAt!.getTime();
      run.summary = JSON.stringify({
        totalPages: snapshots.length,
        totalBugs,
        totalSEOIssues,
        duration: durationMs,
        aiSummary: `Audit completed successfully. Discovered ${snapshots.length} page(s), found ${totalBugs} bugs, and ${totalSEOIssues} SEO issues.`
      });

      artifacts.screenshotUrls = snapshots.map((s) => s.screenshotUrl).filter(Boolean);
      artifacts.stepResults = stepResults;
      run.artifacts = JSON.stringify(artifacts);

      await this.runsRepository.save(run);
      console.log(`Run ${run.id} finished successfully. Bugs found: ${totalBugs}`);

    } catch (err) {
      console.error(`Run execution crash for ${run.id}:`, err);
      run.status = 'failed';
      run.completedAt = new Date();
      run.errorMessage = err instanceof Error ? err.message : String(err);
      await this.runsRepository.save(run).catch(console.error);
    }
  }

  async checkPlaywrightInstalled(): Promise<boolean> {
    // Try multiple detection strategies — executablePath() is unreliable with pnpm/workspace installs
    // Strategy 1: executablePath() + fs.existsSync
    try {
      const execPath = chromium.executablePath();
      if (execPath && fs.existsSync(execPath)) {
        return true;
      }
    } catch (_) {
      // executablePath() may throw if binaries not downloaded
    }

    // Strategy 2: Try actually launching chromium with a short timeout
    try {
      const browser = await chromium.launch({ headless: true, timeout: 8000 });
      await browser.close();
      return true;
    } catch (_) {
      return false;
    }
  }
}
