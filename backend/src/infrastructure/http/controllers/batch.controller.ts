import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { ReceiveBatchUseCase } from '../../../core/use-cases/batch/receive-batch.use-case';
import { ReceiveBatchDto } from '../dtos/receive-batch.dto';

@UseGuards(JwtAuthGuard)
@Controller('batches')
export class BatchController {
  constructor(private readonly receiveBatchUseCase: ReceiveBatchUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async receiveBatch(@Body() dto: ReceiveBatchDto) {
    try {
      const validadeDate = dto.validade ? new Date(dto.validade) : undefined;
      const result = await this.receiveBatchUseCase.execute({
        ...dto,
        validade: validadeDate,
      });
      return {
        message: 'Lote recebido com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-BAT-001') || error.message.includes('RN-BAT-002')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
