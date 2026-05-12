import { CloseOrderUseCase } from './close-order.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

describe('CloseOrderUseCase', () => {
  let useCase: CloseOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new CloseOrderUseCase(mockOrderRepo);
  });

  it('deve expedir o pedido se todos os itens foram separados corretamente', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 1,
      codigoPedido: 'PED-100',
      status: 'CONFERIDO',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      itens: [
        { id: 1, pedidoId: 1, produtoId: 10, quantidadeSolicitada: 5, quantidadeSeparada: 5 },
        { id: 2, pedidoId: 1, produtoId: 20, quantidadeSolicitada: 10, quantidadeSeparada: 10 },
      ],
    });

    mockOrderRepo.updateStatus.mockResolvedValue({
      id: 1,
      codigoPedido: 'PED-100',
      status: 'EXPEDIDO',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    const result = await useCase.execute(1);

    expect(mockOrderRepo.findById).toHaveBeenCalledWith(1);
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(1, 'EXPEDIDO');
    expect(result.status).toBe('EXPEDIDO');
  });

  it('deve bloquear a expedição se houver itens com separação incompleta (RN-EXP-002)', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 2,
      codigoPedido: 'PED-101',
      status: 'SEPARACAO',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      itens: [
        { id: 1, pedidoId: 2, produtoId: 10, quantidadeSolicitada: 5, quantidadeSeparada: 5 },
        { id: 2, pedidoId: 2, produtoId: 20, quantidadeSolicitada: 10, quantidadeSeparada: 8 }, // Faltam 2
      ],
    });

    await expect(useCase.execute(2)).rejects.toThrow('RN-EXP-002');
    await expect(useCase.execute(2)).rejects.toThrow('Produto 20: falta 2');
    
    expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('deve falhar se o pedido não existir', async () => {
    mockOrderRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow('não encontrado');
    expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('deve falhar se o pedido já estiver expedido', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 3,
      codigoPedido: 'PED-102',
      status: 'EXPEDIDO',
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      itens: [],
    });

    await expect(useCase.execute(3)).rejects.toThrow('já está expedido');
    expect(mockOrderRepo.updateStatus).not.toHaveBeenCalled();
  });
});
