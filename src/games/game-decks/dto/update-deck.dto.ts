import { ApiProperty } from '@nestjs/swagger';
import { GameType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CardItemDto } from './create-deck.dto';

export class UpdateDeckDto {
  @ApiProperty({ example: 'Operasi Aljabar Kelas 7', required: false })
  @IsOptional()
  @IsString()
  title?: string;

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

  @ApiProperty({ enum: GameType, required: false })
  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

  @ApiProperty({ required: false })
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
