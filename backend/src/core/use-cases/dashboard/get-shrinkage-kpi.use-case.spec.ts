import { GetShrinkageKpiUseCase } from './get-shrinkage-kpi.use-case';
import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';

describe('GetShrinkageKpiUseCase', () => {
  let useCase: GetShrinkageKpiUseCase;
  let mockAdjustmentRepo: jest.Mocked<IAdjustmentRepository>;

  beforeEach(() => {
    mockAdjustmentRepo = {
      sumFinancialLosses: jest.fn().mockResolvedValue(152.4),
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new GetShrinkageKpiUseCase(mockAdjustmentRepo);
  });

  it('deve retornar as perdas financeiras consolidadas de shrinkage', async () => {
    const result = await useCase.execute();

    expect(mockAdjustmentRepo.sumFinancialLosses).toHaveBeenCalled();
    expect(result).toEqual({
      perdasAjustes: 152.4,
    });
  });
});
