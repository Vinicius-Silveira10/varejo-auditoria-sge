import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

export interface PickSuggestion {
  loteId: number;
  numeroLote: string;
  quantidadeSugerida: number;
  validade: Date | null;
}

export interface ItemPicking {
  produtoId: number;
  quantidadeTotalSolicitada: number;
  sugestoes: PickSuggestion[];
}

export interface PickingResult {
  pedidoId: number;
  pickingList: ItemPicking[];
}

export class PickOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly batchRepository: IBatchRepository,
  ) {}

  async execute(pedidoId: number): Promise<PickingResult> {
    const pedido = await this.orderRepository.findById(pedidoId);

    if (!pedido) {
      throw new Error(`Pedido com ID ${pedidoId} não encontrado.`);
    }

    const pickingList: ItemPicking[] = [];

    for (const item of pedido.itens) {
      const lotes = await this.batchRepository.findAvailableByProduct(item.produtoId);
      
      // Ordenar por validade (FEFO) - findAvailableByProduct já deve trazer ordenado, mas garantimos aqui
      const lotesOrdenados = lotes.sort((a, b) => {
        if (!a.validade) return 1;
        if (!b.validade) return -1;
        return a.validade.getTime() - b.validade.getTime();
      });

      let quantidadeRestante = item.quantidadeSolicitada - item.quantidadeSeparada;
      const sugestoes: PickSuggestion[] = [];

      for (const lote of lotesOrdenados) {
        if (quantidadeRestante <= 0) break;

        const qtdParaPegar = Math.min(lote.quantidade, quantidadeRestante);
        sugestoes.push({
          loteId: lote.id,
          numeroLote: lote.numeroLote,
          quantidadeSugerida: qtdParaPegar,
          validade: lote.validade,
        });

        quantidadeRestante -= qtdParaPegar;
      }

      if (quantidadeRestante > 0) {
        throw new Error(`RN-EXP-004: Saldo insuficiente para o produto ID ${item.produtoId} no pedido ${pedido.id}. Faltam ${quantidadeRestante} unidades.`);
      }

      pickingList.push({
        produtoId: item.produtoId,
        quantidadeTotalSolicitada: item.quantidadeSolicitada,
        sugestoes,
      });
    }

    // Atualiza status do pedido para SEPARACAO
    await this.orderRepository.updateStatus(pedidoId, 'SEPARACAO');

    return {
      pedidoId,
      pickingList,
    };
  }
}
