import { ReceiveBatchUseCase } from './receive-batch.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { UpdateAverageCostUseCase } from '../cost/update-average-cost.use-case';

describe('ReceiveBatchUseCase', () => {
  let useCase: ReceiveBatchUseCase;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockUpdateCostUseCase: jest.Mocked<UpdateAverageCostUseCase>;

  beforeEach(() => {
    mockBatchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
    };
    mockProductRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };
    mockUpdateCostUseCase = {
      execute: jest.fn(),
    } as any;

    useCase = new ReceiveBatchUseCase(mockBatchRepo, mockProductRepo, mockUpdateCostUseCase);
  });

  it('deve receber um lote e atualizar o custo medio (RN-CST-001)', async () => {
    const request = { numeroLote: 'L-100', produtoId: 1, quantidade: 50, custoAquisicao: 10 };
    const mockProduct = { id: 1, sku: 'PROD', descricao: 'P1', categoria: 'C1', perecivel: false, custoMedio: 5, ativo: true };
    const mockExistingBatches = [
      { id: 1, numeroLote: 'L-099', produtoId: 1, quantidade: 50, validade: null, ativo: true, criadoEm: new Date() }
    ];
    const mockCreatedBatch = { id: 2, ativo: true, ...request, validade: null, criadoEm: new Date() };

    mockProductRepo.findById.mockResolvedValue(mockProduct);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue(mockExistingBatches);
    mockBatchRepo.create.mockResolvedValue(mockCreatedBatch as any);

    // Calculo esperado:
    // Estoque Atual = 50. Custo Medio Antigo = 5.
    // Qtd Recebida = 50. Custo Aquisicao = 10.
    // Novo Custo = ((5 * 50) + (10 * 50)) / 100 = (250 + 500) / 100 = 7.5

    const result = await useCase.execute(request);

    expect(mockProductRepo.findById).toHaveBeenCalledWith(1);
    expect(mockUpdateCostUseCase.execute).toHaveBeenCalledWith({
      produtoId: 1,
      quantidadeEntrada: 50,
      custoEntrada: 10,
      motivo: 'Recebimento de Lote L-100',
    });
    expect(mockBatchRepo.create).toHaveBeenCalledWith({
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
    });
    expect(result).toEqual(mockCreatedBatch);
  });

  it('deve falhar se produto nao existir (RN-BAT-001)', async () => {
    const request = { numeroLote: 'L-100', produtoId: 99, quantidade: 50, custoAquisicao: 10 };
    mockProductRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(request)).rejects.toThrow('RN-BAT-001: Produto com ID 99 não encontrado');
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve falhar se produto estiver desativado (RN-BAT-002)', async () => {
    const request = { numeroLote: 'L-100', produtoId: 1, quantidade: 50, custoAquisicao: 10 };
    const mockProduct = { id: 1, sku: 'PROD', descricao: 'P1', categoria: 'C1', perecivel: false, custoMedio: 5, ativo: false };
    mockProductRepo.findById.mockResolvedValue(mockProduct);

    await expect(useCase.execute(request)).rejects.toThrow('RN-BAT-002: Não é possível receber lote para um produto desativado');
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve falhar se perecível sem validade (RN-REC-003)', async () => {
    const request = { numeroLote: 'L-200', produtoId: 1, quantidade: 30, custoAquisicao: 8 };
    const mockProduct = { id: 1, sku: 'LEITE01', descricao: 'Leite', categoria: 'Laticínios', perecivel: true, custoMedio: 5, ativo: true };
    mockProductRepo.findById.mockResolvedValue(mockProduct);

    await expect(useCase.execute(request)).rejects.toThrow('RN-REC-003');
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve aceitar perecível com validade (RN-REC-003)', async () => {
    const request = { numeroLote: 'L-200', produtoId: 1, quantidade: 30, custoAquisicao: 8, validade: new Date('2027-06-01') };
    const mockProduct = { id: 1, sku: 'LEITE01', descricao: 'Leite', categoria: 'Laticínios', perecivel: true, custoMedio: 5, ativo: true };
    mockProductRepo.findById.mockResolvedValue(mockProduct);
    mockBatchRepo.create.mockResolvedValue({ id: 5 } as any);

    const result = await useCase.execute(request);
    expect(result.id).toBe(5);
  });
});
