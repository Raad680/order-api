import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Outbox } from '../entities/outbox.entity';
import { IdempotencyService } from './idempotency.service';
import { ConfirmOrderDto } from '../dto/confirm-order.dto';
import { EventPublisherService } from 'src/events/event-publisher.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Outbox)
    private outboxRepository: Repository<Outbox>,
    private dataSource: DataSource,
    private eventPublisher: EventPublisherService,
    private idempotencyService: IdempotencyService,
  ) {}

  async createDraft(tenantId: string): Promise<Order> {
    try {
    const order = this.ordersRepository.create({
      tenantId,
      status: OrderStatus.DRAFT,
      version: 1,
    });

    const savedOrder = await this.ordersRepository.save(order);
    // Publish event 
    this.eventPublisher.publishOrderEvent(savedOrder, 'orders.created').catch(console.error);

    return savedOrder;
  } catch (error) {
    console.error('Error creating draft order:', error);
    throw error;
  } 
  }

  async createDraftIdempotent( tenantId: string, idempotencyKey: string): Promise<Order> {
    // Check for existing record from redis
    const existing = await this.idempotencyService.getRecordFromRedis(tenantId, idempotencyKey);
    if (existing) {
      return existing.response;
    }

    // else Create new order
    const order = await this.createDraft(tenantId);

    // Store record in the redis here
    await this.idempotencyService.setRecordInRedis(
      tenantId,
      idempotencyKey,
      order,
      201,
      3600,
    );

    return order;
  }

  async confirmDraft( id: string, tenantId: string, version: number, dto: ConfirmOrderDto ): Promise<Order> {
    const order = await this.ordersRepository.findOne(
      {
      where: { id, tenantId },
      }
  );

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order with ID ${id} not found`,
        details: { orderId: id },
      });
    }

    if (!order.checkOrderVersion(version)) {
      throw new ConflictException({
        code: 'VERSION_MISMATCH',
        message: 'Order version does not match',
        details: { expectedVersion: version, actualVersion: order.version },
      });
    }
    
    order.confirmOrderStatus(dto.totalCents);
    const updatedOrder = await this.ordersRepository.save(order);

    // Publish event
    this.eventPublisher.publishOrderEvent(updatedOrder, 'orders.confirmed').catch(console.error);
     return updatedOrder;
  
  }

  async closeOrder(id: string, tenantId: string): Promise<Order> {

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepository = queryRunner.manager.getRepository(Order);
      const outboxRepository = queryRunner.manager.getRepository(Outbox);

      const order = await orderRepository.findOne({
        where: { id, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order with ID ${id} not found`,
          details: { orderId: id },
        });
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException({
          code: 'INVALID_STATUS_TRANSITION',
          message: 'Order must be confirmed before closing',
          details: { currentStatus: order.status },
        });
      }

      order.closeOrder();
      const updatedOrder = await orderRepository.save(order);

      // Create outbox record in the same transaction
      const outbox = outboxRepository.create({
        eventType: 'orders.closed',
        orderId: order.id,
        tenantId: order.tenantId,
        payload: {
          orderId: order.id,
          tenantId: order.tenantId,
          totalCents: order.totalCents,
          closedAt: new Date().toISOString(),
        },
      });

      await outboxRepository.save(outbox);

      await queryRunner.commitTransaction();

      // Publish event
      this.eventPublisher.publishOrderEvent(updatedOrder, 'orders.closed').catch(console.error);

      return updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll( tenantId: string, limit: number, cursor?: string ): Promise<{ items: Order[]; nextCursor?: string }> {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .where('order.tenantId = :tenantId', { tenantId })
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .limit(limit + 1); // Fetch one extra to check if there's more

    if (cursor) {
      try {
        const [createdAt, id] = this.decodeCursor(cursor);
        queryBuilder.andWhere(
          '(order.createdAt < :createdAt OR (order.createdAt = :createdAt AND order.id < :id))',
          { createdAt, id },
        );
      } catch {
        throw new BadRequestException({
          code: 'INVALID_CURSOR',
          message: 'Invalid cursor provided',
        });
      }
    }

    const orders = await queryBuilder.getMany();

    let nextCursor: string | undefined;
    if (orders.length > limit) {
      const lastOrder = orders[limit - 1];
      nextCursor = this.encodeCursor(lastOrder.createdAt, lastOrder.id);
      orders.pop();
    }

    return { items: orders, nextCursor };
  }

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id }),
    ).toString('base64');
  }

  private decodeCursor(cursor: string): [Date, string] {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
    return [new Date(decoded.createdAt), decoded.id];
  }

}