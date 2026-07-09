import { PickOrderUseCase } from './pick-order.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';

describe('PickOrderUseCase', () => {
  let useCase: PickOrderUseCase;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockMovementRepo: jest.Mocked<IMovementRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      findById: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue({}),
      updateItemSeparado: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      updateConferentes: jest.fn(),
      findAll: jest.fn(),
    } as any;

    mockBatchRepo = {
      findAvailableByProduct: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateQuantidade: jest.fn(),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
    } as any;

    mockMovementRepo = {
      executeMovementTransaction: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      countAll: jest.fn(),
    } as any;

    // GAP-002 FIX: PickOrderUseCase agora exige IMovementRepository como 3º argumento
    useCase = new PickOrderUseCase(
      mockOrderRepo,
      mockBatchRepo,
      mockMovementRepo,
    );
  });

  it('deve separar lotes seguindo a política FEFO (vencimento mais próximo primeiro)', async () => {
    const operadorId = 99;
    const orderId = 1;
    const mockOrder = {
      id: orderId,
      codigoPedido: 'PED-001',
      status: 'PENDENTE', // obrigatório
      itens: [
        {
          id: 10,
          produtoId: 1,
          quantidadeSolicitada: 50,
          quantidadeSeparada: 0,
        },
      ],
    };

    const mockBatches = [
      {
        id: 101,
        numeroLote: 'L-OLD',
        produtoId: 1,
        quantidade: 30,
        validade: new Date('2026-10-01'),
        emInventario: false,
      },
      {
        id: 102,
        numeroLote: 'L-NEW',
        produtoId: 1,
        quantidade: 100,
        validade: new Date('2027-01-01'),
        emInventario: false,
      },
    ];

    mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue(mockBatches as any);

    const result = await useCase.execute(orderId, operadorId);

    expect(result.pickingList).toHaveLength(1);
    const itemPick = result.pickingList[0];
    expect(itemPick.sugestoes).toHaveLength(2);
    // Deve separar o lote que vence em Outubro primeiro (FEFO)
    expect(itemPick.sugestoes[0].loteId).toBe(101);
    expect(itemPick.sugestoes[0].quantidadeSeparada).toBe(30);
    // E o restante do lote que vence em Janeiro
    expect(itemPick.sugestoes[1].loteId).toBe(102);
    expect(itemPick.sugestoes[1].quantidadeSeparada).toBe(20);
    // Deve ter gerado 2 movimentações de EXPEDICAO
    expect(result.totalMovimentacoes).toBe(2);
    expect(mockMovementRepo.executeMovementTransaction).toHaveBeenCalledTimes(
      2,
    );
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(
      orderId,
      'SEPARACAO',
    );
  });

  it('deve falhar se pedido não estiver em status PENDENTE', async () => {
    const mockOrder = { id: 1, status: 'SEPARACAO', itens: [] };
    mockOrderRepo.findById.mockResolvedValue(mockOrder as any);

    await expect(useCase.execute(1, 99)).rejects.toThrow('RN-EXP-002');
  });

  it('deve falhar se não houver saldo suficiente para atender o pedido (RN-EXP-004)', async () => {
    const orderId = 2;
    const mockOrder = {
      id: orderId,
      status: 'PENDENTE', // obrigatório — sem isso, RN-EXP-002 é lançada antes
      itens: [
        {
          id: 11,
          produtoId: 1,
          quantidadeSolicitada: 100,
          quantidadeSeparada: 0,
        },
      ],
    };
    const mockBatches = [
      { id: 101, numeroLote: 'L-1', quantidade: 40, validade: new Date() },
    ];

    mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue(mockBatches as any);

    await expect(useCase.execute(orderId, 99)).rejects.toThrow(
      'RN-EXP-004: Saldo insuficiente',
    );
  });

  it('deve priorizar lotes sem validade por último (RN-EXP-001 fix)', async () => {
    const mockOrder = {
      id: 3,
      status: 'PENDENTE',
      itens: [
        {
          id: 12,
          produtoId: 1,
          quantidadeSolicitada: 5,
          quantidadeSeparada: 0,
        },
      ],
    };

    const mockBatches = [
      {
        id: 201,
        numeroLote: 'SEM-VAL',
        produtoId: 1,
        quantidade: 10,
        validade: null,
      },
      {
        id: 202,
        numeroLote: 'COM-VAL',
        produtoId: 1,
        quantidade: 10,
        validade: new Date('2026-08-01'),
      },
    ];

    mockOrderRepo.findById.mockResolvedValue(mockOrder as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue(mockBatches as any);

    const result = await useCase.execute(3, 99);
    // Lote COM validade deve ser sugerido primeiro
    expect(result.pickingList[0].sugestoes[0].loteId).toBe(202);
  });
});
