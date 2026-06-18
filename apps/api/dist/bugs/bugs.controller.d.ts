import { BugsService } from './bugs.service';
import { Bug } from './bug.entity';
export declare class BugsController {
    private readonly bugsService;
    constructor(bugsService: BugsService);
    findAllByRun(runId: string): Promise<Bug[]>;
    findOne(bugId: string): Promise<Bug>;
    updateStatus(bugId: string, status: string): Promise<Bug>;
}
//# sourceMappingURL=bugs.controller.d.ts.map