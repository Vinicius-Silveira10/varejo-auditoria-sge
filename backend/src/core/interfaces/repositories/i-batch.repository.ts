import { Lote } from '@prisma/client';

export interface IBatchRepository {
  create(data: Omit<Lote, 'id' | 'criadoEm'>): Promise<Lote>;
  findById(id: number): Promise<Lote | null>;
  findAvailableByProduct(produtoId: number): Promise<Lote[]>;
  updateQuantidade(id: number, novaQuantidade: number): Promise<Lote>;
  updateQuantidadeDelta(id: number, delta: number): Promise<Lote>;
  updateInventarioStatus(id: number, status: boolean): Promise<Lote>;
  countByNotaFiscal(notaFiscalId: number): Promise<number>;
  findExpiring(days: number): Promise<Lote[]>;
}
