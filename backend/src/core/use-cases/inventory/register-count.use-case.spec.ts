import { RegisterCountUseCase } from './register-count.use-case';
import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { RequestAdjustmentUseCase } from '../adjustment/request-adjustment.use-case';

describe('RegisterCountUseCase', () => {
  let useCase: RegisterCountUseCase;
  let mockCountRepo: jest.Mocked<IInventoryCountRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockReqAdjUseCase: jest.Mocked<RequestAdjustmentUseCase>;

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
    mockReqAdjUseCase = {
      execute: jest.fn(),
    } as any;
    useCase = new RegisterCountUseCase(mockCountRepo, mockBatchRepo, mockReqAdjUseCase);
  });

  it('deve concluir a contagem sem divergência e desbloquear lote', async () => {
    mockCountRepo.findById.mockResolvedValue({ id: 1, loteId: 10, quantidadeTeorica: 50, status: 'PENDENTE' } as any);
    mockCountRepo.updateCount.mockResolvedValue({ id: 1, status: 'CONCLUIDO' } as any);

    const result = await useCase.execute({ contagemId: 1, quantidadeFisica: 50, usuarioId: 2 });

    expect(mockReqAdjUseCase.execute).not.toHaveBeenCalled();
    expect(mockCountRepo.updateCount).toHaveBeenCalledWith(1, 50, 'CONCLUIDO');
    expect(mockBatchRepo.updateInventarioStatus).toHaveBeenCalledWith(10, false);
    expect(result.ajusteSugerido).toBeNull();
    expect(result.recontagemExigida).toBe(false);
  });

  it('deve exigir recontagem se Δ > 0,5% e não for recontagem (RN-INV-002)', async () => {
    // Teórico = 200, Físico = 195 => Delta = -5 => |Δ%| = 2.5% > 0.5%
    mockCountRepo.findById.mockResolvedValue({ id: 3, loteId: 20, quantidadeTeorica: 200, status: 'PENDENTE' } as any);
    mockCountRepo.updateCount.mockResolvedValue({ id: 3, status: 'RECONTAGEM' } as any);

    const result = await useCase.execute({ contagemId: 3, quantidadeFisica: 195, usuarioId: 2 });

    expect(result.recontagemExigida).toBe(true);
    expect(mockCountRepo.updateCount).toHaveBeenCalledWith(3, 195, 'RECONTAGEM');
    // Lote NÃO é desbloqueado quando recontagem é exigida
    expect(mockBatchRepo.updateInventarioStatus).not.toHaveBeenCalled();
    // Ajuste NÃO é disparado ainda
    expect(mockReqAdjUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve aceitar divergência > 0,5% se for recontagem confirmada (RN-INV-002)', async () => {
    // Mesma divergência de 2.5%, mas agora é recontagem
    mockCountRepo.findById.mockResolvedValue({ id: 3, loteId: 20, quantidadeTeorica: 200, status: 'PENDENTE' } as any);
    mockCountRepo.updateCount.mockResolvedValue({ id: 3, status: 'DIVERGENTE' } as any);
    mockReqAdjUseCase.execute.mockResolvedValue({ ajuste: { id: 99 }, nivelAprovacaoExigido: 'GESTOR' } as any);

    const result = await useCase.execute({ contagemId: 3, quantidadeFisica: 195, usuarioId: 2, isRecontagem: true });

    expect(result.recontagemExigida).toBe(false);
    expect(mockCountRepo.updateCount).toHaveBeenCalledWith(3, 195, 'DIVERGENTE');
    expect(mockBatchRepo.updateInventarioStatus).toHaveBeenCalledWith(20, false);
    expect(mockReqAdjUseCase.execute).toHaveBeenCalled();
  });

  it('deve registrar divergência pequena (≤ 0,5%) sem exigir recontagem', async () => {
    // Teórico = 1000, Físico = 997 => Delta = -3 => |Δ%| = 0.3% ≤ 0.5%
    mockCountRepo.findById.mockResolvedValue({ id: 4, loteId: 30, quantidadeTeorica: 1000, status: 'PENDENTE' } as any);
    mockCountRepo.updateCount.mockResolvedValue({ id: 4, status: 'DIVERGENTE' } as any);
    mockReqAdjUseCase.execute.mockResolvedValue({ ajuste: { id: 50 } } as any);

    const result = await useCase.execute({ contagemId: 4, quantidadeFisica: 997, usuarioId: 2 });

    expect(result.recontagemExigida).toBe(false);
    expect(mockCountRepo.updateCount).toHaveBeenCalledWith(4, 997, 'DIVERGENTE');
    expect(mockBatchRepo.updateInventarioStatus).toHaveBeenCalledWith(30, false);
    expect(mockReqAdjUseCase.execute).toHaveBeenCalled();
  });
});
