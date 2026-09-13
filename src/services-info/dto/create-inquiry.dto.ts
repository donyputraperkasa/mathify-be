import { ApiProperty } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty({ enum: ServiceType, example: ServiceType.WEB_DEVELOPMENT })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiProperty({ example: 'Budi Santoso', required: false })
  @IsOptional()
  @IsString()
  visitorName?: string;

  @ApiProperty({ example: '08123456789', required: false })
  @IsOptional()
  @IsString()
  visitorPhone?: string;

  @ApiProperty({
    example: 'Saya ingin konsultasi pembuatan web landing page sekolah',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
