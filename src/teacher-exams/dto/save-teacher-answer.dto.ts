import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveTeacherAnswerDto {
  @ApiProperty({ example: 'cuid-of-question' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ example: 'cuid-of-selected-option', required: false })
  @IsOptional()
  @IsString()
  selectedOptionId?: string;
}
