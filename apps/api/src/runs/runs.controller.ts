import { Controller, Get, Post, Param, Body, Delete } from '@nestjs/common';
import { RunsService } from './runs.service';
import { Run } from './run.entity';

@Controller()
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Get('system/status')
  async getSystemStatus(): Promise<{ playwrightInstalled: boolean }> {
    const playwrightInstalled = await this.runsService.checkPlaywrightInstalled();
    return { playwrightInstalled };
  }

  @Get('projects/:projectId/runs')
  async findAllByProject(@Param('projectId') projectId: string): Promise<Run[]> {
    return this.runsService.findAllByProject(projectId);
  }

  @Post('projects/:projectId/runs')
  async create(
    @Param('projectId') projectId: string,
    @Body('userSteps') userSteps?: string[],
    @Body('browser') browser?: string
  ): Promise<Run> {
    return this.runsService.create(projectId, userSteps, browser);
  }

  @Get('runs/:runId')
  async findOne(@Param('runId') runId: string): Promise<Run> {
    return this.runsService.findOne(runId);
  }

  @Delete('runs/:runId')
  async remove(@Param('runId') runId: string): Promise<{ success: boolean }> {
    await this.runsService.remove(runId);
    return { success: true };
  }
}
