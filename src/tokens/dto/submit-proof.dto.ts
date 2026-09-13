import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitProofDto {
  @ApiProperty({ example: 'https://example.com/bukti-transfer-5rb.jpg' })
  @IsString()
  @IsNotEmpty()
  proofImageUrl: string;
}
