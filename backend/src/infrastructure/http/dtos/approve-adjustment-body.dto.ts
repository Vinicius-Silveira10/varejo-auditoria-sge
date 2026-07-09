import { IsInt, IsBoolean, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveAdjustmentBodyDto {
  @ApiProperty({
    description: 'ID do ajuste a ser aprovado/rejeitado',
    example: 5,
  })
  @IsInt()
  @IsPositive()
  ajusteId: number;

  @ApiProperty({
    description: 'Indica se o ajuste foi aprovado (true) ou rejeitado (false)',
    example: true,
  })
  @IsBoolean()
  aprovado: boolean;
}
