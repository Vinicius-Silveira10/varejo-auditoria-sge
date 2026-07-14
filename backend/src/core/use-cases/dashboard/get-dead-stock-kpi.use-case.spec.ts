import { GetDeadStockKpiUseCase } from './get-dead-stock-kpi.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

describe('GetDeadStockKpiUseCase', () => {
  let useCase: GetDeadStockKpiUseCase;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    mockBatchRepo = {
      getDeadStockKpi: jest.fn().mockResolvedValue({
        totalAtivos: 50,
        parados90Dias: 5,
        porcentagem: 10,
      }),
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      findActiveWithBalance: jest.fn(),
      updateQuantidade: jest.fn(),
      updateQuantidadeDelta: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
      findExpiring: jest.fn(),
    };

    useCase = new GetDeadStockKpiUseCase(mockBatchRepo);
  });

  it('deve retornar a porcentagem de dead-stock com sucesso', async () => {
    const result = await useCase.execute();

    expect(mockBatchRepo.getDeadStockKpi).toHaveBeenCalled();
    expect(result).toEqual({
      totalAtivos: 50,
      parados90Dias: 5,
      porcentagem: 10,
    });
  });
});
