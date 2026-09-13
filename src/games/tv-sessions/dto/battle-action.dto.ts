import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum BattleScorer {
  PLAYER_1 = 'PLAYER_1',
  PLAYER_2 = 'PLAYER_2',
}

export class BattlePointDto {
  @ApiProperty({
    enum: BattleScorer,
    example: BattleScorer.PLAYER_1,
    description:
      'Pemain yang menjawab benar lebih cepat (PLAYER_1 atau PLAYER_2)',
  })
  @IsEnum(BattleScorer)
  scorer: BattleScorer;

  @ApiProperty({
    example: 'host-control-key-secret',
    required: false,
    description:
      'Kunci remote rahasia host guru (bila tidak memakai Authorization header)',
  })
  @IsOptional()
  @IsString()
  hostControlKey?: string;
}

export class RemoteControlActionDto {
  @ApiProperty({
    example: 'host-control-key-secret',
    required: false,
    description: 'Kunci remote rahasia host guru',
  })
  @IsOptional()
  @IsString()
  hostControlKey?: string;
}
