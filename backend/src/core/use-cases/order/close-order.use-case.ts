import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { PedidoExpedicao } from '@prisma/client';

export class CloseOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(pedidoId: number): Promise<PedidoExpedicao> {
    const pedido = await this.orderRepository.findById(pedidoId);

    if (!pedido) {
      throw new Error(`Pedido com ID ${pedidoId} não encontrado.`);
    }

    if (pedido.status === 'EXPEDIDO') {
      throw new Error('Pedido já está expedido.');
    }

    // RN-EXP-002: Validação de pedido expedido
    // Não fechar pedido com itens pendentes (Impedir “Expedido”)
    const pendencias: Array<{ produtoId: number; faltando: number }> = [];

    for (const item of pedido.itens) {
      if (item.quantidadeSeparada < item.quantidadeSolicitada) {
        pendencias.push({
          produtoId: item.produtoId,
          faltando: item.quantidadeSolicitada - item.quantidadeSeparada,
        });
      }
    }

    if (pendencias.length > 0) {
      const detalhes = pendencias.map(p => `Produto ${p.produtoId}: falta ${p.faltando}`).join(', ');
      throw new Error(`RN-EXP-002: Não é possível expedir o pedido. Existem itens com picking pendente: ${detalhes}`);
    }

    // Se todos os itens estão separados corretamente, atualiza para EXPEDIDO
    return this.orderRepository.updateStatus(pedidoId, 'EXPEDIDO');
  }
}
