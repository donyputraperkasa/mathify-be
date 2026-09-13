import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "budi@guru.id atau Budi" })
  @IsString()
  @IsNotEmpty({ message: "Email atau nama tidak boleh kosong" })
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @IsNotEmpty({ message: "Password tidak boleh kosong" })
  password: string;
}
