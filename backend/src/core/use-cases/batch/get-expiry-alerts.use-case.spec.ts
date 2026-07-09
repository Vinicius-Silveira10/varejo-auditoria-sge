import { GetExpiryAlertsUseCase } from './get-expiry-alerts.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

describe('GetExpiryAlertsUseCase', () => {
  let sut: GetExpiryAlertsUseCase;
  let batchRepository: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    batchRepository = {
      findExpiring: jest.fn(),
    } as any;
    sut = new GetExpiryAlertsUseCase(batchRepository);
  });

  it('deve retornar alertas de lotes próximos ao vencimento', async () => {
    const mockBatches = [
      {
        id: 1,
        numeroLote: 'L001',
        quantidade: 100,
        validade: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000), // 10 dias
        produto: { sku: 'PROD1', descricao: 'Produto 1' },
      },
    ];

    batchRepository.findExpiring.mockResolvedValue(mockBatches as any);

    const result = await sut.execute(30);

    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('PROD1');
    expect(result[0].diasParaVencer).toBe(10);
    expect(batchRepository.findExpiring).toHaveBeenCalledWith(30);
  });

  it('deve retornar lista vazia se não houver lotes vencendo', async () => {
    batchRepository.findExpiring.mockResolvedValue([]);

    const result = await sut.execute(30);

    expect(result).toHaveLength(0);
  });
});
