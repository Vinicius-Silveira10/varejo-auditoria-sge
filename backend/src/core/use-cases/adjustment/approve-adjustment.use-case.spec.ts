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
      updateStatus: jest.fn().mockImplementation((id, status, aprovadorId, fase) => ({
        id,
        statusAprovacao: status,
        aprovadorId,
        aprovadorGestorId: fase === 'GESTOR' ? aprovadorId : undefined,
        aprovadorControladoriaId: fase === 'CONTROLADORIA' ? aprovadorId : undefined,
      })),
      sumFinancialLosses: jest.fn(),
      findPending: jest.fn(),
    };
    mockBatchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
      updateQuantidadeDelta: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
      getDeadStockKpi: jest.fn(),
      findExpiring: jest.fn(),
      findActiveWithBalance: jest.fn(),
      findByNumeroLote: jest.fn(),
    };
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
    mockMovementRepo = {
      create: jest.fn(),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      countAll: jest.fn(),
      getMovementQuantitiesByProduct: jest.fn(),
      purgeBefore: jest.fn(),
      findAllocationByLote: jest.fn(),
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

  describe('Rejeição de Ajustes', () => {
    it('deve reprovar ajuste e criar movimento de rejeição na Fase 1 (PENDENTE)', async () => {
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
        }),
      );
      expect(result.statusAprovacao).toBe('REJEITADO');
    });

    it('deve reprovar ajuste e criar movimento de rejeição na Fase 2 (PENDENTE_CONTROLADORIA)', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE_CONTROLADORIA',
        solicitanteId: 1,
        aprovadorGestorId: 3,
        loteId: 10,
        quantidadeDelta: 50,
        motivo: 'Divergência',
      } as any);

      const result = await useCase.execute({
        ajusteId: 1,
        aprovadorId: 4,
        aprovadorRole: 'CONTROLADORIA',
        aprovado: false,
      });

      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'REJEITADO', 4);
      expect(mockBatchRepo.updateQuantidade).not.toHaveBeenCalled();
      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'AJUSTE_REJEITADO',
          loteId: 10,
          quantidade: 50,
          motivo: 'Divergência',
          usuarioId: 4,
        }),
      );
      expect(result.statusAprovacao).toBe('REJEITADO');
    });
  });

  describe('Aprovação Simples (Nível GESTOR)', () => {
    it('deve aprovar ajuste abaixo do limite sendo GESTOR e criar movimento', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 1,
        loteId: 10,
        quantidadeDelta: 5,
        valorDelta: 50,
        saldoTeorico: 1000,
        motivo: 'Sobra',
      });
      mockBatchRepo.findById.mockResolvedValue({
        id: 10,
        produtoId: 20,
        quantidade: 1000,
      } as any); // Delta% = 0.5%
      mockProductRepo.findById.mockResolvedValue({ id: 20, custoMedio: 10.0 } as any);

      await useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      });

      // Prevenção de deadlock (ADR-005): Lock de AjusteEstoque no topo, depois Lote
      expect(mockLockForUpdate).toHaveBeenCalledWith('AjusteEstoque', 1);
      expect(mockLockForUpdate).toHaveBeenCalledWith('Lote', 10);

      const lockAjusteOrder = mockLockForUpdate.mock.invocationCallOrder[0];
      const lockLoteOrder = mockLockForUpdate.mock.invocationCallOrder[1];
      const updateLoteOrder = mockBatchRepo.updateQuantidade.mock.invocationCallOrder[0];
      const createMovOrder = mockMovementRepo.create.mock.invocationCallOrder[0];

      expect(lockAjusteOrder).toBeLessThan(lockLoteOrder);
      expect(lockLoteOrder).toBeLessThan(updateLoteOrder);
      expect(updateLoteOrder).toBeLessThan(createMovOrder);

      expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1005);
      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3, 'GESTOR');
      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'AJUSTE',
          loteId: 10,
          quantidade: 5,
          motivo: 'Sobra',
          usuarioId: 3,
        }),
      );
    });

    it('deve falhar se usuário sem papel GESTOR/ADMIN tentar aprovar nível GESTOR', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 1,
        loteId: 10,
        quantidadeDelta: 5,
        valorDelta: 50,
        saldoTeorico: 1000,
        motivo: 'Sobra',
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
          aprovadorRole: 'OPERADOR',
          aprovado: true,
        }),
      ).rejects.toThrow('RN-AJU-004: Aprovador deve ser GESTOR ou superior.');
    });
  });

  describe('RN-AJU-004 — Dupla Aprovação (GESTOR_CONTROLADORIA)', () => {
    const ajusteDuplaAprovacao = {
      id: 1,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      loteId: 10,
      quantidadeDelta: 30, // 3% de 1000 -> > 2%
      valorDelta: 300,
      saldoTeorico: 1000,
      motivo: 'Avaria volumosa',
    };

    it('Fase 1: GESTOR aprova PENDENTE -> PENDENTE_CONTROLADORIA sem alterar lote e sem criar movimentação', async () => {
      mockAdjRepo.findById.mockResolvedValue({ ...ajusteDuplaAprovacao });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      const result = await useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      });

      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'PENDENTE_CONTROLADORIA', 3, 'GESTOR');
      expect(mockBatchRepo.updateQuantidade).not.toHaveBeenCalled();
      expect(mockMovementRepo.create).not.toHaveBeenCalled();
      expect(result.statusAprovacao).toBe('PENDENTE_CONTROLADORIA');
    });

    it('Fase 1: ADMIN aprova PENDENTE -> PENDENTE_CONTROLADORIA sem alterar lote', async () => {
      mockAdjRepo.findById.mockResolvedValue({ ...ajusteDuplaAprovacao });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      const result = await useCase.execute({
        ajusteId: 1,
        aprovadorId: 9,
        aprovadorRole: 'ADMIN',
        aprovado: true,
      });

      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'PENDENTE_CONTROLADORIA', 9, 'GESTOR');
      expect(mockBatchRepo.updateQuantidade).not.toHaveBeenCalled();
      expect(mockMovementRepo.create).not.toHaveBeenCalled();
      expect(result.statusAprovacao).toBe('PENDENTE_CONTROLADORIA');
    });

    it('Fase 1: deve bloquear papel inválido (CONTROLADORIA ou OPERADOR) na primeira aprovação', async () => {
      mockAdjRepo.findById.mockResolvedValue({ ...ajusteDuplaAprovacao });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      await expect(
        useCase.execute({
          ajusteId: 1,
          aprovadorId: 4,
          aprovadorRole: 'CONTROLADORIA',
          aprovado: true,
        }),
      ).rejects.toThrow('RN-AJU-004: Primeira aprovação deve ser realizada por GESTOR ou ADMIN.');

      await expect(
        useCase.execute({
          ajusteId: 1,
          aprovadorId: 5,
          aprovadorRole: 'OPERADOR',
          aprovado: true,
        }),
      ).rejects.toThrow('RN-AJU-004: Primeira aprovação deve ser realizada por GESTOR ou ADMIN.');
    });

    it('Fase 2: CONTROLADORIA aprova PENDENTE_CONTROLADORIA -> APROVADO alterando lote e gerando movimentação', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        ...ajusteDuplaAprovacao,
        statusAprovacao: 'PENDENTE_CONTROLADORIA',
        aprovadorGestorId: 3,
      });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      const result = await useCase.execute({
        ajusteId: 1,
        aprovadorId: 4,
        aprovadorRole: 'CONTROLADORIA',
        aprovado: true,
      });

      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 4, 'CONTROLADORIA');
      expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1030);
      expect(mockMovementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'AJUSTE',
          loteId: 10,
          quantidade: 30,
          usuarioId: 4,
        }),
      );
      expect(result.statusAprovacao).toBe('APROVADO');
    });

    it('Fase 2: ADMIN aprova PENDENTE_CONTROLADORIA -> APROVADO alterando lote (usuário diferente do gestor)', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        ...ajusteDuplaAprovacao,
        statusAprovacao: 'PENDENTE_CONTROLADORIA',
        aprovadorGestorId: 3,
      });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      const result = await useCase.execute({
        ajusteId: 1,
        aprovadorId: 9,
        aprovadorRole: 'ADMIN',
        aprovado: true,
      });

      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 9, 'CONTROLADORIA');
      expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1030);
      expect(result.statusAprovacao).toBe('APROVADO');
    });

    it('Fase 2: Bloqueio SoD — mesmo usuário NÃO pode realizar a primeira e a segunda aprovação', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        ...ajusteDuplaAprovacao,
        statusAprovacao: 'PENDENTE_CONTROLADORIA',
        aprovadorGestorId: 3,
      });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      // Usuário 3 foi o aprovadorGestorId e tenta fazer a segunda aprovação
      await expect(
        useCase.execute({
          ajusteId: 1,
          aprovadorId: 3,
          aprovadorRole: 'ADMIN',
          aprovado: true,
        }),
      ).rejects.toThrow(
        'RN-REL-004: Segregação de funções violada. O mesmo usuário não pode realizar a primeira e a segunda aprovação.',
      );

      expect(mockBatchRepo.updateQuantidade).not.toHaveBeenCalled();
    });

    it('Fase 2: deve bloquear papel inválido (GESTOR ou OPERADOR) na segunda aprovação', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        ...ajusteDuplaAprovacao,
        statusAprovacao: 'PENDENTE_CONTROLADORIA',
        aprovadorGestorId: 3,
      });
      mockBatchRepo.findById.mockResolvedValue({ id: 10, produtoId: 20, quantidade: 1000 } as any);
      mockProductRepo.findById.mockResolvedValue({ id: 20 } as any);

      await expect(
        useCase.execute({
          ajusteId: 1,
          aprovadorId: 4,
          aprovadorRole: 'GESTOR',
          aprovado: true,
        }),
      ).rejects.toThrow('RN-AJU-004: Segunda aprovação exige papel CONTROLADORIA ou ADMIN.');

      await expect(
        useCase.execute({
          ajusteId: 1,
          aprovadorId: 5,
          aprovadorRole: 'OPERADOR',
          aprovado: true,
        }),
      ).rejects.toThrow('RN-AJU-004: Segunda aprovação exige papel CONTROLADORIA ou ADMIN.');
    });
  });

  describe('Segregação de Funções e Validações Gerais', () => {
    it('deve bloquear aprovação pelo próprio solicitante (RN-REL-004 SoD)', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 5,
        loteId: 10,
        quantidadeDelta: 2,
        valorDelta: 20,
        motivo: 'Sobra',
        saldoTeorico: 100,
      });

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
      ).rejects.toThrow('RN-INV-006');
    });
  });

  describe('RN-AJU-005 / RN-CST-002: Ajustes NÃO alteram o Custo Médio Ponderado', () => {
    it('NÃO deve alterar o custo médio ao aprovar ajuste POSITIVO (RN-AJU-005)', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 1,
        loteId: 10,
        quantidadeDelta: 50, // 0.5% de 10000 -> nível GESTOR
        valorDelta: 500,
        motivo: 'Sobra encontrada na contagem',
        saldoTeorico: 10000,
      });
      mockBatchRepo.findById.mockResolvedValue({
        id: 10,
        produtoId: 20,
        quantidade: 1000,
      } as any);
      mockProductRepo.findById.mockResolvedValue({
        id: 20,
        custoMedio: 15.5,
      } as any);

      await useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      });

      expect(mockProductRepo.updateCustoMedio).not.toHaveBeenCalled();
      expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 1050);
      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3, 'GESTOR');
    });

    it('NÃO deve alterar o custo médio ao aprovar ajuste NEGATIVO (RN-AJU-005)', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 1,
        loteId: 10,
        quantidadeDelta: -20, // 0.2% de 10000 -> nível GESTOR
        valorDelta: -200,
        motivo: 'Perda por avaria',
        saldoTeorico: 10000,
      });
      mockBatchRepo.findById.mockResolvedValue({
        id: 10,
        produtoId: 20,
        quantidade: 1000,
      } as any);
      mockProductRepo.findById.mockResolvedValue({
        id: 20,
        custoMedio: 15.5,
      } as any);

      await useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      });

      expect(mockProductRepo.updateCustoMedio).not.toHaveBeenCalled();
      expect(mockBatchRepo.updateQuantidade).toHaveBeenCalledWith(10, 980);
      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3, 'GESTOR');
    });
  });

  describe('TAREFA 4.1 — TESTE DE REGRESSÃO DO DRIFT DE ALÇADA', () => {
    it('deve aprovar com GESTOR mesmo que o lote atual tenha despencado (fotografia protege contra drift)', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 1,
        statusAprovacao: 'PENDENTE',
        solicitanteId: 2,
        loteId: 10,
        quantidadeDelta: 3,
        valorDelta: 30,
        saldoTeorico: 200, // FOTOGRAFIA: 3/200 = 1.5% -> GESTOR
        motivo: 'Quebra',
      } as any);

      mockBatchRepo.findById.mockResolvedValue({
        id: 10,
        produtoId: 20,
        quantidade: 50,
        emInventario: false,
      } as any);

      mockProductRepo.findById.mockResolvedValue({
        id: 20,
        custoMedio: 10,
      } as any);

      const result = await useCase.execute({
        ajusteId: 1,
        aprovadorId: 3,
        aprovadorRole: 'GESTOR',
        aprovado: true,
      });
      expect(result).toBeDefined();
      expect(mockAdjRepo.updateStatus).toHaveBeenCalledWith(1, 'APROVADO', 3, 'GESTOR');
    });

    it('Cenário inverso: fotografia de GESTOR_CONTROLADORIA impede efetivação direta mesmo que lote atual tenha saldo alto', async () => {
      mockAdjRepo.findById.mockResolvedValue({
        id: 2,
        statusAprovacao: 'PENDENTE_CONTROLADORIA',
        solicitanteId: 2,
        aprovadorGestorId: 3,
        loteId: 10,
        quantidadeDelta: 10,
        valorDelta: 100,
        saldoTeorico: 50, // FOTOGRAFIA: 10/50 = 20% -> GESTOR_CONTROLADORIA
        motivo: 'Quebra',
      } as any);

      mockBatchRepo.findById.mockResolvedValue({
        id: 10,
        produtoId: 20,
        quantidade: 1000, // Saldo atual alto, mas fotografia gravada impera
        emInventario: false,
      } as any);

      mockProductRepo.findById.mockResolvedValue({
        id: 20,
        custoMedio: 10,
      } as any);

      // Na Fase 2, GESTOR NÃO pode aprovar (apenas CONTROLADORIA ou ADMIN)
      await expect(
        useCase.execute({
          ajusteId: 2,
          aprovadorId: 4,
          aprovadorRole: 'GESTOR',
          aprovado: true,
        }),
      ).rejects.toThrow('RN-AJU-004: Segunda aprovação exige papel CONTROLADORIA ou ADMIN.');
    });
  });
});
