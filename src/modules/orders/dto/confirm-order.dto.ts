import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ConfirmOrderDto {
  @ApiProperty({
    description: 'Total amount in cents',
    example: 1000,
  })
  @IsInt()
  @Min(0)
  totalCents: number;
}