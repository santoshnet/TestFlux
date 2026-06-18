import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTask } from './agent-task.entity';
import { ConfigService } from '@nestjs/config';
import { createAIProvider } from '@aia/ai-provider';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(AgentTask)
    private agentTasksRepository: Repository<AgentTask>,
    private configService: ConfigService
  ) {}

  getAvailableAgents(): any[] {
    return [
      { id: 'researcher', name: 'Codebase Researcher', description: 'Audits existing repositories, files and dependencies.' },
      { id: 'automator', name: 'Playwright Automator', description: 'Generates and customizes end-to-end automation scripts.' },
      { id: 'debugger', name: 'Failure Debugger', description: 'Analyzes trace files, logs and screenshots to pinpoint root causes.' }
    ];
  }

  async getTasks(): Promise<AgentTask[]> {
    return this.agentTasksRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getTask(id: string): Promise<AgentTask> {
    const task = await this.agentTasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Agent task with ID ${id} not found`);
    }
    return task;
  }

  async chat(prompt: string, details?: any): Promise<AgentTask> {
    // Determine target agent
    let assignedAgent = 'Playwright Automator';
    const lower = prompt.toLowerCase();
    if (lower.includes('research') || lower.includes('find') || lower.includes('search')) {
      assignedAgent = 'Codebase Researcher';
    } else if (lower.includes('debug') || lower.includes('error') || lower.includes('fail')) {
      assignedAgent = 'Failure Debugger';
    }

    const providerName = this.configService.get<string>('AI_PROVIDER') || 'claude';
    const apiKey = providerName === 'openai'
      ? this.configService.get<string>('OPENAI_API_KEY')
      : providerName === 'groq'
      ? this.configService.get<string>('GROQ_API_KEY')
      : this.configService.get<string>('ANTHROPIC_API_KEY');

    const ai = createAIProvider({ provider: providerName as 'claude' | 'openai' | 'groq', apiKey });
    
    // Create entity in running status
    const task = this.agentTasksRepository.create({
      prompt,
      details: details ? JSON.stringify(details) : null,
      assignedAgent,
      status: 'running',
      messages: JSON.stringify([{ role: 'user', content: prompt }]),
    });
    
    const savedTask = await this.agentTasksRepository.save(task);
    const start = Date.now();

    try {
      let responseContent = '';

      if (apiKey) {
        // Use the new chat method for proper AI interaction
        responseContent = await ai.chat(prompt, `Agent: ${assignedAgent}`);
      } else {
        responseContent = `[Mock Agent Response - No API Key]
I am the **${assignedAgent}**. You asked: "${prompt}".

Here are the recommended steps for your task:
1. Initialize the Playwright context: \`const browser = await chromium.launch();\`
2. Navigate to your target URL.
3. Utilize role selectors (e.g. \`page.getByRole('button', { name: 'Submit' })\`) rather than CSS paths.
4. Execute assertions to check elements are visible.

Let me know if you would like me to generate a complete spec file!`;
      }

      const durationMs = Date.now() - start;

      savedTask.status = 'completed';
      savedTask.messages = JSON.stringify([
        { role: 'user', content: prompt },
        { role: 'assistant', content: responseContent }
      ]);
      savedTask.suggestedActions = JSON.stringify([
        { title: 'Create Project', action: 'CREATE_PROJECT' },
        { title: 'Export Playwright Config', action: 'EXPORT_CONFIG' }
      ]);
      savedTask.analytics = JSON.stringify({
        duration: durationMs,
        provider: providerName,
        tokensUsed: 420,
        estimatedCost: 0.003
      });
      savedTask.result = JSON.stringify({ text: responseContent });

      return this.agentTasksRepository.save(savedTask);

    } catch (err) {
      savedTask.status = 'failed';
      savedTask.messages = JSON.stringify([
        { role: 'user', content: prompt },
        { role: 'error', content: err instanceof Error ? err.message : String(err) }
      ]);
      return this.agentTasksRepository.save(savedTask);
    }
  }

  async getAnalytics(): Promise<any> {
    const tasks = await this.agentTasksRepository.find();
    const totalRuns = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    
    // Calculate routing metrics
    const routing: Record<string, number> = {};
    for (const t of tasks) {
      routing[t.assignedAgent] = (routing[t.assignedAgent] || 0) + 1;
    }

    return {
      totalTasks: totalRuns,
      successRate: totalRuns > 0 ? (completed / totalRuns) * 100 : 0,
      routingSplits: Object.entries(routing).map(([agent, count]) => ({ agent, count })),
      averageDurationMs: totalRuns > 0 
        ? tasks.reduce((acc, curr) => {
            try {
              const meta = JSON.parse(curr.analytics || '{}');
              return acc + (meta.duration || 0);
            } catch {
              return acc;
            }
          }, 0) / totalRuns
        : 0
    };
  }
}
