import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  url!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  credentials!: string | null; // JSON string containing credentials

  @Column({ length: 24, default: 'active' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  tags!: string | null; // JSON string of tags

  @Column({ type: 'int', default: 3 })
  maxDepth!: number;

  @Column({ type: 'int', default: 50 })
  maxPages!: number;

  @Column({ length: 24, default: 'claude' })
  aiProvider!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
