import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Order } from './modules/orders/entities/order.entity';
import { Outbox } from './modules/orders/entities/outbox.entity';
import CONFIG from './config/app.config';
import { OrdersModule } from './modules/orders/orders.module';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: CONFIG.db_host,
        port: CONFIG.db_port,
        username: CONFIG.db_username,
        password: CONFIG.db_password,
        database: CONFIG.db_name,
        entities: [Order, Outbox],
      }),
      inject: [ConfigService],
      
    }),
    OrdersModule,
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: CONFIG.redis_host,
          port: CONFIG.redist_port,
        });
      },
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
