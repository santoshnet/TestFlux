import { Repository } from 'typeorm';
import { AgentTask } from './agent-task.entity';
import { ConfigService } from '@nestjs/config';
export declare class AgentsService {
    private agentTasksRepository;
    private configService;
    constructor(agentTasksRepository: Repository<AgentTask>, configService: ConfigService);
    getAvailableAgents(): any[];
    getTasks(): Promise<AgentTask[]>;
    getTask(id: string): Promise<AgentTask>;
    chat(prompt: string, details?: any): Promise<AgentTask>;
    getAnalytics(): Promise<any>;
}
//# sourceMappingURL=agents.service.d.ts.map