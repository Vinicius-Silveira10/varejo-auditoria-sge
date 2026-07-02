import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';

export interface ShrinkageKpiResult {
  perdasAjustes: number;
}

export class GetShrinkageKpiUseCase {
  constructor(private readonly adjustmentRepo: IAdjustmentRepository) {}

  async execute(): Promise<ShrinkageKpiResult> {
    const perdas = await this.adjustmentRepo.sumFinancialLosses();
    return {
      perdasAjustes: Number(perdas.toFixed(2)),
    };
  }
}
