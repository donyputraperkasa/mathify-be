import { ApiProperty } from '@nestjs/swagger';
import { GameType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTvSessionDto {
  @ApiProperty({ example: 'cuid-of-game-deck' })
  @IsString()
  @IsNotEmpty()
  deckId: string;

  @ApiProperty({
    enum: GameType,
    example: GameType.FLIP_CARD,
    default: GameType.FLIP_CARD,
    description:
      'Mode game yang dimainkan: FLIP_CARD, MATH_BATTLE_2P (Tarik Tambang), SPIN_WHEEL, TRIVIA_QUIZ',
    required: false,
  })
  @IsOptional()
  @IsEnum(GameType)
  selectedMode?: GameType;

  @ApiProperty({
    example: 'Andi (Tim Biru)',
    default: 'Tim Biru',
    required: false,
  })
  @IsOptional()
  @IsString()
  player1Name?: string;

  @ApiProperty({
    example: 'Budi (Tim Merah)',
    default: 'Tim Merah',
    required: false,
  })
  @IsOptional()
  @IsString()
  player2Name?: string;

  @ApiProperty({
    example: 3,
    default: 3,
    description: 'Selisih poin untuk menang tarik tambang',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  targetDifference?: number;
}
