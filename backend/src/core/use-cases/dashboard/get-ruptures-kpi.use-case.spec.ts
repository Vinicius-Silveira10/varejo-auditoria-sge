import { GetRupturesKpiUseCase } from './get-ruptures-kpi.use-case';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('GetRupturesKpiUseCase', () => {
  let useCase: GetRupturesKpiUseCase;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockProductRepo = {
      getRupturesKpi: jest.fn().mockResolvedValue({
        totalCurvaA: 10,
        rupturasCurvaA: 2,
        porcentagem: 20,
      }),
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      updateCurvaAbc: jest.fn(),
      disable: jest.fn(),
      findAll: jest.fn(),
    };

    useCase = new GetRupturesKpiUseCase(mockProductRepo);
  });

  it('deve retornar a acurácia de ruptura da curva A com sucesso', async () => {
    const result = await useCase.execute();

    expect(mockProductRepo.getRupturesKpi).toHaveBeenCalled();
    expect(result).toEqual({
      totalCurvaA: 10,
      rupturasCurvaA: 2,
      porcentagem: 20,
    });
  });
});
