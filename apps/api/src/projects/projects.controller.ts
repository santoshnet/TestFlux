import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './project.entity';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(): Promise<Project[]> {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  @Post()
  async create(@Body() projectData: Partial<Project>): Promise<Project> {
    return this.projectsService.create(projectData);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<Project>): Promise<Project> {
    return this.projectsService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.projectsService.remove(id);
    return { success: true };
  }
}
