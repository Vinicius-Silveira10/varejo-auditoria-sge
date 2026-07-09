import {
  IsInt,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestAdjustmentBodyDto {
  @ApiProperty({ description: 'ID do lote a ser ajustado', example: 1 })
  @IsInt()
  @IsPositive()
  loteId: number;

  @ApiProperty({
    description: 'Variação da quantidade (pode ser negativa para perdas)',
    example: -10,
  })
  @IsInt()
  quantidadeDelta: number;

  @ApiProperty({
    description: 'Motivo do ajuste de estoque',
    example: 'Avaria no transporte',
  })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}
