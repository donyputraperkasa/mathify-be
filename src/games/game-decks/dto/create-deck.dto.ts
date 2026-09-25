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
  @ApiProperty({ example: 'Berapakah 25 x 4?', required: false })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiProperty({ example: 'Berapakah 25 x 4?', required: false })
  @IsOptional()
  @IsString()
  frontQuestion?: string;

  @ApiProperty({ example: '100', required: false })
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiProperty({ example: '100', required: false })
  @IsOptional()
  @IsString()
  backAnswer?: string;

  @ApiProperty({ example: 'Pikirkan kelipatan 25', required: false })
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiProperty({ example: 'Pikirkan kelipatan 25', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ example: 'https://example.com/img.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 30, default: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationSeconds?: number;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsInt()
  timerSeconds?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  options?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deckId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  questionType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  points?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  answerImageUrl?: string;
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

  @ApiProperty({ example: 'Kelas 7', required: false })
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @ApiProperty({ example: 'SEDANG', required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({ example: 'TV-8821', required: false })
  @IsOptional()
  @IsString()
  pinCode?: string;

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
