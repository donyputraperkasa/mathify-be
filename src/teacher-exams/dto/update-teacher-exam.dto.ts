import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTeacherExamDto {
  @ApiProperty({
    example: 'Ujian Tengah Semester Matematika - Revisi',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 90, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes?: number;

  @ApiProperty({ example: '654321', required: false })
  @IsOptional()
  @IsString()
  @MinLength(4)
  pin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoBlockOnViolation?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxViolations?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showScoreAfterSubmit?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showReviewAfterSubmit?: boolean;
}
