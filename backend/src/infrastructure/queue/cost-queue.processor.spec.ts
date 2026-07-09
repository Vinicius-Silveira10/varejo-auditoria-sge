import { CostQueueProcessor } from './cost-queue.processor';
import { UpdateAverageCostUseCase } from '../../core/use-cases/cost/update-average-cost.use-case';

describe('CostQueueProcessor', () => {
  let processor: CostQueueProcessor;
  let mockUpdateCostUseCase: jest.Mocked<UpdateAverageCostUseCase>;

  beforeEach(() => {
    mockUpdateCostUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as any;

    processor = new CostQueueProcessor(mockUpdateCostUseCase);
  });

  it('deve processar o job calculate-cost e chamar UpdateAverageCostUseCase', async () => {
    const mockJob = {
      id: 'job-test-1',
      data: {
        produtoId: 1,
        quantidadeEntrada: 50,
        custoEntrada: 12.5,
        motivo: 'Recebimento de Lote L-TEST',
      },
    } as any;

    await processor.handleCostCalculation(mockJob);

    expect(mockUpdateCostUseCase.execute).toHaveBeenCalledWith({
      produtoId: 1,
      quantidadeEntrada: 50,
      custoEntrada: 12.5,
      motivo: 'Recebimento de Lote L-TEST',
    });
  });

  it('deve propagar o erro caso UpdateAverageCostUseCase falhe (para BullMQ marcar como failed)', async () => {
    mockUpdateCostUseCase.execute.mockRejectedValue(
      new Error('Falha ao atualizar custo'),
    );

    const mockJob = {
      id: 'job-fail-1',
      data: {
        produtoId: 99,
        quantidadeEntrada: 10,
        custoEntrada: 5,
        motivo: 'Recebimento L-FAIL',
      },
    } as any;

    await expect(processor.handleCostCalculation(mockJob)).rejects.toThrow(
      'Falha ao atualizar custo',
    );
  });
});
