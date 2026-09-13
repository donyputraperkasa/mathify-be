import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddCardDto {
  @ApiProperty({ example: 'Sederhanakan: 3x + 5x' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: '8x' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({
    example: 'Tambahkan koefisien variabel yang sejenis',
    required: false,
  })
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiProperty({ example: 'https://example.com/card.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 30, default: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationSeconds?: number;
}
