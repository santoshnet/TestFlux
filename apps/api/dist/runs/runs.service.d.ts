import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Run } from './run.entity';
import { RunExecutionService } from './run-execution.service';
export declare class RunsService implements OnApplicationBootstrap {
    private runsRepository;
    private runExecutionService;
    constructor(runsRepository: Repository<Run>, runExecutionService: RunExecutionService);
    onApplicationBootstrap(): Promise<void>;
    checkPlaywrightInstalled(): Promise<boolean>;
    findAllByProject(projectId: string): Promise<Run[]>;
    findOne(id: string): Promise<Run>;
    create(projectId: string, userSteps?: string[], browser?: string): Promise<Run>;
    remove(id: string): Promise<void>;
}
//# sourceMappingURL=runs.service.d.ts.map