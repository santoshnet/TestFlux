import { Repository } from 'typeorm';
import { Bug } from './bug.entity';
export declare class BugsService {
    private bugsRepository;
    constructor(bugsRepository: Repository<Bug>);
    findAllByRun(runId: string): Promise<Bug[]>;
    findOne(id: string): Promise<Bug>;
    updateStatus(id: string, status: string): Promise<Bug>;
}
//# sourceMappingURL=bugs.service.d.ts.map