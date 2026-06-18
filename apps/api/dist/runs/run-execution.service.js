"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunExecutionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const run_entity_1 = require("./run.entity");
const project_entity_1 = require("../projects/project.entity");
const bug_entity_1 = require("../bugs/bug.entity");
const storage_service_1 = require("../storage/storage.service");
const config_1 = require("@nestjs/config");
const ai_provider_1 = require("@aia/ai-provider");
const playwright_agent_1 = require("@aia/playwright-agent");
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
let RunExecutionService = class RunExecutionService {
    runsRepository;
    projectsRepository;
    bugsRepository;
    storageService;
    configService;
    constructor(runsRepository, projectsRepository, bugsRepository, storageService, configService) {
        this.runsRepository = runsRepository;
        this.projectsRepository = projectsRepository;
        this.bugsRepository = bugsRepository;
        this.storageService = storageService;
        this.configService = configService;
    }
    async triggerRun(runId) {
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
    async executeRunBackground(run, project) {
        const aiProviderName = project.aiProvider || this.configService.get('AI_PROVIDER') || 'claude';
        const apiKey = aiProviderName === 'openai'
            ? this.configService.get('OPENAI_API_KEY')
            : aiProviderName === 'groq'
                ? this.configService.get('GROQ_API_KEY')
                : this.configService.get('ANTHROPIC_API_KEY');
        const aiProvider = (0, ai_provider_1.createAIProvider)({
            provider: aiProviderName,
            apiKey
        });
        const parsedSteps = run.userSteps ? JSON.parse(run.userSteps) : null;
        const snapshots = [];
        const stepResults = [];
        let generatedTestCode = null;
        let artifacts = {};
        // Resolve the browser type from run.browser field (defaults to chromium)
        const browserTypeMap = { chromium: playwright_1.chromium, firefox: playwright_1.firefox, webkit: playwright_1.webkit };
        const browserType = browserTypeMap[run.browser] || playwright_1.chromium;
        // PLAYWRIGHT_HEADLESS=false → headed (visible window); anything else → headless
        const headlessEnv = this.configService.get('PLAYWRIGHT_HEADLESS');
        const isHeadless = headlessEnv !== 'false';
        console.log(`[Run ${run.id}] browser=${run.browser} headless=${isHeadless} (PLAYWRIGHT_HEADLESS="${headlessEnv}")`);
        try {
            if (parsedSteps && Array.isArray(parsedSteps) && parsedSteps.length > 0) {
                // Targeted step execution flow
                console.log(`Running targeted steps for run ${run.id} on url: ${project.url} using ${run.browser}`);
                const browser = await browserType.launch({ headless: isHeadless });
                const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
                const page = await context.newPage();
                const runner = new playwright_agent_1.ActionsRunner(page, project.url);
                const analyzer = new playwright_agent_1.Analyzer();
                let consoleLogs = [];
                let networkFailures = [];
                page.on('console', (msg) => { if (msg.type() === 'error')
                    consoleLogs.push(msg.text()); });
                page.on('pageerror', (err) => { consoleLogs.push(`Uncaught Exception: ${err.message}`); });
                page.on('response', (res) => { if (res.status() >= 400)
                    networkFailures.push(`HTTP Response ${res.status()}: ${res.url()}`); });
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
                const reporter = new playwright_agent_1.Reporter();
                generatedTestCode = reporter.generatePlaywrightTest(project.url, parsedSteps);
                // Eagerly persist stepResults so the run details page can show them
                // even if the subsequent AI analysis step crashes or times out
                artifacts.stepResults = stepResults;
                run.artifacts = JSON.stringify(artifacts);
                await this.runsRepository.save(run);
            }
            else {
                // General BFS Site Crawl flow
                console.log(`Running site crawl for run ${run.id} on seed: ${project.url} using ${run.browser}`);
                const crawler = new playwright_agent_1.Crawler();
                const crawlResult = await crawler.crawl({
                    url: project.url,
                    maxDepth: project.maxDepth,
                    maxPages: project.maxPages,
                    headless: isHeadless,
                    browserType: (run.browser || 'chromium'),
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
            const analyzer = new playwright_agent_1.Analyzer();
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
                const testCodeUrl = await this.storageService.uploadFile(specFilename, Buffer.from(generatedTestCode, 'utf8'), 'text/plain');
                artifacts.testCodeUrl = testCodeUrl;
            }
            // 5. Complete the run metadata
            run.status = 'completed';
            run.completedAt = new Date();
            run.pagesVisited = snapshots.length;
            run.bugsFound = totalBugs;
            run.pagesDiscovered = JSON.stringify(snapshots.map((s) => s.url));
            run.generatedTestCode = generatedTestCode;
            const durationMs = run.completedAt.getTime() - run.startedAt.getTime();
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
        }
        catch (err) {
            console.error(`Run execution crash for ${run.id}:`, err);
            run.status = 'failed';
            run.completedAt = new Date();
            run.errorMessage = err instanceof Error ? err.message : String(err);
            await this.runsRepository.save(run).catch(console.error);
        }
    }
    async checkPlaywrightInstalled() {
        // Try multiple detection strategies — executablePath() is unreliable with pnpm/workspace installs
        // Strategy 1: executablePath() + fs.existsSync
        try {
            const execPath = playwright_1.chromium.executablePath();
            if (execPath && fs.existsSync(execPath)) {
                return true;
            }
        }
        catch (_) {
            // executablePath() may throw if binaries not downloaded
        }
        // Strategy 2: Try actually launching chromium with a short timeout
        try {
            const browser = await playwright_1.chromium.launch({ headless: true, timeout: 8000 });
            await browser.close();
            return true;
        }
        catch (_) {
            return false;
        }
    }
};
exports.RunExecutionService = RunExecutionService;
exports.RunExecutionService = RunExecutionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(run_entity_1.Run)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(2, (0, typeorm_1.InjectRepository)(bug_entity_1.Bug)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        storage_service_1.StorageService,
        config_1.ConfigService])
], RunExecutionService);
//# sourceMappingURL=run-execution.service.js.map