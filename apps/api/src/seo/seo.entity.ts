import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('seo_issues')
export class SEOIssue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 36 })
  runId!: string;

  @Index()
  @Column({ length: 36 })
  projectId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  pageUrl!: string;

  @Column({ length: 24 })
  severity!: string; // 'critical' | 'high' | 'medium' | 'low'

  @Column({ length: 32 })
  category!: string; // 'title' | 'meta' | 'headings' | 'images' | 'links' | 'content' | 'performance' | 'mobile'

  @Column({ type: 'varchar', nullable: true })
  selector!: string | null;

  @Column({ length: 24, default: 'open' })
  status!: string; // 'open' | 'fixed' | 'ignored'

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
