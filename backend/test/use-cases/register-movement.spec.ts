import { RegisterMovementUseCase } from '../../src/core/use-cases/movement/register-movement.use-case';
import { IBatchRepository } from '../../src/core/interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../src/core/interfaces/repositories/i-movement.repository';
import { IUnitOfWork } from '../../src/core/interfaces/repositories/i-unit-of-work';
import { Movimentacao, Lote } from '@prisma/client';

describe('RegisterMovementUseCase (@code.assure.elite)', () => {
  let useCase: RegisterMovementUseCase;
  let mockBatchRepository: jest.Mocked<IBatchRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockAddressRepository: any;
  let mockProductRepository: any;
  let mockUnitOfWork: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockBatchRepository = {
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
    } as any;
    mockMovementRepository = {
      create: jest.fn(),
      findByLote: jest.fn(),
    } as any;
    mockAddressRepository = {
      findById: jest.fn(),
    };
    mockProductRepository = {
      findById: jest.fn(),
    };
    mockUnitOfWork = {
      execute: jest.fn().mockImplementation(async (callback) => {
        return await callback({
          loteRepository: mockBatchRepository,
          movementRepository: mockMovementRepository,
          addressRepository: mockAddressRepository,
          produtoRepository: mockProductRepository,
        });
      }),
    } as any;

    useCase = new RegisterMovementUseCase(
      mockBatchRepository,
      mockMovementRepository,
      mockAddressRepository,
      mockProductRepository,
      mockUnitOfWork,
    );
  });

  it('deve bloquear a saída se o saldo for negativo (RN-TRV-002)', async () => {
    const mockLote: Lote = {
      id: 1,
      numeroLote: 'L01',
      produtoId: 1,
      quantidade: 5,
      validade: new Date('2026-12-31'),
      ativo: true,
    } as any;

    const movData: Omit<Movimentacao, 'id' | 'criadoEm'> = {
      tipo: 'SAIDA',
      loteId: 1,
      quantidade: 10,
      motivo: 'Venda',
      enderecoOrigemId: 1,
      enderecoDestinoId: null,
      usuarioId: 1,
    } as any;

    mockBatchRepository.findById.mockResolvedValue(mockLote);

    await expect(useCase.execute(movData)).rejects.toThrow(
      'RN-TRV-002: Saldo insuficiente para a movimentação.',
    );
  });

  it('deve bloquear a expedição se violar política FEFO (RN-EXP-001)', async () => {
    const mockLoteSelecionado: Lote = {
      id: 2,
      numeroLote: 'L02',
      produtoId: 1,
      quantidade: 10,
      validade: new Date('2026-12-31'),
      ativo: true,
    } as any;

    const mockLoteMaisAntigo: Lote = {
      id: 1,
      numeroLote: 'L01',
      produtoId: 1,
      quantidade: 5,
      validade: new Date('2026-10-31'), // Mais próximo de vencer
      ativo: true,
    } as any;

    const movData: Omit<Movimentacao, 'id' | 'criadoEm'> = {
      tipo: 'EXPEDICAO',
      loteId: 2,
      quantidade: 5,
      motivo: 'Venda',
      enderecoOrigemId: 1,
      enderecoDestinoId: null,
      usuarioId: 1,
    } as any;

    mockBatchRepository.findById.mockResolvedValue(mockLoteSelecionado);
    mockBatchRepository.findAvailableByProduct.mockResolvedValue([
      mockLoteSelecionado,
      mockLoteMaisAntigo,
    ]);

    await expect(useCase.execute(movData)).rejects.toThrow(
      'RN-EXP-001: Violação de FEFO. Existe um lote com validade mais próxima a expirar.',
    );
  });
});
