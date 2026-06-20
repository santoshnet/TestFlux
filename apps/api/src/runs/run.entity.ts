import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('runs')
export class Run {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 36 })
  projectId!: string;

  @Column({ length: 24, default: 'queued' })
  status!: string; // 'queued' | 'running' | 'completed' | 'failed'

  @Column({ type: 'datetime', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  pagesVisited!: number;

  @Column({ type: 'int', default: 0 })
  bugsFound!: number;

  @Column({ type: 'int', default: 0 })
  seoIssuesFound!: number;

  @Column({ type: 'text', nullable: true })
  pagesDiscovered!: string | null; // JSON string of discovered URLs

  @Column({ type: 'text', nullable: true })
  userSteps!: string | null; // JSON string of user steps for targeted runs

  @Column({ type: 'text', nullable: true })
  generatedTestCode!: string | null; // generated spec.ts code

  @Column({ type: 'text', nullable: true })
  summary!: string | null; // JSON string of summary statistics (duration, details)

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'text', nullable: true })
  artifacts!: string | null; // JSON string of screenshots/testCodeUrl

  @Column({ length: 32, default: 'chromium' })
  browser!: string; // 'chromium' | 'firefox' | 'webkit'

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
