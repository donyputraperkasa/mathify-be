import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class JoinTeacherExamDto {
  @ApiProperty({ example: 'Andi Pratama' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '05', required: false })
  @IsOptional()
  @IsString()
  attendanceNumber?: string;

  @ApiProperty({ example: 'VII-A' })
  @IsString()
  @IsNotEmpty()
  className: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  pin: string;
}
