import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('github_connections')
export class GitHubConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  sessionId!: string;

  @Column()
  githubId!: string;

  @Column()
  login!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  htmlUrl!: string | null;

  @Column({ type: 'text' })
  accessToken!: string;

  @Column({ type: 'varchar', nullable: true })
  scope!: string | null;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  connectedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
