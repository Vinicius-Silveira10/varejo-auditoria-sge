import { Produto } from '@prisma/client';

export interface IProductRepository {
  create(data: Omit<Produto, 'id' | 'custoMedio' | 'ativo'>): Promise<Produto>;
  findById(id: number): Promise<Produto | null>;
  findBySku(sku: string): Promise<Produto | null>;
  updateCustoMedio(id: number, novoCusto: number): Promise<Produto>;
  disable(id: number): Promise<Produto>;
}
