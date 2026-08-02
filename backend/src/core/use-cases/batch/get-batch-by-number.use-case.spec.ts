import { GetBatchByNumberUseCase } from './get-batch-by-number.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { Lote } from '@prisma/client';

describe('GetBatchByNumberUseCase', () => {
  let useCase: GetBatchByNumberUseCase;
  let batchRepository: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    batchRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
      updateQuantidadeDelta: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
      findExpiring: jest.fn(),
      getDeadStockKpi: jest.fn(),
      findActiveWithBalance: jest.fn(),
      findByNumeroLote: jest.fn(),
    } as any;

    useCase = new GetBatchByNumberUseCase(batchRepository);
  });

  it('should return a batch when it exists', async () => {
    const mockBatch: Lote = {
      id: 1,
      numeroLote: 'L-123',
      produtoId: 10,
      quantidade: 50,
      validade: new Date(),
      ativo: true,
      emInventario: false,
      notaFiscalId: null,
      evidenciaUrl: null,
    };

    batchRepository.findByNumeroLote.mockResolvedValue(mockBatch);

    const result = await useCase.execute('L-123');

    expect(result).toEqual(mockBatch);
    expect(batchRepository.findByNumeroLote).toHaveBeenCalledWith('L-123');
  });

  it('should throw an error when batch is not found', async () => {
    batchRepository.findByNumeroLote.mockResolvedValue(null);

    await expect(useCase.execute('INVALID-LOTE')).rejects.toThrow(
      'Lote com número INVALID-LOTE não encontrado.',
    );
    expect(batchRepository.findByNumeroLote).toHaveBeenCalledWith('INVALID-LOTE');
  });
});
