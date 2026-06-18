import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>
  ) {}

  async findAll(): Promise<Project[]> {
    return this.projectsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async create(projectData: any): Promise<Project> {
    const project = this.projectsRepository.create({
      ...projectData,
      credentials: projectData.credentials ? (typeof projectData.credentials === 'string' ? projectData.credentials : JSON.stringify(projectData.credentials)) : null,
      tags: projectData.tags ? (typeof projectData.tags === 'string' ? projectData.tags : JSON.stringify(projectData.tags)) : JSON.stringify([]),
    } as any) as any;
    return this.projectsRepository.save(project);
  }

  async update(id: string, updateData: any): Promise<Project> {
    const project = await this.findOne(id);
    
    if (updateData.credentials !== undefined) {
      project.credentials = updateData.credentials ? (typeof updateData.credentials === 'string' ? updateData.credentials : JSON.stringify(updateData.credentials)) : null;
    }
    if (updateData.tags !== undefined) {
      project.tags = updateData.tags ? (typeof updateData.tags === 'string' ? updateData.tags : JSON.stringify(updateData.tags)) : JSON.stringify([]);
    }

    Object.assign(project, {
      ...updateData,
      credentials: project.credentials,
      tags: project.tags,
    });

    return this.projectsRepository.save(project);
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }
}
