import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../modules/orders/entities/order.entity';

export interface EventEnvelope {
  id: string;
  type: string;
  source: string;
  tenantId: string;
  time: string;
  schemaVersion: string;
  traceId?: string;
  data: Record<string, any>;
}

@Injectable()
export class EventPublisherService {

    async publishOrderEvent(order: Order, orderType: string): Promise<void> {
    const event: EventEnvelope = {
      id: uuidv4(),
      type: orderType,
      source: "orders-service",
      tenantId: order.tenantId,
      time: new Date().toISOString(),
      schemaVersion: "1",
      data: {
        id: order.id,
        tenantId: order.tenantId,
        status: order.status,
        version: order.version,
        totalCents: order.totalCents,
        closedAt: order.updatedAt,
      },
    };

    await this.publish(event);
  }

  private async publish(event: EventEnvelope): Promise<void> {
    
    // Simulating event.
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Event ${event.type} published successfully`);
        resolve();
      }, 100);
    });
  }
}