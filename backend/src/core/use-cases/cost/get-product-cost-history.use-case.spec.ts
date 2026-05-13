import { GetProductCostHistoryUseCase } from './get-product-cost-history.use-case';
import { ILogCustoRepository } from '../../interfaces/repositories/i-log-custo.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('GetProductCostHistoryUseCase', () => {
  let useCase: GetProductCostHistoryUseCase;
  let logCustoRepository: jest.Mocked<ILogCustoRepository>;
  let productRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    logCustoRepository = {
      findByProdutoId: jest.fn(),
    } as any;

    productRepository = {
      findById: jest.fn(),
    } as any;

    useCase = new GetProductCostHistoryUseCase(logCustoRepository, productRepository);
  });

  it('deve retornar histórico de custo', async () => {
    productRepository.findById.mockResolvedValue({ id: 1 } as any);
    logCustoRepository.findByProdutoId.mockResolvedValue([{ id: 100, produtoId: 1 }] as any);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(1);
    expect(logCustoRepository.findByProdutoId).toHaveBeenCalledWith(1);
  });

  it('deve lançar erro se o produto não existir', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow('Produto com ID 999 não encontrado');
  });
});
