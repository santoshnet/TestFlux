import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SEOIssue as SEOEntity } from './seo.entity';

@Injectable()
export class SEOService {
  constructor(
    @InjectRepository(SEOEntity)
    private seoRepository: Repository<SEOEntity>
  ) {}

  async findAllByRun(runId: string): Promise<SEOEntity[]> {
    return this.seoRepository.find({
      where: { runId },
      order: { severity: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SEOEntity> {
    const issue = await this.seoRepository.findOne({ where: { id } });
    if (!issue) {
      throw new NotFoundException(`SEO issue with ID ${id} not found`);
    }
    return issue;
  }

  async updateStatus(id: string, status: string): Promise<SEOEntity> {
    const issue = await this.findOne(id);
    issue.status = status;
    return this.seoRepository.save(issue);
  }

  async createBulk(runId: string, projectId: string, pageUrl: string, issues: any[]): Promise<void> {
    for (const issue of issues) {
      const seoIssue = this.seoRepository.create({
        runId,
        projectId,
        title: issue.title,
        description: issue.description,
        pageUrl,
        severity: issue.severity,
        category: issue.category,
        selector: issue.selector || null,
      });
      await this.seoRepository.save(seoIssue);
    }
  }

  async deleteByRun(runId: string): Promise<void> {
    await this.seoRepository.delete({ runId });
  }
}
