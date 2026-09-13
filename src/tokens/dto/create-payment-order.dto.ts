import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentOrderDto {
  @ApiProperty({
    enum: ProductType,
    example: ProductType.GAME_TOKEN,
    description:
      'Jenis produk: GAME_TOKEN (Rp 5.000) atau EXAM_CREDIT (Rp 14.900)',
    default: ProductType.GAME_TOKEN,
  })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiProperty({ example: 1, description: 'Jumlah yang dibeli', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 'MANUAL_TRANSFER',
    default: 'MANUAL_TRANSFER',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    example: 'https://example.com/bukti-transfer.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  proofImageUrl?: string;
}
