import { UpdateAverageCostUseCase } from './update-average-cost.use-case';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { ILogCustoRepository } from '../../interfaces/repositories/i-log-custo.repository';

describe('UpdateAverageCostUseCase', () => {
  let useCase: UpdateAverageCostUseCase;
  let productRepo: jest.Mocked<IProductRepository>;
  let batchRepo: jest.Mocked<IBatchRepository>;
  let logCustoRepo: jest.Mocked<ILogCustoRepository>;

  beforeEach(() => {
    productRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };
    batchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
    };
    logCustoRepo = {
      create: jest.fn(),
      findByProdutoId: jest.fn(),
    };

    useCase = new UpdateAverageCostUseCase(productRepo, batchRepo, logCustoRepo);
  });

  it('deve calcular o custo médio corretamente (cenário com saldo anterior)', async () => {
    productRepo.findById.mockResolvedValue({
      id: 1,
      sku: 'PROD-01',
      descricao: 'Produto 01',
      categoria: 'CAT',
      perecivel: false,
      custoMedio: 10.0,
      ativo: true,
    });

    // 2 lotes com total de 50 unidades
    batchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 1, numeroLote: 'L1', produtoId: 1, quantidade: 20, validade: null, ativo: true },
      { id: 2, numeroLote: 'L2', produtoId: 1, quantidade: 30, validade: null, ativo: true },
    ]);

    productRepo.updateCustoMedio.mockResolvedValue({
      id: 1,
      sku: 'PROD-01',
      descricao: 'Produto 01',
      categoria: 'CAT',
      perecivel: false,
      custoMedio: 12.0, // (10*50 + 17*20) / 70 = (500 + 340)/70 = 12
      ativo: true,
    });

    logCustoRepo.create.mockResolvedValue({
      id: 1,
      produtoId: 1,
      custoAnterior: 10.0,
      custoNovo: 12.0,
      quantidadeAnterior: 50,
      quantidadeNova: 70,
    });

    const result = await useCase.execute({
      produtoId: 1,
      quantidadeEntrada: 20,
      custoEntrada: 17.0, // (50 * 10 + 20 * 17) / 70 = 840 / 70 = 12
    });

    expect(productRepo.updateCustoMedio).toHaveBeenCalledWith(1, 12.0);
    expect(logCustoRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      custoAnterior: 10.0,
      custoNovo: 12.0,
      quantidadeAnterior: 50,
      quantidadeNova: 70,
    }));
    expect(result.log.custoNovo).toBe(12.0);
  });

  it('deve adotar o custo de entrada se o saldo anterior for zero', async () => {
    productRepo.findById.mockResolvedValue({
      id: 1,
      sku: 'PROD-01',
      descricao: 'Produto 01',
      categoria: 'CAT',
      perecivel: false,
      custoMedio: 0.0,
      ativo: true,
    });

    batchRepo.findAvailableByProduct.mockResolvedValue([]); // Zero lotes ativos (quantidade 0)

    productRepo.updateCustoMedio.mockResolvedValue({
      id: 1,
      sku: 'PROD-01',
      descricao: 'Produto 01',
      categoria: 'CAT',
      perecivel: false,
      custoMedio: 15.5,
      ativo: true,
    });

    logCustoRepo.create.mockResolvedValue({} as any);

    await useCase.execute({
      produtoId: 1,
      quantidadeEntrada: 10,
      custoEntrada: 15.5,
    });

    expect(productRepo.updateCustoMedio).toHaveBeenCalledWith(1, 15.5);
    expect(logCustoRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      custoAnterior: 0.0,
      custoNovo: 15.5,
      quantidadeAnterior: 0,
      quantidadeNova: 10,
    }));
  });

  it('deve arredondar para 6 casas decimais', async () => {
    productRepo.findById.mockResolvedValue({
      id: 1,
      sku: 'PROD-01',
      descricao: 'Produto 01',
      categoria: 'CAT',
      perecivel: false,
      custoMedio: 10.0,
      ativo: true,
    });

    batchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 1, numeroLote: 'L1', produtoId: 1, quantidade: 3, validade: null, ativo: true },
    ]);

    productRepo.updateCustoMedio.mockResolvedValue({} as any);
    logCustoRepo.create.mockResolvedValue({} as any);

    // Qtd anterior: 3 (Custo 10 = 30)
    // Qtd entrada: 1 (Custo 10.333333)
    // Total = 40.333333 / 4 = 10.08333325...
    await useCase.execute({
      produtoId: 1,
      quantidadeEntrada: 1,
      custoEntrada: 10.333333,
    });

    expect(productRepo.updateCustoMedio).toHaveBeenCalledWith(1, 10.083333);
  });
});
