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

export class CreateTeacherExamDto {
  @ApiProperty({ example: 'Ujian Tengah Semester Matematika' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    example: 'Petunjuk: Dilarang membuka tab lain selama ujian',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 60, description: 'Durasi pengerjaan dalam menit' })
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes: number;

  @ApiProperty({ example: '123456', description: 'PIN masuk peserta ujian' })
  @IsString()
  @MinLength(4)
  pin: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  autoBlockOnViolation?: boolean;

  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxViolations?: number;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  showScoreAfterSubmit?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  showReviewAfterSubmit?: boolean;
}
