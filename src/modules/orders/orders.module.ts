import { Module } from '@nestjs/common';
import { OrdersService } from './services/orders.service';
import { OrdersController } from './orders.controller';
import { IdempotencyService } from './services/idempotency.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Outbox } from './entities/outbox.entity';
import { EventPublisherService } from 'src/events/event-publisher.service';
import Redis from 'ioredis';
import CONFIG from 'src/config/app.config';

@Module({

  imports: [
    TypeOrmModule.forFeature([Order, Outbox]),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService, 
    IdempotencyService, 
    EventPublisherService,
     {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: CONFIG.redis_host,
          port: CONFIG.redist_port,
        });
      },
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
