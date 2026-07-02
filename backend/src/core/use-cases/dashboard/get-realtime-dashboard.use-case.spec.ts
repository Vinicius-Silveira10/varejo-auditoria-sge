import { GetRealtimeDashboardUseCase } from './get-realtime-dashboard.use-case';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

describe('GetRealtimeDashboardUseCase', () => {
  let useCase: GetRealtimeDashboardUseCase;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;

  beforeEach(() => {
    mockMovementRepo = {
      countAll: jest.fn().mockResolvedValue(125),
      create: jest.fn(),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      executeMovementTransaction: jest.fn(),
      getMovementQuantitiesByProduct: jest.fn(),
      purgeBefore: jest.fn(),
    };

    mockOrderRepo = {
      countPendingPicking: jest.fn().mockResolvedValue(8),
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateConferentes: jest.fn(),
      findAll: jest.fn(),
      updateItemSeparado: jest.fn(),
    };

    useCase = new GetRealtimeDashboardUseCase(mockMovementRepo, mockOrderRepo);
  });

  it('deve retornar contagem de movimentacoes e picking pendente com sucesso', async () => {
    const result = await useCase.execute();

    expect(mockMovementRepo.countAll).toHaveBeenCalled();
    expect(mockOrderRepo.countPendingPicking).toHaveBeenCalled();

    expect(result.totalMovimentacoes).toBe(125);
    expect(result.pickingPendente).toBe(8);
  });
});
