import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { BugsService } from './bugs.service';
import { Bug } from './bug.entity';

@Controller()
export class BugsController {
  constructor(private readonly bugsService: BugsService) {}

  @Get('runs/:runId/bugs')
  async findAllByRun(@Param('runId') runId: string): Promise<Bug[]> {
    return this.bugsService.findAllByRun(runId);
  }

  @Get('bugs/:bugId')
  async findOne(@Param('bugId') bugId: string): Promise<Bug> {
    return this.bugsService.findOne(bugId);
  }

  @Patch('bugs/:bugId')
  async updateStatus(
    @Param('bugId') bugId: string,
    @Body('status') status: string
  ): Promise<Bug> {
    return this.bugsService.updateStatus(bugId, status);
  }
}
