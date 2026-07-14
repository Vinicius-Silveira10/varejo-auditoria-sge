import { ReceiveBatchUseCase } from './receive-batch.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

describe('ReceiveBatchUseCase', () => {
  let useCase: ReceiveBatchUseCase;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockLogCustoRepo: any;
  let mockNfeRepo: any;
  let mockMovementRepo: any;
  let mockUnitOfWork: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockBatchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      findActiveWithBalance: jest.fn(),
      updateQuantidade: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
      updateQuantidadeDelta: jest.fn(),
      getDeadStockKpi: jest.fn(),
      findExpiring: jest.fn(),
    };
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([]);
    mockProductRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      updateCurvaAbc: jest.fn(),
      disable: jest.fn(),
      findAll: jest.fn(),
      getRupturesKpi: jest.fn(),
    };
    mockLogCustoRepo = {
      create: jest.fn(),
    };
    mockNfeRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockMovementRepo = {
      create: jest.fn(),
    };
    mockUnitOfWork = {
      execute: jest.fn().mockImplementation(async (callback) => {
        return await callback({
          loteRepository: mockBatchRepo,
          produtoRepository: mockProductRepo,
          notaFiscalRepository: mockNfeRepo,
          logCustoRepository: mockLogCustoRepo,
          movementRepository: mockMovementRepo,
          lockForUpdate: jest.fn(),
        });
      }),
    } as any;

    useCase = new ReceiveBatchUseCase(
      mockProductRepo,
      mockNfeRepo,
      mockUnitOfWork,
    );
  });

  it('deve receber um lote e enfileirar o recalculo de custo medio (GAP-009 / RN-CST-001)', async () => {
    const request = {
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 50,
      custoAquisicao: 10,
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'PROD',
      descricao: 'P1',
      categoria: 'C1',
      perecivel: false,
      custoMedio: 5,
      ativo: true,
    };
    const mockCreatedBatch = {
      id: 2,
      ativo: true,
      ...request,
      validade: null,
      criadoEm: new Date(),
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct as any);
    mockBatchRepo.create.mockResolvedValue(mockCreatedBatch as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([mockCreatedBatch as any]);

    const result = await useCase.execute(request);

    expect(mockProductRepo.findById).toHaveBeenCalledWith(1);

    // GAP-009: O custo médio agora é síncrono
    expect(mockProductRepo.updateCustoMedio).toHaveBeenCalledWith(1, 10);
    expect(mockLogCustoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        produtoId: 1,
        custoNovo: 10,
        quantidadeNova: 50,
      })
    );

    expect(mockBatchRepo.create).toHaveBeenCalledWith({
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
      notaFiscalId: null,
      evidenciaUrl: null,
    });
    expect(result).toEqual(mockCreatedBatch);
  });

  it('deve falhar se produto nao existir (RN-BAT-001)', async () => {
    const request = {
      numeroLote: 'L-100',
      produtoId: 99,
      quantidade: 50,
      custoAquisicao: 10,
      usuarioId: 999,
    };
    mockProductRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCase.execute(request)).rejects.toThrow(
      'RN-BAT-001: Produto com ID 99 não encontrado',
    );
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve falhar se produto estiver desativado (RN-BAT-002)', async () => {
    const request = {
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 50,
      custoAquisicao: 10,
      usuarioId: 1,
    };
    const mockProduct = {
      id: 1,
      sku: 'PROD',
      descricao: 'P1',
      categoria: 'C1',
      perecivel: false,
      custoMedio: 5,
      ativo: false,
    };
    mockProductRepo.findById.mockResolvedValue(mockProduct as any);

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(request)).rejects.toThrow(
      'RN-BAT-002: Não é possível receber lote para um produto desativado',
    );
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve falhar se perecível sem validade (RN-REC-003)', async () => {
    const request = {
      numeroLote: 'L-200',
      produtoId: 1,
      quantidade: 30,
      custoAquisicao: 8,
      evidenciaUrl: 'http://foto.jpg',
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'LEITE01',
      descricao: 'Leite',
      categoria: 'Laticínios',
      perecivel: true,
      custoMedio: 5,
      ativo: true,
    };
    mockProductRepo.findById.mockResolvedValue(mockProduct as any);

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(request)).rejects.toThrow(
      'RN-REC-003: Produto perecível exige data de validade obrigatória',
    );
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve falhar se perecível sem evidência fotográfica (RN-REC-003)', async () => {
    const request = {
      numeroLote: 'L-200',
      produtoId: 1,
      quantidade: 30,
      custoAquisicao: 8,
      validade: new Date('2027-01-01'),
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'LEITE01',
      descricao: 'Leite',
      categoria: 'Laticínios',
      perecivel: true,
      custoMedio: 5,
      ativo: true,
    };
    mockProductRepo.findById.mockResolvedValue(mockProduct as any);

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(request)).rejects.toThrow(
      'RN-REC-003: Produto perecível exige foto de evidência obrigatória',
    );
    expect(mockBatchRepo.create).not.toHaveBeenCalled();
  });

  it('deve aceitar perecível com validade e evidência (RN-REC-003)', async () => {
    const request = {
      numeroLote: 'L-200',
      produtoId: 1,
      quantidade: 30,
      custoAquisicao: 8,
      validade: new Date('2027-06-01'),
      evidenciaUrl: 'http://bucket.com/foto.jpg',
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'LEITE01',
      descricao: 'Leite',
      categoria: 'Laticínios',
      perecivel: true,
      custoMedio: 5,
      ativo: true,
    };
    mockProductRepo.findById.mockResolvedValue(mockProduct as any);
    const mockCreatedBatch = {
      id: 5,
      ...request,
      ativo: true,
      criadoEm: new Date(),
      emInventario: false,
      notaFiscalId: null,
    } as any;
    mockBatchRepo.create.mockResolvedValue(mockCreatedBatch);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([mockCreatedBatch as any]);

    const result = await useCase.execute(request);

    expect(result.id).toBe(5);
    expect(mockBatchRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        evidenciaUrl: 'http://bucket.com/foto.jpg',
      }),
    );
    expect(mockProductRepo.updateCustoMedio).toHaveBeenCalledWith(1, 8);
  });

  it('deve falhar se produto não estiver na NF-e vinculada (RN-REC-001)', async () => {
    const request = {
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 10,
      custoAquisicao: 10,
      notaFiscalId: 123,
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'PROD1',
      descricao: 'P1',
      categoria: 'C1',
      perecivel: false,
      custoMedio: 5,
      ativo: true,
    };
    const mockNfe = {
      id: 123,
      status: 'PENDENTE',
      itensNfe: [{ produtoSku: 'PROD_OUTRO', quantidade: 10 }],
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct as any);
    mockNfeRepo.findById.mockResolvedValue(mockNfe);

    await expect(useCase.execute(request)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(request)).rejects.toThrow(
      'RN-REC-001: Produto PROD1 não encontrado na NF-e 123',
    );
  });

  it('deve marcar NF-e como DIVERGENTE se quantidade física divergir do XML (RN-REC-001)', async () => {
    const request = {
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 15,
      custoAquisicao: 10,
      notaFiscalId: 123,
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'PROD1',
      descricao: 'P1',
      categoria: 'C1',
      perecivel: false,
      custoMedio: 5,
      ativo: true,
    };
    const mockNfe = {
      id: 123,
      status: 'PENDENTE',
      itensNfe: [{ produtoSku: 'PROD1', quantidade: 10 }],
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct as any);
    mockNfeRepo.findById.mockResolvedValue(mockNfe);
    mockBatchRepo.create.mockResolvedValue({ id: 1 } as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([{ id: 1, quantidade: 15 } as any]);

    await useCase.execute(request);

    expect(mockNfeRepo.updateStatus).toHaveBeenCalledWith(
      123,
      'DIVERGENTE',
      expect.stringContaining('QUANTIDADE_DIVERGENTE'),
    );
  });

  it('deve marcar NF-e como CONFERIDO se todos os itens forem recebidos sem divergência (RN-REC-001)', async () => {
    const request = {
      numeroLote: 'L-100',
      produtoId: 1,
      quantidade: 10,
      custoAquisicao: 10,
      notaFiscalId: 123,
      usuarioId: 999,
    };
    const mockProduct = {
      id: 1,
      sku: 'PROD1',
      descricao: 'P1',
      categoria: 'C1',
      perecivel: false,
      custoMedio: 5,
      ativo: true,
    };
    const mockNfe = {
      id: 123,
      status: 'PENDENTE',
      itensNfe: [{ produtoSku: 'PROD1', quantidade: 10 }],
    };

    mockProductRepo.findById.mockResolvedValue(mockProduct as any);
    mockNfeRepo.findById.mockResolvedValue(mockNfe);
    mockBatchRepo.create.mockResolvedValue({ id: 1 } as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([{ id: 1, quantidade: 10 } as any]);
    mockBatchRepo.countByNotaFiscal.mockResolvedValue(1);

    await useCase.execute(request);

    expect(mockNfeRepo.updateStatus).toHaveBeenCalledWith(123, 'CONFERIDO');
  });
});
