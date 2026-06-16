import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { Movimentacao } from '@prisma/client';

export interface PickSuggestion {
  itemPedidoId: number;
  loteId: number;
  numeroLote: string;
  quantidadeSeparada: number;
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
  totalMovimentacoes: number;
}

export class PickOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly movementRepository: IMovementRepository,
  ) {}

  async execute(pedidoId: number, operadorId: number): Promise<PickingResult> {
    const pedido = await this.orderRepository.findById(pedidoId);

    if (!pedido) {
      throw new Error(`Pedido com ID ${pedidoId} não encontrado.`);
    }

    if (pedido.status !== 'PENDENTE') {
      throw new Error(`RN-EXP-002: Pedido ${pedidoId} não está em status PENDENTE (status atual: ${pedido.status}).`);
    }

    const pickingList: ItemPicking[] = [];
    let totalMovimentacoes = 0;

    for (const item of pedido.itens) {
      const lotes = await this.batchRepository.findAvailableByProduct(item.produtoId);

      // RN-EXP-001: Ordenar por FEFO — lotes COM validade primeiro (mais próximos), sem validade por último
      const lotesOrdenados = lotes.sort((a, b) => {
        if (!a.validade && !b.validade) return 0;
        if (!a.validade) return 1;  // sem validade → vai para o fim
        if (!b.validade) return -1; // sem validade → vai para o fim
        return a.validade.getTime() - b.validade.getTime();
      });

      let quantidadeRestante = item.quantidadeSolicitada - item.quantidadeSeparada;
      const sugestoes: PickSuggestion[] = [];

      for (const lote of lotesOrdenados) {
        if (quantidadeRestante <= 0) break;

        const qtdParaPegar = Math.min(lote.quantidade, quantidadeRestante);
        sugestoes.push({
          itemPedidoId: item.id,
          loteId: lote.id,
          numeroLote: lote.numeroLote,
          quantidadeSeparada: qtdParaPegar,
          validade: lote.validade,
        });

        quantidadeRestante -= qtdParaPegar;
      }

      if (quantidadeRestante > 0) {
        throw new Error(
          `RN-EXP-004: Saldo insuficiente para o produto ID ${item.produtoId} no pedido ${pedido.id}. Faltam ${quantidadeRestante} unidades.`,
        );
      }

      pickingList.push({
        produtoId: item.produtoId,
        quantidadeTotalSolicitada: item.quantidadeSolicitada,
        sugestoes,
      });
    }

    // GAP-002 FIX: Efetivar o picking — debitar lotes e registrar movimentações de EXPEDICAO
    for (const itemPicking of pickingList) {
      for (const sugestao of itemPicking.sugestoes) {
        // Debitar saldo do lote e registrar movimentação de forma atômica
        await this.movementRepository.executeMovementTransaction({
          movementData: {
            tipo: 'EXPEDICAO',
            loteId: sugestao.loteId,
            quantidade: sugestao.quantidadeSeparada,
            motivo: `Picking do Pedido #${pedidoId}`,
            enderecoOrigemId: null,
            enderecoDestinoId: null,
            usuarioId: operadorId,
          } as Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>,
          loteId: sugestao.loteId,
          quantidadeDeltaLote: -sugestao.quantidadeSeparada,
        });

        // Atualizar quantidadeSeparada no ItemPedido
        const novaQtdSeparada =
          (pedido.itens.find((i) => i.id === sugestao.itemPedidoId)?.quantidadeSeparada ?? 0) +
          sugestao.quantidadeSeparada;
        await this.orderRepository.updateItemSeparado(sugestao.itemPedidoId, novaQtdSeparada);

        totalMovimentacoes++;
      }
    }

    // Atualiza status do pedido para SEPARACAO
    await this.orderRepository.updateStatus(pedidoId, 'SEPARACAO');

    return {
      pedidoId,
      pickingList,
      totalMovimentacoes,
    };
  }
}
