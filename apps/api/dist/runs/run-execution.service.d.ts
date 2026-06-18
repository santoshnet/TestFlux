import { Repository } from 'typeorm';
import { Run } from './run.entity';
import { Project } from '../projects/project.entity';
import { Bug } from '../bugs/bug.entity';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
export declare class RunExecutionService {
    private runsRepository;
    private projectsRepository;
    private bugsRepository;
    private storageService;
    private configService;
    constructor(runsRepository: Repository<Run>, projectsRepository: Repository<Project>, bugsRepository: Repository<Bug>, storageService: StorageService, configService: ConfigService);
    triggerRun(runId: string): Promise<void>;
    private executeRunBackground;
    checkPlaywrightInstalled(): Promise<boolean>;
}
//# sourceMappingURL=run-execution.service.d.ts.map