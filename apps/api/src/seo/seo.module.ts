import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SEOController } from './seo.controller';
import { SEOService } from './seo.service';
import { SEOIssue as SEOEntity } from './seo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SEOEntity])],
  controllers: [SEOController],
  providers: [SEOService],
  exports: [SEOService],
})
export class SEOModule {}
