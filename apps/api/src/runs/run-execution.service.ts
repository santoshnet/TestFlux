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
    private configService: ConfigService
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

        snapshots.push({
          url: page.url(),
          domSnapshot,
          screenshotUrl: finalScreenshotUrl,
          consoleLogs,
          networkFailures,
          a11yIssues: []
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
            a11yIssues: snap.a11yIssues
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

      // 4. Save generated Playwright test script file as an artifact
      if (generatedTestCode) {
        const specFilename = `runs/${run.id}/functional.spec.ts`;
        const testCodeUrl = await this.storageService.uploadFile(
          specFilename, 
          Buffer.from(generatedTestCode, 'utf8'), 
          'text/plain'
        );
        artifacts.testCodeUrl = testCodeUrl;
      }

      // 5. Complete the run metadata
      run.status = 'completed';
      run.completedAt = new Date();
      run.pagesVisited = snapshots.length;
      run.bugsFound = totalBugs;
      run.pagesDiscovered = JSON.stringify(snapshots.map((s) => s.url));
      run.generatedTestCode = generatedTestCode;
      
      const durationMs = run.completedAt!.getTime() - run.startedAt!.getTime();
      run.summary = JSON.stringify({
        totalPages: snapshots.length,
        totalBugs,
        duration: durationMs,
        aiSummary: `Audit completed successfully. Discovered ${snapshots.length} page(s) and found ${totalBugs} bugs.`
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
