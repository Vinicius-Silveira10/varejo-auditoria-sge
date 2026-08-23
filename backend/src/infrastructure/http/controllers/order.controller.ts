import {
  Controller,
  Patch,
  Param,
  Body,
  BadRequestException,
  UseGuards,
  Post,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { CurrentUser } from '../../security/current-user.decorator';
import { Roles, Role } from '../../security/roles.decorator';
import { CloseOrderUseCase } from '../../../core/use-cases/order/close-order.use-case';
import { VerifyOrderUseCase } from '../../../core/use-cases/order/verify-order.use-case';
import { CreateOrderUseCase } from '../../../core/use-cases/order/create-order.use-case';
import { PickOrderUseCase } from '../../../core/use-cases/order/pick-order.use-case';
import { GetOtifDashboardUseCase } from '../../../core/use-cases/order/get-otif-dashboard.use-case';
import { ListPendingOrdersUseCase } from '../../../core/use-cases/order/list-pending-orders.use-case';
import { VerifyOrderDto } from '../dtos/verify-order.dto';
import { CreateOrderDto } from '../dtos/create-order.dto';

import { DashboardGateway } from '../../websocket/dashboard.gateway';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly closeOrderUseCase: CloseOrderUseCase,
    private readonly verifyOrderUseCase: VerifyOrderUseCase,
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly pickOrderUseCase: PickOrderUseCase,
    private readonly getOtifDashboardUseCase: GetOtifDashboardUseCase,
    private readonly listPendingOrdersUseCase: ListPendingOrdersUseCase,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Listar pedidos de expedição por status (padrão: PENDENTE)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDENTE', 'SEPARACAO', 'CONFERIDO', 'EXPEDIDO'], description: 'Filtro de status (default: PENDENTE)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos retornada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Status inválido.' })
  async listOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return await this.listPendingOrdersUseCase.execute({
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
    } catch (error: any) {
      if (error.message.includes('Status invalido')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Roles(Role.GESTOR, Role.ADMIN)
  @Get('dashboard/otif')
  @ApiOperation({ summary: 'Obter dashboard OTIF de pedidos de expedição' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard OTIF calculado com sucesso.',
  })
  async getOtifDashboard() {
    const result = await this.getOtifDashboardUseCase.execute();
    return { data: result };
  }


  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
  @Post(':id/pick')
  @ApiOperation({
    summary: 'Iniciar picking de um pedido (FEFO) — efetiva débito no estoque',
  })
  @ApiParam({ name: 'id', description: 'ID do Pedido de Expedição' })
  @ApiResponse({
    status: 201,
    description: 'Picking realizado com sucesso. Lotes debitados.',
  })
  @ApiResponse({
    status: 400,
    description: 'Saldo insuficiente ou pedido em status inválido.',
  })
  async pickOrder(@Param('id') id: string, @CurrentUser('userId') operadorId: number) {
    try {
      const result = await this.pickOrderUseCase.execute(+id, operadorId);
      this.dashboardGateway.emitDashboardUpdate('order:picked', result);
      return {
        message: `Picking do pedido #${id} realizado com sucesso. ${result.totalMovimentacoes} movimentação(ões) gerada(s).`,
        data: result,
      };
    } catch (error: any) {
      if (
        error.message.includes('RN-EXP-004') ||
        error.message.includes('RN-EXP-002') ||
        error.message.includes('RN-EXP-007')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Roles(Role.GESTOR, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Criar um novo pedido de expedição' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  async createOrder(@Body() dto: CreateOrderDto) {
    const result = await this.createOrderUseCase.execute(dto);
    return {
      message: 'Pedido criado com sucesso',
      data: result,
    };
  }

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
  @Patch(':id/verify')
  @ApiOperation({
    summary: 'Conferir um pedido com dois conferentes (RN-EXP-003)',
  })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiResponse({ status: 200, description: 'Pedido conferido com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Pedido não encontrado ou regra de dupla conferência violada.',
  })
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
  @ApiOperation({
    summary: 'Expedir um pedido (encerrar e marcar como EXPEDIDO)',
  })
  @ApiParam({ name: 'id', description: 'ID do pedido' })
  @ApiResponse({ status: 200, description: 'Pedido expedido com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Pedido em status inválido para expedição (RN-EXP-002).',
  })
  async closeOrder(@Param('id') id: string) {
    try {
      const result = await this.closeOrderUseCase.execute(+id);
      this.dashboardGateway.emitDashboardUpdate('order:closed', result);
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
