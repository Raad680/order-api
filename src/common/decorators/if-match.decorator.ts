import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";

export const IfMatch = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const key = request.headers['if-match'];
     if (!key) {
          throw new BadRequestException('If-Match header is required');
        }
        
        return key;
  },
);