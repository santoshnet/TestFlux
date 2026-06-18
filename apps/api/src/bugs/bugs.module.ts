import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bug } from './bug.entity';
import { BugsService } from './bugs.service';
import { BugsController } from './bugs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Bug])],
  providers: [BugsService],
  controllers: [BugsController],
  exports: [BugsService],
})
export class BugsModule {}
