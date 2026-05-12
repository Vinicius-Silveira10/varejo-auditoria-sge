import { Controller, Patch, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { CloseOrderUseCase } from '../../../core/use-cases/order/close-order.use-case';
import { VerifyOrderUseCase } from '../../../core/use-cases/order/verify-order.use-case';
import { VerifyOrderDto } from '../dtos/verify-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly closeOrderUseCase: CloseOrderUseCase,
    private readonly verifyOrderUseCase: VerifyOrderUseCase,
  ) {}

  @Patch(':id/verify')
  async verifyOrder(@Param('id') id: string, @Body() dto: VerifyOrderDto) {
    try {
      const result = await this.verifyOrderUseCase.execute({
        pedidoId: +id,
        conferente1Id: dto.conferente1Id,
        conferente2Id: dto.conferente2Id,
      });
      return {
        message: 'Pedido conferido com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-EXP-003')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/close')
  async closeOrder(@Param('id') id: string) {
    try {
      const result = await this.closeOrderUseCase.execute(+id);
      return {
        message: 'Pedido expedido com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-EXP-002')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
