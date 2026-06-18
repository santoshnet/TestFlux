import { RunsService } from './runs.service';
import { Run } from './run.entity';
export declare class RunsController {
    private readonly runsService;
    constructor(runsService: RunsService);
    getSystemStatus(): Promise<{
        playwrightInstalled: boolean;
    }>;
    findAllByProject(projectId: string): Promise<Run[]>;
    create(projectId: string, userSteps?: string[], browser?: string): Promise<Run>;
    findOne(runId: string): Promise<Run>;
    remove(runId: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=runs.controller.d.ts.map