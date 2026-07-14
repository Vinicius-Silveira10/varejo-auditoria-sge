import { Movimentacao } from '@prisma/client';

/**
 * Representa a alocação física de um lote em um endereço específico.
 * quantidadeAlocada = SUM(ARMAZENAGEM.quantidade onde enderecoDestinoId = enderecoId)
 *                   - SUM(EXPEDICAO.quantidade onde enderecoOrigemId = enderecoId)
 * Apenas endereços com quantidadeAlocada > 0 são retornados.
 */
export interface LoteAddressAllocation {
  enderecoId: number;
  quantidadeAlocada: number;
}

export interface IMovementRepository {
  create(
    data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>,
    tx?: any
  ): Promise<Movimentacao>;
  findByLote(loteId: number): Promise<Movimentacao[]>;
  findAllOrdered(): Promise<Movimentacao[]>;
  findPaginatedOrdered(skip: number, take: number): Promise<Movimentacao[]>;
  countAll(): Promise<number>;
  getMovementQuantitiesByProduct(
    dias: number,
  ): Promise<Array<{ produtoId: number; quantidadeTotal: number }>>;
  purgeBefore(date: Date): Promise<number>;
  /**
   * Retorna a posição física atual de um lote, agrupada por endereço.
   * Utilizado pelo PickOrderUseCase para saber de qual(is) endereço(s) decrementar
   * o campo `ocupado` ao expedir, e pelo get-pending-putaway para calcular a pendência.
   */
  findAllocationByLote(loteId: number): Promise<LoteAddressAllocation[]>;
}
