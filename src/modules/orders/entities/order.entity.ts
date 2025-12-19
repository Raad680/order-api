import { BadRequestException } from '@nestjs/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CLOSED = 'closed',
}

@Entity('orders')
export class Order {

  @PrimaryGeneratedColumn('uuid')
  id: string;


  @Column({ name: 'tenant_id', type: 'text' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'total_cents', type: 'int', nullable: true })
  totalCents: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Helper method for optimistic locking
  checkOrderVersion(expectedVersion: number): boolean {
    return this.version === expectedVersion;
  }

  // Business logic methods
  confirmOrderStatus(totalCents: number): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Order can only be confirmed from draft status');
    }
    this.status = OrderStatus.CONFIRMED;
    this.totalCents = totalCents;
    this.version += 1;
  }

  closeOrder(): void {
    if (this.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order can only be closed from confirmed status');
    }
    this.status = OrderStatus.CLOSED;
    this.version += 1;
  }
}