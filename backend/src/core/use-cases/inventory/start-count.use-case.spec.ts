import { StartCountUseCase } from './start-count.use-case';
import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { ConflictException, DomainException, NotFoundException } from '../../exceptions/domain.exception';

describe('StartCountUseCase', () => {
  let useCase: StartCountUseCase;
  let mockCountRepo: jest.Mocked<IInventoryCountRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockAddressRepo: jest.Mocked<IAddressRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockCountRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateCount: jest.fn(),
      updateStatus: jest.fn(),
      findAllFinished: jest.fn(),
      findLatestFinishedByProduct: jest.fn().mockResolvedValue(null),
    } as any;
    mockBatchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
    } as any;
    mockAddressRepo = {
      bloquear: jest.fn().mockResolvedValue({} as any),
      desbloquear: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      create: jest.fn(),
      disable: jest.fn(),
      updateOcupacao: jest.fn(),
    } as any;
    mockMovementRepo = {
      findByLote: jest.fn().mockResolvedValue([]),
    } as any;
    mockProductRepo = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 10, sku: 'SKU1', curvaAbc: 'A' } as any),
      findAll: jest.fn(),
      create: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      updateCurvaAbc: jest.fn(),
      disable: jest.fn(),
      getRupturesKpi: jest.fn(),
    };

    useCase = new StartCountUseCase(
      mockCountRepo,
      mockBatchRepo,
      mockAddressRepo,
      mockMovementRepo,
      mockProductRepo,
    );
  });

  it('deve iniciar a contagem, bloquear o endereço associado e bloquear o lote', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 100,
      ativo: true,
      emInventario: false,
    } as any);
    mockMovementRepo.findByLote.mockResolvedValue([
      { id: 100, loteId: 1, enderecoDestinoId: 5, criadoEm: new Date() },
    ] as any);
    mockCountRepo.create.mockResolvedValue({
      id: 10,
      status: 'PENDENTE',
    } as any);

    const result = await useCase.execute({ loteId: 1, usuarioId: 2 });

    expect(mockMovementRepo.findByLote).toHaveBeenCalledWith(1);
    expect(mockAddressRepo.bloquear).toHaveBeenCalledWith(5);
    expect(mockBatchRepo.updateInventarioStatus).toHaveBeenCalledWith(1, true);
    expect(mockCountRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        loteId: 1,
        quantidadeTeorica: 100,
        status: 'PENDENTE',
        usuarioId: 2,
      }),
    );
    expect(result.id).toBe(10);
  });

  it('deve falhar se lote já estiver em inventário', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 100,
      ativo: true,
      emInventario: true,
    } as any);

    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toBeInstanceOf(ConflictException);
    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toThrow(
      'Este lote já está sob contagem de inventário.',
    );
  });

  it('deve barrar contagem de produto classe B se o inventário anterior tiver menos de 15 dias', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 100,
      ativo: true,
      emInventario: false,
    } as any);
    mockProductRepo.findById.mockResolvedValue({
      id: 10,
      sku: 'SKU1',
      curvaAbc: 'B',
    } as any);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    mockCountRepo.findLatestFinishedByProduct.mockResolvedValue({
      id: 9,
      criadoEm: tenDaysAgo,
    } as any);

    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toThrow(
      'RN-INV-004: Frequência de inventário para produtos de classe B não respeitada (mínimo 15 dias).',
    );
  });

  it('deve permitir contagem de produto classe B se o inventário anterior tiver mais de 15 dias', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 100,
      ativo: true,
      emInventario: false,
    } as any);
    mockProductRepo.findById.mockResolvedValue({
      id: 10,
      sku: 'SKU1',
      curvaAbc: 'B',
    } as any);

    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    mockCountRepo.findLatestFinishedByProduct.mockResolvedValue({
      id: 9,
      criadoEm: twentyDaysAgo,
    } as any);
    mockCountRepo.create.mockResolvedValue({ id: 10 } as any);

    const result = await useCase.execute({ loteId: 1, usuarioId: 2 });
    expect(result.id).toBe(10);
  });

  it('deve falhar se lote não existir', async () => {
    mockBatchRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ loteId: 99, usuarioId: 2 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCase.execute({ loteId: 99, usuarioId: 2 })).rejects.toThrow('Lote não encontrado.');
  });

  it('deve falhar se lote estiver desativado', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      id: 1,
      ativo: false,
    } as any);
    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toThrow('Não é possível iniciar inventário de um lote desativado.');
  });

  it('deve falhar se produto não existir', async () => {
    mockBatchRepo.findById.mockResolvedValue({
      id: 1,
      produtoId: 10,
      quantidade: 100,
      ativo: true,
      emInventario: false,
    } as any);
    mockProductRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCase.execute({ loteId: 1, usuarioId: 2 })).rejects.toThrow('Produto não encontrado.');
  });
});
