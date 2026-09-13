import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class TeacherExamRosterItemDto {
  @ApiProperty({ example: '01' })
  @IsString()
  @IsNotEmpty()
  attendanceNumber: string;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ example: 'VII-A' })
  @IsString()
  @IsNotEmpty()
  className: string;
}

export class ReplaceTeacherExamRosterDto {
  @ApiProperty({ type: [TeacherExamRosterItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherExamRosterItemDto)
  students: TeacherExamRosterItemDto[];
}
