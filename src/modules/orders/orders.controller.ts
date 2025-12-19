import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { OrdersService } from './services/orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { idempotencyKey } from 'src/common/decorators/idempotency-key.decorator';
import { IfMatch } from 'src/common/decorators/if-match.decorator';

@ApiTags('orders')
@Controller('orders')
@UseGuards(TenantGuard)
@UseFilters(HttpExceptionFilter)
@ApiHeader({
  name: 'X-Tenant-Id',
  description: 'Tenant identifier',
  required: true,
})
@ApiHeader({
  name: 'X-Request-ID',
  description: 'Correlation ID',
  required: false,
})
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft order (idempotent)' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Idempotency key conflict',
  })
  async create( @TenantId() tenantId: string, @idempotencyKey() idempotencyKey: string): Promise<OrderResponseDto> {
  
    const order = await this.ordersService.createDraftIdempotent(
      tenantId,
      idempotencyKey,
    );

    return {
      id: order.id,
      tenantId: order.tenantId,
      status: order.status,
      version: order.version,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm an order with optimistic locking)' })
  @ApiHeader({
  name: 'If-Match',
  required: true,
  description: 'Version number for optimistic locking',
  schema: { type: 'string', example: '1' }
})
  @ApiResponse({
    status: 200,
    description: 'Order confirmed successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Version mismatch',
  })
  async confirm(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @IfMatch('if-match') ifMatch: string,
    @RequestId() requestId: string,
    @Body() confirmOrderDto: ConfirmOrderDto,
  ): Promise<OrderResponseDto> {

    const version = parseInt(ifMatch.replace(/"/g, ''), 10); // Remove quotes and parse as integer
    if (isNaN(version)) {
      throw new BadRequestException('Invalid version format');
    }

    const order = await this.ordersService.confirmDraft(
      id,
      tenantId,
      version,
      confirmOrderDto,
    );

    return {
      id: order.id,
      tenantId: order.tenantId,
      status: order.status,
      version: order.version,
      totalCents: order.totalCents,
      updatedAt: order.updatedAt,
      createdAt: order.createdAt, 
    };
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an order and write to outbox' })
  @ApiResponse({
    status: 200,
    description: 'Order closed successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Order not in confirmed status',
  })
  async close(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @RequestId() requestId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.closeOrder(id, tenantId);

    return {
      id: order.id,
      tenantId: order.tenantId,
      status: order.status,
      version: order.version,
      updatedAt: order.updatedAt,
      createdAt: order.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List orders with keyset pagination' })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: PaginatedResponseDto<OrderResponseDto>,
  })
  async findAll(
    @TenantId() tenantId: string,
    @RequestId() requestId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {

    const result = await this.ordersService.findAll( tenantId, paginationDto.limit, paginationDto.cursor );

    return {
      items: result.items.map((order) => ({
        id: order.id,
        tenantId: order.tenantId,
        status: order.status,
        version: order.version,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      nextCursor: result.nextCursor,
    };
  }
}