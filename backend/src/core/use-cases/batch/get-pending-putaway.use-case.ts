import type { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { Injectable } from '@nestjs/common';

/**
 * ADR-001: Fórmula de cálculo de estoque pendente de putaway.
 *
 * Pendente = Lote.quantidade − SUM(ARMAZENAGEM) + SUM(EXPEDICAO com enderecoOrigemId IS NOT NULL)
 *
 * Raciocínio:
 * - `Lote.quantidade` é o saldo contábil atual (já descontadas todas as expedições, de qualquer tipo).
 * - `−SUM(ARMAZENAGEM)` desconta o que já foi fisicamente alocado em endereços.
 * - `+SUM(EXPEDICAO com origemId)` reintegra o que foi expedido DE UM ENDEREÇO FÍSICO,
 *   porque a ARMAZENAGEM original desse estoque ainda existe no histórico (imutável para auditoria),
 *   mas o item já não está mais no endereço — sem essa compensação, o cálculo ficaria negativo.
 *
 * Casos extremos validados:
 *   T0 - Recém-recebido (zero putaway, zero pick):   100 − 0 + 0  = 100 ✅
 *   T1 - 100% armazenado, sem pick:                  100 − 100 + 0 = 0  ✅
 *   T2 - Parcialmente armazenado (60), sem pick:     100 − 60 + 0  = 40 ✅
 *   T3 - 100% armazenado, 30 expedidos de endereço:   70 − 100 + 30 = 0  ✅
 *   T4 - Cross-docking: 30 expedidos sem putaway:     70 − 0 + 0    = 70 ✅
 *   T5 - Misto: 60 arm., pick 30 (20 de endereço):    70 − 60 + 20  = 30 ✅
 *   T6 - 2 endereços (40+30), pick 50 (40A+10B):      50 − 70 + 50  = 30 ✅
 */
export interface PendingPutawayBatch {
  loteId: number;
  numeroLote: string;
  produtoId: number;
  produtoSku: string;
  produtoDescricao: string;
  quantidadeTotal: number;
  quantidadePendente: number;
  validade: Date | null;
}

@Injectable()
export class GetPendingPutawayBatchesUseCase {
  constructor(private readonly batchRepository: IBatchRepository) {}

  async execute(): Promise<PendingPutawayBatch[]> {
    // findActiveWithBalance retorna lotes ativos com saldo > 0,
    // incluindo movimentações de ARMAZENAGEM e EXPEDICAO (com enderecoOrigemId) via relation filter
    const lotesAtivos = await this.batchRepository.findActiveWithBalance();

    const pendentes: PendingPutawayBatch[] = [];

    for (const lote of lotesAtivos) {
      const movimentos: any[] = (lote as any).movimentacoes || [];

      // SUM de tudo que foi fisicamente colocado em endereços
      const sumArmazenagem = movimentos
        .filter((m: any) => m.tipo === 'ARMAZENAGEM')
        .reduce((acc: number, m: any) => acc + m.quantidade, 0);

      // SUM de tudo que saiu de um endereço físico via expedição
      // (cross-docking não entra pois enderecoOrigemId = null nesses casos)
      const sumExpedicaoDeEndereco = movimentos
        .filter((m: any) => m.tipo === 'EXPEDICAO' && m.enderecoOrigemId !== null)
        .reduce((acc: number, m: any) => acc + m.quantidade, 0);

      // Fórmula ADR-001
      const quantidadePendente = lote.quantidade - sumArmazenagem + sumExpedicaoDeEndereco;

      if (quantidadePendente > 0) {
        pendentes.push({
          loteId: lote.id,
          numeroLote: lote.numeroLote,
          produtoId: lote.produtoId,
          produtoSku: (lote as any).produto?.sku || '',
          produtoDescricao: (lote as any).produto?.descricao || '',
          quantidadeTotal: lote.quantidade,
          quantidadePendente,
          validade: lote.validade,
        });
      }
    }

    return pendentes;
  }
}
