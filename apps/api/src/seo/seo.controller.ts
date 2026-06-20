import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { SEOService } from './seo.service';
import { SEOIssue as SEOEntity } from './seo.entity';

@Controller()
export class SEOController {
  constructor(private readonly seoService: SEOService) {}

  @Get('runs/:runId/seo')
  async findAllByRun(@Param('runId') runId: string): Promise<SEOEntity[]> {
    return this.seoService.findAllByRun(runId);
  }

  @Get('seo/:seoId')
  async findOne(@Param('seoId') seoId: string): Promise<SEOEntity> {
    return this.seoService.findOne(seoId);
  }

  @Patch('seo/:seoId')
  async updateStatus(
    @Param('seoId') seoId: string,
    @Body('status') status: string
  ): Promise<SEOEntity> {
    return this.seoService.updateStatus(seoId, status);
  }
}
