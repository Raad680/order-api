import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface IdempotencyRecord {
  response: any;
  statusCode: number;
  createdAt: Date;
}

@Injectable()
export class IdempotencyService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private generateRedisKey(tenantId: string, key: string): string {
    return `idempotency:${tenantId}:${key}`;
  }

  async getRecordFromRedis(tenantId: string, key: string): Promise<IdempotencyRecord | null> {
    const record = await this.redis.get(this.generateRedisKey(tenantId, key));
    return record ? JSON.parse(record) : null;
  }

  async setRecordInRedis( tenantId: string, key: string, response: any, statusCode: number, ttlSeconds: number): Promise<void> {
    const record: IdempotencyRecord = {
      response,
      statusCode,
      createdAt: new Date(),
    };
    
    await this.redis.setex(
      this.generateRedisKey(tenantId, key),
      ttlSeconds,
      JSON.stringify(record),
    );
  }
}