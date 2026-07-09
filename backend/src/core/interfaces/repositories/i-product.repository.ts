import { Produto } from '@prisma/client';

export interface IProductRepository {
  create(
    data: Omit<Produto, 'id' | 'custoMedio' | 'ativo' | 'curvaAbc'>,
  ): Promise<Produto>;
  findById(id: number): Promise<Produto | null>;
  findBySku(sku: string): Promise<Produto | null>;
  updateCustoMedio(id: number, novoCusto: number): Promise<Produto>;
  updateCurvaAbc(id: number, curva: string): Promise<Produto>;
  disable(id: number): Promise<Produto>;
  findAll(): Promise<Produto[]>;
  getRupturesKpi(): Promise<{
    totalCurvaA: number;
    rupturasCurvaA: number;
    porcentagem: number;
  }>;
}
