import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bugs')
export class Bug {
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
  category!: string; // 'accessibility' | 'js-error' | 'layout' | 'functional'

  @Column({ type: 'text' })
  screenshotUrls!: string; // JSON string of screenshot URLs

  @Column({ type: 'varchar', nullable: true })
  videoUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  evidence!: string | null; // JSON string of other details (logs, network fails)

  @Column({ type: 'text', nullable: true })
  reproductionSteps!: string | null;

  @Column({ type: 'text', nullable: true })
  aiExplanation!: string | null;

  @Column({ length: 24, default: 'open' })
  status!: string; // 'open' | 'confirmed' | 'wontfix' | 'resolved'

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
