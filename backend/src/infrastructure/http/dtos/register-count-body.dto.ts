import { IsInt, IsNumber, Min, IsOptional, IsBoolean, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCountBodyDto {
  @ApiProperty({ description: 'ID do registro de contagem', example: 10 })
  @IsInt()
  @IsPositive()
  contagemId: number;

  @ApiProperty({ description: 'Quantidade física contada', example: 98 })
  @IsInt()
  @Min(0)
  quantidadeFisica: number;

  @ApiProperty({ description: 'Indica se esta é uma recontagem (segunda contagem)', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isRecontagem?: boolean;
}
