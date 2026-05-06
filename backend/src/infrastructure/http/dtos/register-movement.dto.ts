import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsIn } from 'class-validator';

export class RegisterMovementDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ENTRADA', 'SAIDA', 'AJUSTE', 'INVENTARIO', 'EXPEDICAO'])
  tipo: string;

  @IsInt()
  @IsPositive()
  loteId: number;

  @IsInt()
  @IsPositive()
  quantidade: number;

  @IsString()
  @IsOptional()
  motivo?: string;

  @IsInt()
  @IsOptional()
  enderecoOrigemId?: number;

  @IsInt()
  @IsOptional()
  enderecoDestinoId?: number;

  @IsInt()
  @IsNotEmpty()
  usuarioId: number;
}
