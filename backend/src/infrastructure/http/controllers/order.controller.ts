import { Controller, Patch, Param, Body, BadRequestException, UseGuards, Post, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { CloseOrderUseCase } from '../../../core/use-cases/order/close-order.use-case';
import { VerifyOrderUseCase } from '../../../core/use-cases/order/verify-order.use-case';
import { CreateOrderUseCase } from '../../../core/use-cases/order/create-order.use-case';
import { GetOtifDashboardUseCase } from '../../../core/use-cases/order/get-otif-dashboard.use-case';
import { VerifyOrderDto } from '../dtos/verify-order.dto';
import { CreateOrderDto } from '../dtos/create-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly closeOrderUseCase: CloseOrderUseCase,
    private readonly verifyOrderUseCase: VerifyOrderUseCase,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOtifDashboardUseCase: GetOtifDashboardUseCase,
  ) {}

  @Roles(Role.GESTOR, Role.ADMIN)
  @Get('dashboard/otif')
  async getOtifDashboard() {
    const result = await this.getOtifDashboardUseCase.execute();
    return {
      data: result,
    };
  }

  @Roles(Role.GESTOR, Role.ADMIN)
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    const result = await this.createOrderUseCase.execute(dto);
    return {
      message: 'Pedido criado com sucesso',
      data: result,
    };
  }

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
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

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
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
