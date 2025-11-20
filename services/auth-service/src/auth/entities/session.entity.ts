import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
@Index('idx_sessions_user_id', ['user_id'])
@Index('idx_sessions_refresh_token', ['refresh_token_hash'])
@Index('idx_sessions_expires_at', ['expires_at'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  user_id: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 255,
  })
  refresh_token_hash: string;

  @Column({
    type: 'timestamp with time zone',
  })
  expires_at: Date;

  @Column({
    type: 'inet',
    nullable: true,
  })
  ip_address: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  user_agent: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  is_revoked: boolean;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
  })
  revoked_at: Date | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
  })
  updated_at: Date;
}
