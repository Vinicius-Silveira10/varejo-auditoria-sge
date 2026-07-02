import { GetKpisDashboardUseCase } from './get-kpis-dashboard.use-case';
import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';

describe('GetKpisDashboardUseCase', () => {
  let useCase: GetKpisDashboardUseCase;
  let mockCountRepo: jest.Mocked<IInventoryCountRepository>;
  let mockAdjustmentRepo: jest.Mocked<IAdjustmentRepository>;

  beforeEach(() => {
    mockCountRepo = {
      aggregateAccuracyMetrics: jest.fn().mockResolvedValue({
        totalTeorico: 1000,
        totalFisico: 980,
        totalDivergenciaAbsoluta: 20,
        perdaFinanceiraTotal: 150.5,
        totalContagens: 10,
      }),
      countRecounts: jest.fn().mockResolvedValue(3),
      create: jest.fn(),
      findById: jest.fn(),
      updateCount: jest.fn(),
      updateStatus: jest.fn(),
      findAllFinished: jest.fn(),
      findLatestFinishedByProduct: jest.fn(),
    };

    mockAdjustmentRepo = {
      sumFinancialLosses: jest.fn().mockResolvedValue(450.75),
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new GetKpisDashboardUseCase(mockCountRepo, mockAdjustmentRepo);
  });

  it('deve calcular KPIs e acurácia corretamente', async () => {
    const result = await useCase.execute();

    expect(mockCountRepo.aggregateAccuracyMetrics).toHaveBeenCalled();
    expect(mockCountRepo.countRecounts).toHaveBeenCalled();
    expect(mockAdjustmentRepo.sumFinancialLosses).toHaveBeenCalled();

    // acuraciaGeral: 1 - (20 / 1000) = 1 - 0.02 = 98%
    expect(result.acuraciaGeral).toBe(98);
    expect(result.totalRecontagens).toBe(3);
    expect(result.perdasAjustes).toBe(450.75);
  });

  it('deve retornar acuracia 100% se nao houver itens contados', async () => {
    mockCountRepo.aggregateAccuracyMetrics.mockResolvedValue({
      totalTeorico: 0,
      totalFisico: 0,
      totalDivergenciaAbsoluta: 0,
      perdaFinanceiraTotal: 0,
      totalContagens: 0,
    });

    const result = await useCase.execute();
    expect(result.acuraciaGeral).toBe(100);
  });
});
