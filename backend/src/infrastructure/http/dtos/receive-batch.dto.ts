import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ReceiveBatchDto {
  @IsString()
  @IsNotEmpty()
  numeroLote: string;

  @IsInt()
  @IsPositive()
  produtoId: number;

  @IsInt()
  @IsPositive()
  quantidade: number;

  @IsNumber()
  @IsPositive()
  custoAquisicao: number;

  @IsDateString()
  @IsOptional()
  validade?: string;
}
