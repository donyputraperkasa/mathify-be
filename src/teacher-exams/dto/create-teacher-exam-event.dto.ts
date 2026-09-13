import { ApiProperty } from '@nestjs/swagger';
import { TeacherExamEventType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTeacherExamEventDto {
  @ApiProperty({
    enum: TeacherExamEventType,
    example: TeacherExamEventType.TAB_HIDDEN,
  })
  @IsEnum(TeacherExamEventType)
  type: TeacherExamEventType;

  @ApiProperty({ example: 'Siswa berpindah tab browser', required: false })
  @IsOptional()
  @IsString()
  detail?: string;
}
