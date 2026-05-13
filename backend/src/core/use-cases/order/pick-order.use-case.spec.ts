import { PickOrderUseCase } from './pick-order.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

describe('PickOrderUseCase', () => {
  let useCase: PickOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateItemSeparado: jest.fn(),
      create: jest.fn(),
    } as any;

    mockBatchRepo = {
      findAvailableByProduct: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateQuantidade: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
    } as any;

    useCase = new PickOrderUseCase(mockOrderRepo, mockBatchRepo);
  });

  it('deve sugerir lotes seguindo a política FEFO (vencimento mais próximo primeiro)', async () => {
    const orderId = 1;
    const mockOrder = {
      id: orderId,
      codigoPedido: 'PED-001',
      status: 'PENDENTE',
      itens: [
        { id: 10, produtoId: 1, quantidadeSolicitada: 50, quantidadeSeparada: 0 }
      ]
    };

    const mockBatches = [
      { id: 101, numeroLote: 'L-OLD', produtoId: 1, quantidade: 30, validade: new Date('2026-10-01'), ativo: true },
      { id: 102, numeroLote: 'L-NEW', produtoId: 1, quantidade: 100, validade: new Date('2027-01-01'), ativo: true },
    ];

    mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue(mockBatches as any);

    const result = await useCase.execute(orderId);

    expect(result.pickingList).toHaveLength(1);
    const itemPick = result.pickingList[0];
    expect(itemPick.sugestoes).toHaveLength(2);
    // Deve sugerir o lote que vence em Outubro primeiro
    expect(itemPick.sugestoes[0].loteId).toBe(101);
    expect(itemPick.sugestoes[0].quantidadeSugerida).toBe(30);
    // E o restante do lote que vence em Janeiro
    expect(itemPick.sugestoes[1].loteId).toBe(102);
    expect(itemPick.sugestoes[1].quantidadeSugerida).toBe(20);
  });

  it('deve falhar se não houver saldo suficiente para atender o pedido', async () => {
    const orderId = 2;
    const mockOrder = {
      id: orderId,
      itens: [{ produtoId: 1, quantidadeSolicitada: 100, quantidadeSeparada: 0 }]
    };
    const mockBatches = [{ id: 101, quantidade: 40, validade: new Date() }];

    mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue(mockBatches as any);

    await expect(useCase.execute(orderId)).rejects.toThrow('RN-EXP-004: Saldo insuficiente');
  });
});
