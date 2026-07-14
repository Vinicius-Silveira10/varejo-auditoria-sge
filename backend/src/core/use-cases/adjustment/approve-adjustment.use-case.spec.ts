import { ApproveAdjustmentUseCase } from './approve-adjustment.use-case';
import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException, ConflictException } from '../../exceptions/domain.exception';

describe('ApproveAdjustmentUseCase', () => {
  let useCase: ApproveAdjustmentUseCase;
  let mockAdjRepo: jest.Mocked<IAdjustmentRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;
  let mockUnitOfWork: jest.Mocked<IUnitOfWork>;
  let mockLockForUpdate: jest.Mock;

  beforeEach(() => {
    mockAdjRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn().mockImplementation((id, status) => ({ id, statusAprovacao: status })),
      sumFinancialLosses: jest.fn(),
    };
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
    mockMovementRepo = {
      create: jest.fn(),
      findMovementsByBatch: jest.fn(),
      findMovementsByAddress: jest.fn(),
      findMovementsByType: jest.fn(),
    };
    mockLockForUpdate = jest.fn();
    mockUnitOfWork = {
      execute: jest.fn().mockImplementation(async (callback) => {
        return await callback({
          adjustmentRepository: mockAdjRepo,
          loteRepository: mockBatchRepo,
          produtoRepository: mockProductRepo,
          movementRepository: mockMovementRepo,
          lockForUpdate: mockLockForUpdate,
        });
      }),
    };
    useCase = new ApproveAdjustmentUseCase(
      mockAdjRepo,
      mockBatchRepo,
      mockProductRepo,
      mockMovementRepo,
      mockUnitOfWork,
    );
  });

  it('deve reprovar ajuste e criar movimento de rejeição', async () => {
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: 5,
      motivo: 'Sobra',
    } as any);

    const result = await useCase.execute({
      ajusteId: 1,
      aprovadorId: 3,
      aprovadorRole: 'GESTOR',
      aprovado: false,
    });

    expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'REJEITADO', 3);
    expect(mockBatchRepo.updateQuantidade).not.toHaveBeenCalled();
    expect(mockMovementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'AJUSTE_REJEITADO',
        loteId: 10,
        quantidade: 5,
        motivo: 'Sobra',
        usuarioId: 3,
      })
    );
    expect(result.statusAprovacao).toBe('REJEITADO');
  });

  it('deve aprovar ajuste abaixo do limite sendo GESTOR e criar movimento', async () => {
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: 5,
      valorDelta: 50,
      motivo: 'Sobra',
    });
    mockBatchRepo.findById.mockResolvedValue({
      id: 10,
      produtoId: 20,
      quantidade: 1000,
    } as any); // Delta% = 0.5%
    mockProductRepo.findById.mockResolvedValue({ id: 20, custoMedio: 10.0 } as any);
    mockProductRepo.findById.mockResolvedValue({ id: 20, custoMedio: 10.0 } as any);

    await useCase.execute({
      ajusteId: 1,
      aprovadorId: 3,
      aprovadorRole: 'GESTOR',
      aprovado: true,
    });

    // Validação estrita da prevenção de deadlock (ADR-005): Lock de Lote no topo
    expect(mockLockForUpdate).toHaveBeenCalledWith('Lote', 10);

    // Validação da ORDEM ESTRITA: O lock deve ocorrer ANTES de qualquer update ou insert no BD
    const lockOrder = mockLockForUpdate.mock.invocationCallOrder[0];
    const updateLoteOrder = mockBatchRepo.updateQuantidade.mock.invocationCallOrder[0];
    const createMovOrder = mockMovementRepo.create.mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(updateLoteOrder);
    expect(updateLoteOrder).toBeLessThan(createMovOrder);

    expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1005);
    expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3);
    expect(mockMovementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'AJUSTE',
        loteId: 10,
        quantidade: 5,
        motivo: 'Sobra',
        usuarioId: 3,
      })
    );
  });

  it('deve falhar ao aprovar ajuste acima do limite sendo GESTOR (RN-AJU-004)', async () => {
    // Delta de 30 (3% de 1000, logo > 2%)
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: 30,
      valorDelta: 300,
      motivo: 'Avaria',
    });
    mockBatchRepo.findById.mockResolvedValue({
      id: 10,
      produtoId: 20,
      quantidade: 1000,
    } as any);
    mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

    await expect(
      useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      }),
    ).rejects.toBeInstanceOf(DomainException);
    await expect(
      useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      }),
    ).rejects.toThrow(
      'RN-AJU-004: Ajustes acima de 2% ou R$ 1000 exigem aprovação de Controladoria/ADMIN.',
    );
  });

  it('deve aprovar ajuste acima do limite sendo ADMIN', async () => {
    // Delta valor = 2000 (> 1000)
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: 1,
      valorDelta: 2000,
      motivo: 'Roubo',
    });
    mockBatchRepo.findById.mockResolvedValue({
      id: 10,
      produtoId: 20,
      quantidade: 1000,
    } as any);
    mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);


    await useCase.execute({
      ajusteId: 1,
      aprovadorId: 9,
      aprovadorRole: 'ADMIN',
      aprovado: true,
    });

    expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1001);
    expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 9);
  });

  it('deve bloquear aprovação pelo próprio solicitante (RN-REL-004 SoD)', async () => {
    // Solicitante e aprovador são a MESMA PESSOA (userId = 5)
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 5,
      loteId: 10,
      quantidadeDelta: 2,
      valorDelta: 20,
      motivo: 'Sobra',
    });

    await expect(
      useCase.execute({
        ajusteId: 1,
        aprovadorId: 5,
        aprovadorRole: 'ADMIN',
        aprovado: true,
      }),
    ).rejects.toBeInstanceOf(DomainException);
    await expect(
      useCase.execute({
        ajusteId: 1,
        aprovadorId: 5,
        aprovadorRole: 'ADMIN',
        aprovado: true,
      }),
    ).rejects.toThrow('RN-REL-004');

    expect(mockAdjRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('deve falhar se o lote estiver em inventário (RN-INV-006)', async () => {
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
    } as any);
    mockBatchRepo.findById.mockResolvedValue({
      id: 10,
      emInventario: true,
    } as any);

    await expect(
      useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      }),
    ).rejects.toBeInstanceOf(DomainException);
    await expect(
      useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      }),
    ).rejects.toThrow('RN-INV-006');
  });

  // =====================================================================
  // RN-AJU-005 / RN-CST-002: Ajustes NÃO alteram o Custo Médio Ponderado
  // =====================================================================

  it('NÃO deve alterar o custo médio ao aprovar ajuste POSITIVO (RN-AJU-005)', async () => {
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: 50, // Ajuste positivo
      valorDelta: 500,
      motivo: 'Sobra encontrada na contagem',
    });
    mockBatchRepo.findById.mockResolvedValue({
      id: 10,
      produtoId: 20,
      quantidade: 1000,
    } as any);
    mockProductRepo.findById.mockResolvedValue({
      id: 20,
      custoMedio: 15.50,
    } as any);


    await useCase.execute({
      ajusteId: 1,
      aprovadorId: 3,
      aprovadorRole: 'ADMIN',
      aprovado: true,
    });

    // O custo médio do produto NÃO deve ter sido alterado
    expect(mockProductRepo.updateCustoMedio).not.toHaveBeenCalled();

    // O saldo DO lote deve ter sido atualizado normalmente
    expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1050);
    expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3);
  });

  it('NÃO deve alterar o custo médio ao aprovar ajuste NEGATIVO (RN-AJU-005)', async () => {
    mockAdjRepo.findById.mockResolvedValue({
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: -20, // Ajuste negativo
      valorDelta: -200,
      motivo: 'Perda por avaria',
    });
    mockBatchRepo.findById.mockResolvedValue({
      id: 10,
      produtoId: 20,
      quantidade: 1000,
    } as any);
    mockProductRepo.findById.mockResolvedValue({
      id: 20,
      custoMedio: 15.50,
    } as any);


    await useCase.execute({
      ajusteId: 1,
      aprovadorId: 3,
      aprovadorRole: 'ADMIN',
      aprovado: true,
    });

    // O custo médio do produto NÃO deve ter sido alterado
    expect(mockProductRepo.updateCustoMedio).not.toHaveBeenCalled();

    // O saldo deve refletir a redução
    expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 980);
    expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3);
  });
});
