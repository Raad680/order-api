import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty({ required: false })
  nextCursor?: string;
}