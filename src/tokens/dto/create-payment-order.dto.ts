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

  @ApiProperty({
    example: 12000,
    description: 'Total harga paket kustom/promo (opsional, jika tidak diset dihitung dari tarif satuan)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({
    example: '5 Sesi Game (Reguler)',
    required: false,
  })
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiProperty({
    example: 'BCA 1234567890 a.n. Guru',
    required: false,
  })
  @IsOptional()
  @IsString()
  senderAccount?: string;

  @ApiProperty({
    example: 'REF-1727000',
    required: false,
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
