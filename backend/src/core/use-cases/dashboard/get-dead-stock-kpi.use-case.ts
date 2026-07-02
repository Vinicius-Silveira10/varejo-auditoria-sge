import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

export interface DeadStockKpiResult {
  totalAtivos: number;
  parados90Dias: number;
  porcentagem: number;
}

export class GetDeadStockKpiUseCase {
  constructor(private readonly batchRepo: IBatchRepository) {}

  async execute(): Promise<DeadStockKpiResult> {
    return this.batchRepo.getDeadStockKpi();
  }
}
