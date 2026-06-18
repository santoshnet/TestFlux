import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Run } from './run.entity';
import { RunExecutionService } from './run-execution.service';

@Injectable()
export class RunsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Run)
    private runsRepository: Repository<Run>,
    private runExecutionService: RunExecutionService
  ) {}

  async onApplicationBootstrap() {
    try {
      const stuckRuns = await this.runsRepository.find({
        where: [
          { status: 'running' },
          { status: 'queued' }
        ]
      });
      for (const run of stuckRuns) {
        run.status = 'failed';
        run.errorMessage = 'Execution was interrupted due to a server restart.';
        run.completedAt = new Date();
        await this.runsRepository.save(run);
      }
      if (stuckRuns.length > 0) {
        console.log(`Cleaned up ${stuckRuns.length} stuck runs from previous session.`);
      }
    } catch (err) {
      console.error('Failed to clean up stuck runs:', err);
    }
  }

  async checkPlaywrightInstalled(): Promise<boolean> {
    return this.runExecutionService.checkPlaywrightInstalled();
  }

  async findAllByProject(projectId: string): Promise<Run[]> {
    return this.runsRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Run> {
    const run = await this.runsRepository.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException(`Run with ID ${id} not found`);
    }
    return run;
  }

  async create(projectId: string, userSteps?: string[], browser?: string): Promise<Run> {
    const isInstalled = await this.checkPlaywrightInstalled();
    if (!isInstalled) {
      throw new BadRequestException(
        'Playwright browser (Chromium) is not installed on the server. ' +
        'Please run "pnpm exec playwright install chromium" or "npx playwright install chromium" in the server environment.'
      );
    }

    const run: Run = this.runsRepository.create({
      projectId,
      status: 'queued',
      browser: browser || 'chromium',
      userSteps: userSteps ? JSON.stringify(userSteps) : null,
      pagesDiscovered: JSON.stringify([]),
    });

    const savedRun = await this.runsRepository.save(run);
    
    // Trigger run execution asynchronously (zero-config local background execution)
    this.runExecutionService.triggerRun(savedRun.id).catch((err) => {
      console.error(`Failed to trigger background run execution:`, err);
    });

    return savedRun;
  }

  async remove(id: string): Promise<void> {
    const result = await this.runsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Run with ID ${id} not found`);
    }
  }
}
