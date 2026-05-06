import { StartCountUseCase } from './start-count.use-case';
import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

describe('StartCountUseCase', () => {
  let useCase: StartCountUseCase;
  let mockCountRepo: jest.Mocked<IInventoryCountRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    mockCountRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateCount: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockBatchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
      updateInventarioStatus: jest.fn(),
    };
    useCase = new StartCountUseCase(mockCountRepo, mockBatchRepo);
  });

  it('deve iniciar a contagem e bloquear o lote', async () => {
    mockBatchRepo.findById.mockResolvedValue({ id: 1, quantidade: 100, ativo: true, emInventario: false } as any);
    mockCountRepo.create.mockResolvedValue({ id: 10, status: 'PENDENTE' } as any);

    const result = await useCase.execute({ loteId: 1, usuarioId: 2 });

    expect(mockBatchRepo.updateInventarioStatus).toHaveBeenCalledWith(1, true);
    expect(mockCountRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      loteId: 1,
      quantidadeTeorica: 100,
      status: 'PENDENTE',
      usuarioId: 2,
    }));
    expect(result.id).toBe(10);
  });

  it('deve falhar se lote já estiver em inventário', async () => {
    mockBatchRepo.findById.mockResolvedValue({ id: 1, quantidade: 100, ativo: true, emInventario: true } as any);

    await expect(useCase.execute({ loteId: 1, usuarioId: 2 }))
      .rejects.toThrow('Este lote já está sob contagem de inventário.');
  });
});
