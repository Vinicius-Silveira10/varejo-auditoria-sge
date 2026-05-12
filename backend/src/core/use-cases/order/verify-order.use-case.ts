import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { PedidoExpedicao } from '@prisma/client';

export interface VerifyOrderRequest {
  pedidoId: number;
  conferente1Id: number;
  conferente2Id?: number;
}

export class VerifyOrderUseCase {
  private readonly LIMIAR_ALTO_VALOR = 10000.00; // Parametrizado como 10 mil para RN-EXP-003

  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(request: VerifyOrderRequest): Promise<PedidoExpedicao> {
    const pedido = await this.orderRepository.findById(request.pedidoId);

    if (!pedido) {
      throw new Error(`Pedido com ID ${request.pedidoId} não encontrado.`);
    }

    if (pedido.status === 'CONFERIDO' || pedido.status === 'EXPEDIDO') {
      throw new Error(`Pedido já está com status ${pedido.status}.`);
    }

    // Validação RN-EXP-003: Conferência dupla seletiva
    if (pedido.valorTotal >= this.LIMIAR_ALTO_VALOR) {
      if (!request.conferente2Id) {
        throw new Error('RN-EXP-003: Pedidos de alto valor (>= 10000) exigem um segundo conferente obrigatório.');
      }

      // Segregation of Duties (SoD) - O segundo conferente não pode ser a mesma pessoa do primeiro
      if (request.conferente1Id === request.conferente2Id) {
        throw new Error('RN-EXP-003: O primeiro e o segundo conferente não podem ser a mesma pessoa.');
      }
    }

    return this.orderRepository.updateConferentes(
      request.pedidoId, 
      request.conferente1Id, 
      request.conferente2Id
    );
  }
}
