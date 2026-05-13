import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';

export interface AccuracyReport {
  totalItensContados: number;
  totalTeorico: number;
  totalFisico: number;
  acuraciaPercentual: number;
  perdaFinanceiraTotal: number;
}

export class GetInventoryAccuracyUseCase {
  constructor(private readonly inventoryRepo: IInventoryCountRepository) {}

  async execute(): Promise<AccuracyReport> {
    const metrics = await this.inventoryRepo.aggregateAccuracyMetrics();

    if (metrics.totalContagens === 0) {
      return {
        totalItensContados: 0,
        totalTeorico: 0,
        totalFisico: 0,
        acuraciaPercentual: 100,
        perdaFinanceiraTotal: 0,
      };
    }

    const acuraciaPercentual = metrics.totalTeorico > 0 
      ? Math.round((1 - (metrics.totalDivergenciaAbsoluta / metrics.totalTeorico)) * 100)
      : 100;

    return {
      totalItensContados: metrics.totalContagens,
      totalTeorico: metrics.totalTeorico,
      totalFisico: metrics.totalFisico,
      acuraciaPercentual,
      perdaFinanceiraTotal: Number(metrics.perdaFinanceiraTotal.toFixed(2)),
    };
  }
}
