import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TeacherQuestionOptionDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  label: string;

  @ApiProperty({ example: 'x = 5' })
  @IsString()
  @MinLength(1)
  text: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateTeacherQuestionDto {
  @ApiProperty({ example: 'Tentukan nilai x dari 2x + 4 = 14!' })
  @IsString()
  @MinLength(1)
  question: string;

  @ApiProperty({ example: '2x = 10 -> x = 5', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ example: 'https://example.com/math.png', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ type: [TeacherQuestionOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => TeacherQuestionOptionDto)
  options: TeacherQuestionOptionDto[];
}
