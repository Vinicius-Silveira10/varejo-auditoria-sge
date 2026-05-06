import { Movimentacao } from '@prisma/client';

export interface IMovementRepository {
  create(data: Omit<Movimentacao, 'id' | 'criadoEm' | 'hash' | 'previousHash'>): Promise<Movimentacao>;
  findByLote(loteId: number): Promise<Movimentacao[]>;
  findAllOrdered(): Promise<Movimentacao[]>;
}
