import { GetInventoryAccuracyUseCase } from './get-inventory-accuracy.use-case';
import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';

describe('GetInventoryAccuracyUseCase', () => {
  let useCase: GetInventoryAccuracyUseCase;
  let mockInventoryRepo: jest.Mocked<IInventoryCountRepository>;

  beforeEach(() => {
    mockInventoryRepo = {
      aggregateAccuracyMetrics: jest.fn(),
    } as any;
    useCase = new GetInventoryAccuracyUseCase(mockInventoryRepo);
  });

  it('deve calcular acurácia 100% quando físico e teórico batem', async () => {
    mockInventoryRepo.aggregateAccuracyMetrics.mockResolvedValue({
      totalContagens: 1,
      totalTeorico: 100,
      totalFisico: 100,
      totalDivergenciaAbsoluta: 0,
      perdaFinanceiraTotal: 0,
    });

    const result = await useCase.execute();

    expect(result.acuraciaPercentual).toBe(100);
    expect(result.perdaFinanceiraTotal).toBe(0);
  });

  it('deve calcular acurácia e perda corretamente em caso de divergência', async () => {
    mockInventoryRepo.aggregateAccuracyMetrics.mockResolvedValue({
      totalContagens: 2,
      totalTeorico: 150,
      totalFisico: 145,
      totalDivergenciaAbsoluta: 15,
      perdaFinanceiraTotal: 0, // 10*10 (perda) + (-5)*20 (sobra) = 100 - 100 = 0
    });

    const result = await useCase.execute();

    // Divergência absoluta total = 10 + 5 = 15
    // Total Teórico = 100 + 50 = 150
    // Acurácia = (1 - (15 / 150)) * 100 = 90%
    expect(result.acuraciaPercentual).toBe(90);
    
    // Perda Financeira Líquida = (100 - 90)*10 + (50 - 55)*20 = 100 - 100 = 0? 
    // Geralmente se reporta a perda absoluta para ser conservador, ou a líquida. 
    // Vamos usar a líquida para balanço financeiro.
    expect(result.perdaFinanceiraTotal).toBe(0);
  });

  it('deve retornar 100% se não houver contagens', async () => {
    mockInventoryRepo.aggregateAccuracyMetrics.mockResolvedValue({
      totalContagens: 0,
      totalTeorico: 0,
      totalFisico: 0,
      totalDivergenciaAbsoluta: 0,
      perdaFinanceiraTotal: 0,
    });
    const result = await useCase.execute();
    expect(result.acuraciaPercentual).toBe(100);
  });
});
