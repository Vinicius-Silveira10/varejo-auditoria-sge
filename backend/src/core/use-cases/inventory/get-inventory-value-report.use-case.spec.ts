import { GetInventoryValueReportUseCase } from './get-inventory-value-report.use-case';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

describe('GetInventoryValueReportUseCase', () => {
  let sut: GetInventoryValueReportUseCase;
  let productRepository: jest.Mocked<IProductRepository>;
  let batchRepository: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    productRepository = {
      findAll: jest.fn(),
    } as any;
    batchRepository = {
      findAvailableByProduct: jest.fn(),
    } as any;
    sut = new GetInventoryValueReportUseCase(productRepository, batchRepository);
  });

  it('deve calcular o valor total do estoque corretamente', async () => {
    productRepository.findAll.mockResolvedValue([
      { id: 1, sku: 'P001', descricao: 'Prod 1', custoMedio: 10.5 },
      { id: 2, sku: 'P002', descricao: 'Prod 2', custoMedio: 20.0 }
    ] as any);

    batchRepository.findAvailableByProduct.mockImplementation(async (id) => {
      if (id === 1) return [{ quantidade: 10 }] as any;
      if (id === 2) return [{ quantidade: 5 }] as any;
      return [];
    });

    const result = await sut.execute();

    expect(result.valorTotalGeral).toBe(205.0); // (10 * 10.5) + (5 * 20.0) = 105 + 100 = 205
    expect(result.itens).toHaveLength(2);
    expect(result.itens[0].valorTotal).toBe(105.0);
    expect(result.itens[1].valorTotal).toBe(100.0);
  });

  it('não deve incluir produtos sem estoque no relatório', async () => {
    productRepository.findAll.mockResolvedValue([
      { id: 1, sku: 'P001', descricao: 'Prod 1', custoMedio: 10.5 }
    ] as any);

    batchRepository.findAvailableByProduct.mockResolvedValue([]);

    const result = await sut.execute();

    expect(result.itens).toHaveLength(0);
    expect(result.valorTotalGeral).toBe(0);
  });
});
