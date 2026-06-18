import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bug } from './bug.entity';

@Injectable()
export class BugsService {
  constructor(
    @InjectRepository(Bug)
    private bugsRepository: Repository<Bug>
  ) {}

  async findAllByRun(runId: string): Promise<Bug[]> {
    return this.bugsRepository.find({
      where: { runId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Bug> {
    const bug = await this.bugsRepository.findOne({ where: { id } });
    if (!bug) {
      throw new NotFoundException(`Bug with ID ${id} not found`);
    }
    return bug;
  }

  async updateStatus(id: string, status: string): Promise<Bug> {
    const bug = await this.findOne(id);
    bug.status = status;
    return this.bugsRepository.save(bug);
  }
}
