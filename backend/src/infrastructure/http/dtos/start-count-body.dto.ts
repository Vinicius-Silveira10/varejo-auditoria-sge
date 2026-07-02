import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartCountBodyDto {
  @ApiProperty({ description: 'ID do lote para iniciar a contagem de inventário', example: 1 })
  @IsInt()
  @IsPositive()
  loteId: number;
}
