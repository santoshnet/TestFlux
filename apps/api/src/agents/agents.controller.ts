import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentTask } from './agent-task.entity';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  getAvailableAgents(): any[] {
    return this.agentsService.getAvailableAgents();
  }

  @Get('tasks')
  async getTasks(): Promise<AgentTask[]> {
    return this.agentsService.getTasks();
  }

  @Get('analytics')
  async getAnalytics(): Promise<any> {
    return this.agentsService.getAnalytics();
  }

  @Get('tasks/:id')
  async getTask(@Param('id') id: string): Promise<AgentTask> {
    return this.agentsService.getTask(id);
  }

  @Post('chat')
  async chat(
    @Body('prompt') prompt: string,
    @Body('details') details?: any
  ): Promise<AgentTask> {
    return this.agentsService.chat(prompt, details);
  }
}
