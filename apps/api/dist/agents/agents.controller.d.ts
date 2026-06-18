import { AgentsService } from './agents.service';
import { AgentTask } from './agent-task.entity';
export declare class AgentsController {
    private readonly agentsService;
    constructor(agentsService: AgentsService);
    getAvailableAgents(): any[];
    getTasks(): Promise<AgentTask[]>;
    getAnalytics(): Promise<any>;
    getTask(id: string): Promise<AgentTask>;
    chat(prompt: string, details?: any): Promise<AgentTask>;
}
//# sourceMappingURL=agents.controller.d.ts.map