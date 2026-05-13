import { Movimentacao } from '@prisma/client';

export interface IMovementRepository {
  create(data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<Movimentacao>;
  findByLote(loteId: number): Promise<Movimentacao[]>;
  findAllOrdered(): Promise<Movimentacao[]>;
  findPaginatedOrdered(skip: number, take: number): Promise<Movimentacao[]>;
  countAll(): Promise<number>;
  executeMovementTransaction(params: {
    movementData: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>;
    loteId: number;
    quantidadeDeltaLote: number;
    origemId?: number;
    novaOcupacaoOrigem?: number;
    destinoId?: number;
    novaOcupacaoDestino?: number;
  }): Promise<Movimentacao>;
}
