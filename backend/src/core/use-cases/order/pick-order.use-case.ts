import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { Movimentacao } from '@prisma/client';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

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

/**
 * ADR-001: Representa de onde exatamente uma quantidade será retirada durante um pick.
 * - enderecoOrigemId: preenchido quando o estoque está fisicamente alocado num endereço.
 *   null quando o estoque ainda não passou por putaway (cross-docking).
 * - quantidadePegar: a quantidade a retirar deste endereço (ou do cais, se null).
 */
interface PickSource {
  loteId: number;
  itemPedidoId: number;
  quantidadePegar: number;
  enderecoOrigemId: number | null;
}

export class PickOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly movementRepository: IMovementRepository,
    private readonly unitOfWork: IUnitOfWork,
    private readonly addressRepository: IAddressRepository,
  ) {}

  async execute(pedidoId: number, operadorId: number): Promise<PickingResult> {
    const pedido = await this.orderRepository.findById(pedidoId);

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${pedidoId} não encontrado.`);
    }

    if (pedido.status !== 'PENDENTE') {
      throw new DomainException(
        `RN-EXP-002: Pedido ${pedidoId} não está em status PENDENTE (status atual: ${pedido.status}).`,
      );
    }

    const pickingList: ItemPicking[] = [];
    // Lista plana de operações atômicas a executar na transação
    const pickSources: PickSource[] = [];
    let totalMovimentacoes = 0;

    for (const item of pedido.itens) {
      const lotes = await this.batchRepository.findAvailableByProduct(item.produtoId);

      // RN-EXP-001: FEFO — lotes COM validade (mais próximos) primeiro, sem validade por último
      const lotesOrdenados = lotes.sort((a, b) => {
        if (!a.validade && !b.validade) return 0;
        if (!a.validade) return 1;
        if (!b.validade) return -1;
        return a.validade.getTime() - b.validade.getTime();
      });

      let quantidadeRestante = item.quantidadeSolicitada - item.quantidadeSeparada;
      const sugestoes: PickSuggestion[] = [];

      for (const lote of lotesOrdenados) {
        if (quantidadeRestante <= 0) break;

        const qtdDoLote = Math.min(lote.quantidade, quantidadeRestante);

        sugestoes.push({
          itemPedidoId: item.id,
          loteId: lote.id,
          numeroLote: lote.numeroLote,
          quantidadeSeparada: qtdDoLote,
          validade: lote.validade,
        });

        // ADR-001: Determinar a posição física do estoque deste lote.
        // Retorna endereços com alocação positiva, ordenados por maior alocado primeiro
        // (estratégia "esvaziar primeiro" — menos fragmentação de endereços).
        const alocacoes = await this.movementRepository.findAllocationByLote(lote.id);

        const totalAlocado = alocacoes.reduce((acc, a) => acc + a.quantidadeAlocada, 0);

        // Quantidade desta sugestão que precisa ser "desalocada" de endereços físicos.
        // Caso totalAlocado < qtdDoLote, o restante é cross-docking (sem endereço físico).
        let qtdARestirardosEnderecos = Math.min(qtdDoLote, totalAlocado);

        for (const alocacao of alocacoes) {
          if (qtdARestirardosEnderecos <= 0) break;

          const qtdDesteEndereco = Math.min(
            alocacao.quantidadeAlocada,
            qtdARestirardosEnderecos,
          );

          pickSources.push({
            loteId: lote.id,
            itemPedidoId: item.id,
            quantidadePegar: qtdDesteEndereco,
            enderecoOrigemId: alocacao.enderecoId,
          });

          qtdARestirardosEnderecos -= qtdDesteEndereco;
        }

        // Estoque em cross-docking (restante que não tinha endereço físico)
        const qtdCrossDocking = qtdDoLote - Math.min(qtdDoLote, totalAlocado);
        if (qtdCrossDocking > 0) {
          pickSources.push({
            loteId: lote.id,
            itemPedidoId: item.id,
            quantidadePegar: qtdCrossDocking,
            enderecoOrigemId: null,
          });
        }

        quantidadeRestante -= qtdDoLote;
      }

      if (quantidadeRestante > 0) {
        throw new DomainException(
          `RN-EXP-004: Saldo insuficiente para o produto ID ${item.produtoId} no pedido ${pedido.id}. Faltam ${quantidadeRestante} unidades.`,
        );
      }

      pickingList.push({
        produtoId: item.produtoId,
        quantidadeTotalSolicitada: item.quantidadeSolicitada,
        sugestoes,
      });
    }

    // Efetivação atômica: debitar lotes, atualizar ocupados, registrar movimentações
    await this.unitOfWork.execute(async (ctx) => {
      // FIX: Prevenção de Deadlock (Lock Ordering)
      // Como o loop abaixo irá criar Movimentações (que adquirem lock do ChainPointer),
      // precisamos garantir que todos os locks de Domínio (Lote) sejam adquiridos ANTES,
      // e sempre na mesma ordem (ordenados pelo ID) para evitar deadlocks entre transações concorrentes.
      const uniqueLoteIds = [...new Set(pickSources.map((s) => s.loteId))].sort((a, b) => a - b);
      for (const loteId of uniqueLoteIds) {
        await ctx.lockForUpdate('Lote', loteId);
      }

      // Mapa para agregar decrementos por endereço (evita múltiplos updateOcupacao no mesmo endereço)
      const decrementoPorEndereco = new Map<number, number>();

      for (const source of pickSources) {
        // Debitar saldo contábil do lote
        await ctx.loteRepository.updateQuantidadeDelta(source.loteId, -source.quantidadePegar);

        // Registrar movimentação de EXPEDICAO com enderecoOrigemId quando aplicável
        await ctx.movementRepository.create({
          tipo: 'EXPEDICAO',
          loteId: source.loteId,
          quantidade: source.quantidadePegar,
          motivo: `Picking do Pedido #${pedidoId}`,
          enderecoOrigemId: source.enderecoOrigemId,  // null para cross-docking
          enderecoDestinoId: null,
          usuarioId: operadorId,
        });

        // Acumular decremento por endereço (pode haver múltiplas retiradas do mesmo endereço)
        if (source.enderecoOrigemId !== null) {
          const atual = decrementoPorEndereco.get(source.enderecoOrigemId) ?? 0;
          decrementoPorEndereco.set(source.enderecoOrigemId, atual + source.quantidadePegar);
        }

        totalMovimentacoes++;
      }

      // Aplicar decrementos de ocupado — um update por endereço, dentro da mesma transação
      for (const [enderecoId, decremento] of decrementoPorEndereco.entries()) {
        const endereco = await ctx.addressRepository.findById(enderecoId);
        if (endereco) {
          const novaOcupacao = Math.max(0, endereco.ocupado - decremento);
          await ctx.addressRepository.updateOcupacao(enderecoId, novaOcupacao);
        }
      }

      // Atualizar quantidadeSeparada nos ItemPedido
      for (const itemPicking of pickingList) {
        for (const sugestao of itemPicking.sugestoes) {
          const novaQtdSeparada =
            (pedido.itens.find((i) => i.id === sugestao.itemPedidoId)
              ?.quantidadeSeparada ?? 0) + sugestao.quantidadeSeparada;
          await ctx.orderRepository.updateItemSeparado(
            sugestao.itemPedidoId,
            novaQtdSeparada,
          );
        }
      }

      await ctx.orderRepository.updateStatus(pedidoId, 'SEPARACAO');
    });

    return {
      pedidoId,
      pickingList,
      totalMovimentacoes,
    };
  }
}
