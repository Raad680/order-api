import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const idempotencyKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const key = request.headers['idempotency-key'];
    
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    
    return key;

  },
);