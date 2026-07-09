import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';

export interface KpisDashboardResult {
  acuraciaGeral: number;
  totalRecontagens: number;
  perdasAjustes: number;
}

export class GetKpisDashboardUseCase {
  constructor(
    private readonly inventoryCountRepo: IInventoryCountRepository,
    private readonly adjustmentRepo: IAdjustmentRepository,
  ) {}

  async execute(): Promise<KpisDashboardResult> {
    const [accuracyMetrics, totalRecontagens, perdasAjustes] =
      await Promise.all([
        this.inventoryCountRepo.aggregateAccuracyMetrics(),
        this.inventoryCountRepo.countRecounts(),
        this.adjustmentRepo.sumFinancialLosses(),
      ]);

    const acuraciaGeral =
      accuracyMetrics.totalTeorico > 0
        ? Math.round(
            (1 -
              accuracyMetrics.totalDivergenciaAbsoluta /
                accuracyMetrics.totalTeorico) *
              100,
          )
        : 100;

    return {
      acuraciaGeral,
      totalRecontagens,
      perdasAjustes: Number(perdasAjustes.toFixed(2)),
    };
  }
}
