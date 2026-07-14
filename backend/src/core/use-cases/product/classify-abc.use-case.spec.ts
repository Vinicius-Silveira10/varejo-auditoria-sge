import { ClassifyAbcUseCase } from './classify-abc.use-case';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';

describe('ClassifyAbcUseCase', () => {
  let useCase: ClassifyAbcUseCase;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;

  beforeEach(() => {
    mockProductRepo = {
      findAll: jest.fn(),
      updateCurvaAbc: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
      getRupturesKpi: jest.fn(),
    };
    mockMovementRepo = {
      getMovementQuantitiesByProduct: jest.fn(),
      create: jest.fn(),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      countAll: jest.fn(),
      purgeBefore: jest.fn(),
      findAllocationByLote: jest.fn(),
    };

    useCase = new ClassifyAbcUseCase(mockProductRepo, mockMovementRepo);
  });

  it('deve classificar produtos corretamente nas curvas A, B e C', async () => {
    const mockProducts = [
      {
        id: 1,
        sku: 'P1',
        descricao: 'P1',
        categoria: 'Cat',
        perecivel: false,
        tipoZonaRequerida: 'SECO',
        custoMedio: 10,
        ativo: true,
        curvaAbc: 'C',
      },
      {
        id: 2,
        sku: 'P2',
        descricao: 'P2',
        categoria: 'Cat',
        perecivel: false,
        tipoZonaRequerida: 'SECO',
        custoMedio: 5,
        ativo: true,
        curvaAbc: 'C',
      },
      {
        id: 3,
        sku: 'P3',
        descricao: 'P3',
        categoria: 'Cat',
        perecivel: false,
        tipoZonaRequerida: 'SECO',
        custoMedio: 2,
        ativo: true,
        curvaAbc: 'C',
      },
    ];
    mockProductRepo.findAll.mockResolvedValue(mockProducts);

    // Movimentações:
    // P1: qty = 80 -> value = 80 * 10 = 800
    // P2: qty = 30 -> value = 30 * 5 = 150
    // P3: qty = 25 -> value = 25 * 2 = 50
    // Total = 1000. P1 = 80% (acumulado 80%, limite A). P2 = 15% (acumulado 95%, limite B). P3 = 5% (acumulado 100%, limite C)
    mockMovementRepo.getMovementQuantitiesByProduct.mockResolvedValue([
      { produtoId: 1, quantidadeTotal: 80 },
      { produtoId: 2, quantidadeTotal: 30 },
      { produtoId: 3, quantidadeTotal: 25 },
    ]);

    mockProductRepo.updateCurvaAbc.mockImplementation(async (id, curva) => {
      const p = mockProducts.find((x) => x.id === id);
      return { ...p, curvaAbc: curva } as any;
    });

    const result = await useCase.execute({ dias: 30 });

    expect(mockProductRepo.findAll).toHaveBeenCalled();
    expect(
      mockMovementRepo.getMovementQuantitiesByProduct,
    ).toHaveBeenCalledWith(30);

    expect(mockProductRepo.updateCurvaAbc).toHaveBeenCalledWith(1, 'A');
    expect(mockProductRepo.updateCurvaAbc).toHaveBeenCalledWith(2, 'B');
    expect(mockProductRepo.updateCurvaAbc).toHaveBeenCalledWith(3, 'C');

    const p1 = result.find((r) => r.id === 1);
    const p2 = result.find((r) => r.id === 2);
    const p3 = result.find((r) => r.id === 3);

    expect(p1?.curvaAbc).toBe('A');
    expect(p2?.curvaAbc).toBe('B');
    expect(p3?.curvaAbc).toBe('C');
  });

  it('deve classificar todos como C se não houver nenhuma movimentação', async () => {
    const mockProducts = [
      {
        id: 1,
        sku: 'P1',
        descricao: 'P1',
        categoria: 'Cat',
        perecivel: false,
        tipoZonaRequerida: 'SECO',
        custoMedio: 10,
        ativo: true,
        curvaAbc: 'A',
      },
    ];
    mockProductRepo.findAll.mockResolvedValue(mockProducts);
    mockMovementRepo.getMovementQuantitiesByProduct.mockResolvedValue([]);

    mockProductRepo.updateCurvaAbc.mockImplementation(async (id, curva) => {
      const p = mockProducts.find((x) => x.id === id);
      return { ...p, curvaAbc: curva } as any;
    });

    const result = await useCase.execute({});

    expect(mockProductRepo.updateCurvaAbc).toHaveBeenCalledWith(1, 'C');
    expect(result[0].curvaAbc).toBe('C');
  });
});
