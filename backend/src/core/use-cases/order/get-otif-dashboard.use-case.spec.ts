import { GetOtifDashboardUseCase } from './get-otif-dashboard.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

describe('GetOtifDashboardUseCase', () => {
  let useCase: GetOtifDashboardUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      findAll: jest.fn(),
    } as any;
    useCase = new GetOtifDashboardUseCase(mockOrderRepo);
  });

  it('deve calcular OTIF 100% quando todos os pedidos estão completos', async () => {
    mockOrderRepo.findAll.mockResolvedValue([
      { status: 'EXPEDIDO', itens: [{ quantidadeSolicitada: 10, quantidadeSeparada: 10 }] }
    ] as any);

    const result = await useCase.execute();

    expect(result.otifRate).toBe(100);
    expect(result.pedidosCompletos).toBe(1);
  });

  it('deve calcular OTIF corretamente com pedidos divergentes', async () => {
    mockOrderRepo.findAll.mockResolvedValue([
      { status: 'EXPEDIDO', itens: [{ quantidadeSolicitada: 10, quantidadeSeparada: 10 }] }, // OK
      { status: 'EXPEDIDO', itens: [{ quantidadeSolicitada: 10, quantidadeSeparada: 8 }] },  // Divergente
    ] as any);

    const result = await useCase.execute();

    expect(result.otifRate).toBe(50);
    expect(result.pedidosDivergentes).toBe(1);
  });
});
