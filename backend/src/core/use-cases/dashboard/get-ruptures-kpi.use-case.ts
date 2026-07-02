import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

export interface RupturesKpiResult {
  totalCurvaA: number;
  rupturasCurvaA: number;
  porcentagem: number;
}

export class GetRupturesKpiUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(): Promise<RupturesKpiResult> {
    return this.productRepo.getRupturesKpi();
  }
}
