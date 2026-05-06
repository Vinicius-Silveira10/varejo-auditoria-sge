import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class RegisterAddressDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  zona: string;

  @IsInt()
  @IsPositive()
  capacidade: number;
}
