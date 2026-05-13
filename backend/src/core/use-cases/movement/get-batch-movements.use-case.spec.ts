import { GetBatchMovementsUseCase } from './get-batch-movements.use-case';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

describe('GetBatchMovementsUseCase', () => {
  let useCase: GetBatchMovementsUseCase;
  let movementRepository: jest.Mocked<IMovementRepository>;
  let batchRepository: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    movementRepository = {
      findByLote: jest.fn(),
    } as any;
    
    batchRepository = {
      findById: jest.fn(),
    } as any;

    useCase = new GetBatchMovementsUseCase(movementRepository, batchRepository);
  });

  it('deve retornar movimentações do lote', async () => {
    batchRepository.findById.mockResolvedValue({ id: 1 } as any);
    movementRepository.findByLote.mockResolvedValue([{ id: 10, loteId: 1 }] as any);

    const result = await useCase.execute(1);

    expect(result).toHaveLength(1);
    expect(movementRepository.findByLote).toHaveBeenCalledWith(1);
  });

  it('deve lançar erro se o lote não existir', async () => {
    batchRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow('Lote com ID 999 não encontrado');
  });
});
