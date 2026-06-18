"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const run_entity_1 = require("./run.entity");
const run_execution_service_1 = require("./run-execution.service");
let RunsService = class RunsService {
    runsRepository;
    runExecutionService;
    constructor(runsRepository, runExecutionService) {
        this.runsRepository = runsRepository;
        this.runExecutionService = runExecutionService;
    }
    async onApplicationBootstrap() {
        try {
            const stuckRuns = await this.runsRepository.find({
                where: [
                    { status: 'running' },
                    { status: 'queued' }
                ]
            });
            for (const run of stuckRuns) {
                run.status = 'failed';
                run.errorMessage = 'Execution was interrupted due to a server restart.';
                run.completedAt = new Date();
                await this.runsRepository.save(run);
            }
            if (stuckRuns.length > 0) {
                console.log(`Cleaned up ${stuckRuns.length} stuck runs from previous session.`);
            }
        }
        catch (err) {
            console.error('Failed to clean up stuck runs:', err);
        }
    }
    async checkPlaywrightInstalled() {
        return this.runExecutionService.checkPlaywrightInstalled();
    }
    async findAllByProject(projectId) {
        return this.runsRepository.find({
            where: { projectId },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const run = await this.runsRepository.findOne({ where: { id } });
        if (!run) {
            throw new common_1.NotFoundException(`Run with ID ${id} not found`);
        }
        return run;
    }
    async create(projectId, userSteps, browser) {
        const isInstalled = await this.checkPlaywrightInstalled();
        if (!isInstalled) {
            throw new common_1.BadRequestException('Playwright browser (Chromium) is not installed on the server. ' +
                'Please run "pnpm exec playwright install chromium" or "npx playwright install chromium" in the server environment.');
        }
        const run = this.runsRepository.create({
            projectId,
            status: 'queued',
            browser: browser || 'chromium',
            userSteps: userSteps ? JSON.stringify(userSteps) : null,
            pagesDiscovered: JSON.stringify([]),
        });
        const savedRun = await this.runsRepository.save(run);
        // Trigger run execution asynchronously (zero-config local background execution)
        this.runExecutionService.triggerRun(savedRun.id).catch((err) => {
            console.error(`Failed to trigger background run execution:`, err);
        });
        return savedRun;
    }
    async remove(id) {
        const result = await this.runsRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Run with ID ${id} not found`);
        }
    }
};
exports.RunsService = RunsService;
exports.RunsService = RunsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(run_entity_1.Run)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        run_execution_service_1.RunExecutionService])
], RunsService);
//# sourceMappingURL=runs.service.js.map