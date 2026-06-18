import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('agent_tasks')
export class AgentTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'varchar', nullable: true })
  repoUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetRef!: string | null;

  @Column({ type: 'text', nullable: true })
  details!: string | null; // JSON string

  @Column({ length: 64 })
  assignedAgent!: string;

  @Column({ length: 24, default: 'completed' })
  status!: string; // 'queued' | 'running' | 'completed' | 'failed'

  @Column({ type: 'text', nullable: true })
  messages!: string | null; // JSON string of message logs

  @Column({ type: 'text', nullable: true })
  suggestedActions!: string | null; // JSON string of suggested actions

  @Column({ type: 'text', nullable: true })
  analytics!: string | null; // JSON string of token usage/cost/duration

  @Column({ type: 'text', nullable: true })
  result!: string | null; // JSON string of outputs

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
