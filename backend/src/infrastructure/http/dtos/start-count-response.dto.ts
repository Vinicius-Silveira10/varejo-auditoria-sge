import { ApiProperty } from '@nestjs/swagger';

export class StartCountResponseDto {
  @ApiProperty({ description: 'ID do registro de contagem', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID do lote', example: 10 })
  loteId: number;

  @ApiProperty({ description: 'Status da contagem', example: 'PENDENTE' })
  status: string;

  @ApiProperty({ description: 'ID do usuário que iniciou a contagem', example: 5 })
  usuarioId: number;

  @ApiProperty({ description: 'Data de criação da contagem' })
  criadoEm?: Date;
}
