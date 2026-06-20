import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('github_repositories')
export class GitHubRepository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  sessionId!: string;

  @Column()
  githubRepoId!: string;

  @Column()
  name!: string;

  @Column()
  fullName!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true })
  language!: string | null;

  @Column({ default: false })
  private!: boolean;

  @Column({ default: false })
  fork!: boolean;

  @Column({ type: 'int', default: 0 })
  stars!: number;

  @Column({ type: 'int', default: 0 })
  forks!: number;

  @Column({ type: 'int', default: 0 })
  openIssues!: number;

  @Column({ type: 'varchar', nullable: true })
  htmlUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  cloneUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  scanResults!: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastScannedAt!: Date | null;

  @Column({ default: false })
  isScanning!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}