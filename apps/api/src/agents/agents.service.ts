import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentTask } from './agent-task.entity';
import { ConfigService } from '@nestjs/config';
import { createAIProvider } from '@aia/ai-provider';
import { ProjectsService } from '../projects/projects.service';
import { RunsService } from '../runs/runs.service';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(AgentTask)
    private agentTasksRepository: Repository<AgentTask>,
    private configService: ConfigService,
    private projectsService: ProjectsService,
    private runsService: RunsService
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
    const lower = prompt.toLowerCase();
    
    // Determine the type of question and fetch relevant data
    let contextData: any = {};
    let assignedAgent = 'General Assistant';
    
    try {
      // Check if asking about projects
      if (lower.includes('project') && (lower.includes('how many') || lower.includes('count'))) {
        assignedAgent = 'Project Analyst';
        const projects = await this.projectsService.findAll();
        contextData = {
          type: 'project_count',
          totalProjects: projects.length,
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            url: p.url,
            status: p.status,
            createdAt: p.createdAt
          }))
        };
      }
      // Check if asking about project status
      else if (lower.includes('project') && (lower.includes('status') || lower.includes('state'))) {
        assignedAgent = 'Project Analyst';
        const projects = await this.projectsService.findAll();
        contextData = {
          type: 'project_status',
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'active').length,
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            url: p.url,
            status: p.status,
            createdAt: p.createdAt
          }))
        };
      }
      // Check if asking about last run
      else if (lower.includes('last run') || lower.includes('last test') || lower.includes('recent run') || lower.includes('latest run')) {
        assignedAgent = 'Run Analyst';
        const allRuns = await this.runsService.findAllByProject('all');
        
        if (allRuns.length === 0) {
          contextData = {
            type: 'last_run',
            hasRuns: false,
            message: 'No runs found in the database'
          };
        } else {
          const lastRun = allRuns[0];
          const project = await this.projectsService.findOne(lastRun.projectId);
          contextData = {
            type: 'last_run',
            hasRuns: true,
            run: {
              id: lastRun.id,
              status: lastRun.status,
              startedAt: lastRun.startedAt,
              completedAt: lastRun.completedAt,
              pagesVisited: lastRun.pagesVisited,
              bugsFound: lastRun.bugsFound,
              browser: lastRun.browser,
              summary: lastRun.summary ? JSON.parse(lastRun.summary) : null,
              errorMessage: lastRun.errorMessage
            },
            project: {
              id: project.id,
              name: project.name,
              url: project.url
            }
          };
        }
      }
      // Check if asking about runs for a specific project
      else if (lower.includes('run') || lower.includes('test') || lower.includes('execution')) {
        assignedAgent = 'Run Analyst';
        const projects = await this.projectsService.findAll();
        
        // Try to find which project the user is referring to
        let targetProject = null;
        for (const project of projects) {
          if (lower.includes(project.name.toLowerCase()) || lower.includes(project.id)) {
            targetProject = project;
            break;
          }
        }
        
        if (targetProject) {
          const runs = await this.runsService.findAllByProject(targetProject.id);
          contextData = {
            type: 'project_runs',
            projectId: targetProject.id,
            projectName: targetProject.name,
            projectUrl: targetProject.url,
            totalRuns: runs.length,
            completedRuns: runs.filter(r => r.status === 'completed').length,
            failedRuns: runs.filter(r => r.status === 'failed').length,
            runs: runs.slice(0, 5).map(r => ({
              id: r.id,
              status: r.status,
              startedAt: r.startedAt,
              completedAt: r.completedAt,
              pagesVisited: r.pagesVisited,
              bugsFound: r.bugsFound
            }))
          };
        } else {
          // Get all runs if no specific project mentioned
          const allRuns = await this.runsService.findAllByProject('all');
          contextData = {
            type: 'all_runs',
            totalRuns: allRuns.length,
            completedRuns: allRuns.filter(r => r.status === 'completed').length,
            failedRuns: allRuns.filter(r => r.status === 'failed').length,
            recentRuns: allRuns.slice(0, 5).map(r => ({
              id: r.id,
              status: r.status,
              startedAt: r.startedAt,
              completedAt: r.completedAt,
              pagesVisited: r.pagesVisited,
              bugsFound: r.bugsFound
            }))
          };
        }
      }
      // Default: general question about projects/runs
      else if (lower.includes('project') || lower.includes('run') || lower.includes('test')) {
        assignedAgent = 'General Analyst';
        const projects = await this.projectsService.findAll();
        const allRuns = await this.runsService.findAllByProject('all');
        
        contextData = {
          type: 'general',
          projects: {
            total: projects.length,
            active: projects.filter(p => p.status === 'active').length
          },
          runs: {
            total: allRuns.length,
            completed: allRuns.filter(r => r.status === 'completed').length,
            failed: allRuns.filter(r => r.status === 'failed').length
          }
        };
      }
      
      // Traditional agent routing for non-database questions
      else if (lower.includes('research') || lower.includes('find') || lower.includes('search')) {
        assignedAgent = 'Codebase Researcher';
      } else if (lower.includes('debug') || lower.includes('error') || lower.includes('fail')) {
        assignedAgent = 'Failure Debugger';
      } else {
        assignedAgent = 'Playwright Automator';
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
          // If we have context data from the database, include it in the AI prompt
          let enhancedPrompt = prompt;
          if (Object.keys(contextData).length > 0) {
            enhancedPrompt = `User Question: ${prompt}\n\nDatabase Context:\n${JSON.stringify(contextData, null, 2)}\n\nPlease answer the user's question based on the database context provided above. If there is no relevant data, let them know politely.`;
          }
          
          responseContent = await ai.chat(enhancedPrompt, `Agent: ${assignedAgent}`);
        } else {
          // Fallback response without API key
          if (Object.keys(contextData).length > 0) {
            responseContent = this.generateContextualResponse(contextData, prompt);
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
      
    } catch (err) {
      // Handle database query errors
      const task = this.agentTasksRepository.create({
        prompt,
        details: details ? JSON.stringify(details) : null,
        assignedAgent,
        status: 'failed',
        messages: JSON.stringify([
          { role: 'user', content: prompt },
          { role: 'error', content: `Database query failed: ${err instanceof Error ? err.message : String(err)}` }
        ]),
      });
      return this.agentTasksRepository.save(task);
    }
  }

  private generateContextualResponse(contextData: any, originalPrompt: string): string {
    // Generate a simple response based on context data when no API key is available
    switch (contextData.type) {
      case 'project_count':
        return `You have ${contextData.totalProjects} project(s) in total.\n\nProjects:\n${contextData.projects.map((p: any) => `- ${p.name} (${p.url})`).join('\n')}`;
      case 'project_status':
        return `Project Status Overview:\n- Total Projects: ${contextData.totalProjects}\n- Active Projects: ${contextData.activeProjects}\n\nProjects:\n${contextData.projects.map((p: any) => `- ${p.name}: ${p.status}`).join('\n')}`;
      case 'last_run':
        if (!contextData.hasRuns) {
          return 'You have no runs in the database yet. Start a test run to see results here.';
        }
        const run = contextData.run;
        return `Last Run Summary:\n- Project: ${contextData.project.name}\n- Status: ${run.status}\n- Started: ${run.startedAt}\n- Completed: ${run.completedAt || 'In progress'}\n- Pages Visited: ${run.pagesVisited}\n- Bugs Found: ${run.bugsFound}\n- Browser: ${run.browser}`;
      case 'project_runs':
        return `Runs for ${contextData.projectName}:\n- Total Runs: ${contextData.totalRuns}\n- Completed: ${contextData.completedRuns}\n- Failed: ${contextData.failedRuns}\n\nRecent Runs:\n${contextData.runs.map((r: any) => `- ${r.id}: ${r.status}`).join('\n')}`;
      case 'all_runs':
        return `All Runs Overview:\n- Total Runs: ${contextData.totalRuns}\n- Completed: ${contextData.completedRuns}\n- Failed: ${contextData.failedRuns}\n\nRecent Runs:\n${contextData.recentRuns.map((r: any) => `- ${r.id}: ${r.status}`).join('\n')}`;
      case 'general':
        return `Overview:\n- Projects: ${contextData.projects.total} total, ${contextData.projects.active} active\n- Runs: ${contextData.runs.total} total, ${contextData.runs.completed} completed, ${contextData.runs.failed} failed`;
      default:
        return `[Mock Response] You asked: "${originalPrompt}"\n\nI found some data but need an AI API key to provide a detailed response. Please configure your GROQ_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.`;
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
