import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('outbox')
export class Outbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}