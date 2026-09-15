import { ApiProperty } from '@nestjs/swagger';
import { GameType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CardItemDto {
  @ApiProperty({ example: 'Berapakah 25 x 4?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: '100' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({ example: 'Pikirkan kelipatan 25', required: false })
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiProperty({ example: 'https://example.com/img.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 30, default: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationSeconds?: number;
}

export class CreateDeckDto {
  @ApiProperty({ example: 'Operasi Aljabar Kelas 7' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Latihan soal perkalian dan penjumlahan aljabar',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Matematika', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Kelas 7', required: false })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ enum: GameType, default: GameType.FLIP_CARD, required: false })
  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ type: [CardItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardItemDto)
  cards?: CardItemDto[];
}
