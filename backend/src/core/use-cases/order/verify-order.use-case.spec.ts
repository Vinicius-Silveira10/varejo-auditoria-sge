import { VerifyOrderUseCase } from './verify-order.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

describe('VerifyOrderUseCase', () => {
  let useCase: VerifyOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateConferentes: jest.fn(),
    };

    useCase = new VerifyOrderUseCase(mockOrderRepo);
  });

  it('deve conferir pedido de valor normal com apenas 1 conferente', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 1, valorTotal: 5000, status: 'SEPARACAO', itens: []
    } as any);

    mockOrderRepo.updateConferentes.mockResolvedValue({
      id: 1, status: 'CONFERIDO', conferente1Id: 10, conferente2Id: null,
    } as any);

    const result = await useCase.execute({ pedidoId: 1, conferente1Id: 10 });

    expect(result.status).toBe('CONFERIDO');
    expect(mockOrderRepo.updateConferentes).toHaveBeenCalledWith(1, 10, undefined);
  });

  it('deve exigir 2 conferentes se pedido for de alto valor (RN-EXP-003)', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 2, valorTotal: 15000, status: 'SEPARACAO', itens: []
    } as any);

    await expect(useCase.execute({ pedidoId: 2, conferente1Id: 10 }))
      .rejects.toThrow('RN-EXP-003: Pedidos de alto valor (>= 10000) exigem um segundo conferente');
    
    expect(mockOrderRepo.updateConferentes).not.toHaveBeenCalled();
  });

  it('deve impedir que o segundo conferente seja a mesma pessoa do primeiro (SoD)', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 3, valorTotal: 20000, status: 'SEPARACAO', itens: []
    } as any);

    await expect(useCase.execute({ pedidoId: 3, conferente1Id: 10, conferente2Id: 10 }))
      .rejects.toThrow('não podem ser a mesma pessoa');
    
    expect(mockOrderRepo.updateConferentes).not.toHaveBeenCalled();
  });

  it('deve aprovar pedido de alto valor com 2 conferentes distintos', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 4, valorTotal: 10000, status: 'SEPARACAO', itens: []
    } as any);

    mockOrderRepo.updateConferentes.mockResolvedValue({
      id: 4, status: 'CONFERIDO', conferente1Id: 10, conferente2Id: 20,
    } as any);

    const result = await useCase.execute({ pedidoId: 4, conferente1Id: 10, conferente2Id: 20 });

    expect(result.status).toBe('CONFERIDO');
    expect(mockOrderRepo.updateConferentes).toHaveBeenCalledWith(4, 10, 20);
  });

  it('deve falhar se pedido nao for encontrado', async () => {
    mockOrderRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ pedidoId: 99, conferente1Id: 1 })).rejects.toThrow('não encontrado');
  });

  it('deve falhar se pedido ja estiver conferido', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 5, valorTotal: 100, status: 'CONFERIDO', itens: []
    } as any);

    await expect(useCase.execute({ pedidoId: 5, conferente1Id: 1 })).rejects.toThrow('já está com status CONFERIDO');
  });
});
