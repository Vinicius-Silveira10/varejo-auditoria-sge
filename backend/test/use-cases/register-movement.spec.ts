import { RegisterMovementUseCase } from '../../src/core/use-cases/movement/register-movement.use-case';
import { IBatchRepository } from '../../src/core/interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../src/core/interfaces/repositories/i-movement.repository';
import { Movimentacao, Lote } from '@prisma/client';

describe('RegisterMovementUseCase (@code.assure.elite)', () => {
  let useCase: RegisterMovementUseCase;
  let mockBatchRepository: jest.Mocked<IBatchRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;

  beforeEach(() => {
    mockBatchRepository = {
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
    };
    mockMovementRepository = {
      create: jest.fn(),
      findByLote: jest.fn(),
    };

    useCase = new RegisterMovementUseCase(mockBatchRepository, mockMovementRepository);
  });

  it('deve bloquear a saída se o saldo for negativo (RN-TRV-002)', async () => {
    const mockLote: Lote = {
      id: 1,
      numeroLote: 'L01',
      produtoId: 1,
      quantidade: 5,
      validade: new Date('2026-12-31'),
      ativo: true,
    };

    const movData: Omit<Movimentacao, 'id' | 'criadoEm'> = {
      tipo: 'SAIDA',
      loteId: 1,
      quantidade: 10,
      motivo: 'Venda',
      enderecoOrigemId: 1,
      enderecoDestinoId: null,
      usuarioId: 1,
    };

    mockBatchRepository.findById.mockResolvedValue(mockLote);

    await expect(useCase.execute(movData)).rejects.toThrow('RN-TRV-002: Saldo insuficiente para a movimentação.');
  });
  
  it('deve bloquear a expedição se violar política FEFO (RN-EXP-001)', async () => {
    const mockLoteSelecionado: Lote = {
      id: 2,
      numeroLote: 'L02',
      produtoId: 1,
      quantidade: 10,
      validade: new Date('2026-12-31'),
      ativo: true,
    };

    const mockLoteMaisAntigo: Lote = {
      id: 1,
      numeroLote: 'L01',
      produtoId: 1,
      quantidade: 5,
      validade: new Date('2026-10-31'), // Mais próximo de vencer
      ativo: true,
    };

    const movData: Omit<Movimentacao, 'id' | 'criadoEm'> = {
      tipo: 'SAIDA',
      loteId: 2,
      quantidade: 5,
      motivo: 'Venda',
      enderecoOrigemId: 1,
      enderecoDestinoId: null,
      usuarioId: 1,
    };

    mockBatchRepository.findById.mockResolvedValue(mockLoteSelecionado);
    mockBatchRepository.findAvailableByProduct.mockResolvedValue([mockLoteSelecionado, mockLoteMaisAntigo]);

    await expect(useCase.execute(movData)).rejects.toThrow('RN-EXP-001: Violação de FEFO. Existe um lote com validade mais próxima a expirar.');
  });
});
