import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsBoolean()
  @IsOptional()
  perecivel?: boolean;
}
