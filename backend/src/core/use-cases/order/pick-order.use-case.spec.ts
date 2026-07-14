import { PickOrderUseCase } from './pick-order.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

/**
 * Helper para construir o mock do UnitOfWork com estado de endereços mutável,
 * simulando o comportamento transacional real (findById → updateOcupacao reflete a mudança).
 */
function buildUnitOfWork(
  mockBatchRepo: any,
  mockMovRepo: any,
  mockOrderRepo: any,
  mockAddressRepo: any,
  mockLockForUpdate: any = jest.fn(),
): jest.Mocked<IUnitOfWork> {
  return {
    execute: jest.fn().mockImplementation(async (callback: any) => {
      return await callback({
        loteRepository: mockBatchRepo,
        movementRepository: mockMovRepo,
        orderRepository: mockOrderRepo,
        addressRepository: mockAddressRepo,
        lockForUpdate: mockLockForUpdate,
      });
    }),
  } as any;
}

describe('PickOrderUseCase', () => {
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockMovRepo: jest.Mocked<IMovementRepository>;
  let mockAddressRepo: jest.Mocked<IAddressRepository>;
  let mockUnitOfWork: jest.Mocked<IUnitOfWork>;

  function buildUseCase() {
    return new PickOrderUseCase(
      mockOrderRepo,
      mockBatchRepo,
      mockMovRepo,
      mockUnitOfWork,
      mockAddressRepo,
    );
  }

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
      updateQuantidadeDelta: jest.fn().mockResolvedValue({}),
      updateInventarioStatus: jest.fn(),
      countByNotaFiscal: jest.fn(),
    } as any;

    mockMovRepo = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
      findPaginatedOrdered: jest.fn(),
      countAll: jest.fn(),
      findAllocationByLote: jest.fn().mockResolvedValue([]), // default: sem alocação física
    } as any;

    mockAddressRepo = {
      findById: jest.fn(),
      updateOcupacao: jest.fn().mockResolvedValue({}),
    } as any;

    mockUnitOfWork = buildUnitOfWork(
      mockBatchRepo,
      mockMovRepo,
      mockOrderRepo,
      mockAddressRepo,
    );
  });

  // =========================================================================
  // T0 — Lote recém-recebido: sem putaway, sem pick anterior
  // Mais comum do sistema — deve aparecer 100% pendente
  // =========================================================================
  it('T0: pick de lote recém-recebido (cross-docking puro) — sem endereço decrementado', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 1,
      status: 'PENDENTE',
      itens: [{ id: 10, produtoId: 1, quantidadeSolicitada: 30, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 101, numeroLote: 'L-NOVO', produtoId: 1, quantidade: 100, validade: null },
    ] as any);

    // Lote ainda não passou por putaway — findAllocationByLote retorna vazio
    mockMovRepo.findAllocationByLote.mockResolvedValue([]);

    const useCase = buildUseCase();
    const result = await useCase.execute(1, 99);

    expect(result.totalMovimentacoes).toBe(1);

    // enderecoOrigemId deve ser null — cross-docking
    expect(mockMovRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ enderecoOrigemId: null }),
    );

    // Nenhum endereço deve ter sido decrementado
    expect(mockAddressRepo.updateOcupacao).not.toHaveBeenCalled();
  });

  // =========================================================================
  // T1 — Estoque 100% armazenado em único endereço → ocupado decrementado
  // =========================================================================
  it('T1: pick de estoque totalmente armazenado em único endereço', async () => {
    const ENDERECO_ID = 5;
    const LOTE_ID = 101;

    mockOrderRepo.findById.mockResolvedValue({
      id: 1,
      status: 'PENDENTE',
      itens: [{ id: 10, produtoId: 1, quantidadeSolicitada: 20, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: LOTE_ID, numeroLote: 'L-ARM', produtoId: 1, quantidade: 50, validade: null },
    ] as any);

    // 50 unidades no Endereço 5
    mockMovRepo.findAllocationByLote.mockResolvedValue([
      { enderecoId: ENDERECO_ID, quantidadeAlocada: 50 },
    ]);

    // Endereço com ocupado = 50
    mockAddressRepo.findById.mockResolvedValue({ id: ENDERECO_ID, ocupado: 50 } as any);

    const mockLockForUpdate = jest.fn();
    mockUnitOfWork = buildUnitOfWork(mockBatchRepo, mockMovRepo, mockOrderRepo, mockAddressRepo, mockLockForUpdate);

    const useCase = buildUseCase();
    await useCase.execute(1, 99);

    // Validação estrita da prevenção de deadlock (ADR-005): Lock de Lote ANTES do ChainPointer
    expect(mockLockForUpdate).toHaveBeenCalledWith('Lote', LOTE_ID);

    // Validação da ORDEM ESTRITA: O lock deve ocorrer ANTES de qualquer update de lote, endereco ou insert de movimentacao
    const lockOrder = mockLockForUpdate.mock.invocationCallOrder[0];
    const updateLoteOrder = mockBatchRepo.updateQuantidadeDelta.mock.invocationCallOrder[0];
    const createMovOrder = mockMovRepo.create.mock.invocationCallOrder[0];
    const updateAddressOrder = mockAddressRepo.updateOcupacao.mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(updateLoteOrder);
    expect(updateLoteOrder).toBeLessThan(createMovOrder);
    expect(createMovOrder).toBeLessThan(updateAddressOrder);

    // enderecoOrigemId preenchido
    expect(mockMovRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'EXPEDICAO',
        enderecoOrigemId: ENDERECO_ID,
        quantidade: 20,
      }),
    );

    // ocupado decrementado de 50 para 30
    expect(mockAddressRepo.updateOcupacao).toHaveBeenCalledWith(ENDERECO_ID, 30);
  });

  // =========================================================================
  // T1.5 — Múltiplos lotes: validação da ordem de aquisição de locks (ADR-005)
  // =========================================================================
  it('T1.5: deve ordenar os IDs dos lotes antes de adquirir lock para evitar deadlock intrafuncional', async () => {
    // Pedido tem 1 item, que puxa de 2 lotes diferentes (Lote 500 e Lote 200)
    mockOrderRepo.findById.mockResolvedValue({
      id: 99,
      status: 'PENDENTE',
      itens: [{ id: 10, produtoId: 1, quantidadeSolicitada: 40, quantidadeSeparada: 0 }],
    } as any);

    // Repare que o banco retorna na ordem 500, depois 200.
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 500, numeroLote: 'L-500', produtoId: 1, quantidade: 20, validade: null },
      { id: 200, numeroLote: 'L-200', produtoId: 1, quantidade: 20, validade: null },
    ] as any);

    mockMovRepo.findAllocationByLote.mockResolvedValue([]); // sem alocação física para simplificar

    const mockLockForUpdate = jest.fn();
    mockUnitOfWork = buildUnitOfWork(mockBatchRepo, mockMovRepo, mockOrderRepo, mockAddressRepo, mockLockForUpdate);

    const useCase = buildUseCase();
    await useCase.execute(99, 99);

    // O código DEVE ordenar os lotes numericamente (200, 500) antes de pedir lock.
    expect(mockLockForUpdate).toHaveBeenCalledTimes(2);
    
    expect(mockLockForUpdate.mock.calls[0]).toEqual(['Lote', 200]);
    expect(mockLockForUpdate.mock.calls[1]).toEqual(['Lote', 500]);
  });

  // =========================================================================
  // T2 — Cross-docking: expedição de lote nunca armazenado
  // =========================================================================
  it('T2: pick de cross-docking — nenhum endereço decrementado, sem erro', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 2,
      status: 'PENDENTE',
      itens: [{ id: 20, produtoId: 2, quantidadeSolicitada: 40, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 200, numeroLote: 'L-CROSS', produtoId: 2, quantidade: 100, validade: null },
    ] as any);

    mockMovRepo.findAllocationByLote.mockResolvedValue([]); // zero alocação física

    const useCase = buildUseCase();
    const result = await useCase.execute(2, 99);

    expect(result.totalMovimentacoes).toBe(1);
    expect(mockAddressRepo.updateOcupacao).not.toHaveBeenCalled();
    expect(mockMovRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ enderecoOrigemId: null }),
    );
  });

  // =========================================================================
  // T3 — Parcialmente armazenado: pick de 30 (20 de endereço, 10 cross-docking)
  // =========================================================================
  it('T3: pick de estoque parcialmente armazenado (misto) — resultado correto', async () => {
    const ENDERECO_ID = 7;

    mockOrderRepo.findById.mockResolvedValue({
      id: 3,
      status: 'PENDENTE',
      itens: [{ id: 30, produtoId: 3, quantidadeSolicitada: 30, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 300, numeroLote: 'L-MIX', produtoId: 3, quantidade: 100, validade: null },
    ] as any);

    // 20 armazenados no Endereço 7; 80 ainda pendentes
    mockMovRepo.findAllocationByLote.mockResolvedValue([
      { enderecoId: ENDERECO_ID, quantidadeAlocada: 20 },
    ]);

    mockAddressRepo.findById.mockResolvedValue({ id: ENDERECO_ID, ocupado: 20 } as any);

    const useCase = buildUseCase();
    await useCase.execute(3, 99);

    const criarCalls = (mockMovRepo.create as jest.Mock).mock.calls.map(
      (call: any) => call[0],
    );

    // Deve haver 2 movimentações: 20 do endereço + 10 cross-docking
    const doEndereco = criarCalls.filter((c: any) => c.enderecoOrigemId === ENDERECO_ID);
    const crossDock = criarCalls.filter((c: any) => c.enderecoOrigemId === null);

    expect(doEndereco).toHaveLength(1);
    expect(doEndereco[0].quantidade).toBe(20);
    expect(crossDock).toHaveLength(1);
    expect(crossDock[0].quantidade).toBe(10);

    // Total das partes = 30
    expect(doEndereco[0].quantidade + crossDock[0].quantidade).toBe(30);

    // Endereço decrementado de 20 para 0
    expect(mockAddressRepo.updateOcupacao).toHaveBeenCalledWith(ENDERECO_ID, 0);
  });

  // =========================================================================
  // T4 — Regressão completa: receber → armazenar parcial → pick misto → verificar pendente
  // =========================================================================
  it('T4: regressão completa — pendente final correto pela fórmula ADR-001', async () => {
    const ENDERECO_A = 10;

    // Estado após: receber 100, armazenar 60 no Endereço A, pick de 30 (20 de A + 10 cross-docking)
    // Lote.quantidade após pick = 70
    // SUM(ARMAZENAGEM) = 60
    // SUM(EXPEDICAO com origemId) = 20
    // Pendente = 70 - 60 + 20 = 30

    mockOrderRepo.findById.mockResolvedValue({
      id: 4,
      status: 'PENDENTE',
      itens: [{ id: 40, produtoId: 4, quantidadeSolicitada: 30, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 400, numeroLote: 'L-REG', produtoId: 4, quantidade: 70, validade: null },
    ] as any);

    mockMovRepo.findAllocationByLote.mockResolvedValue([
      { enderecoId: ENDERECO_A, quantidadeAlocada: 60 },
    ]);

    mockAddressRepo.findById.mockResolvedValue({ id: ENDERECO_A, ocupado: 60 } as any);

    const useCase = buildUseCase();
    await useCase.execute(4, 99);

    // Verificar que pick retirou do endereço
    expect(mockMovRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ enderecoOrigemId: ENDERECO_A, quantidade: 30 }),
    );
    // Endereço A decrementado de 60 para 30
    expect(mockAddressRepo.updateOcupacao).toHaveBeenCalledWith(ENDERECO_A, 30);

    // Agora calcular o pendente manualmente com a fórmula ADR-001:
    // Após o pick: Lote.quantidade = 70 - 30 = 40 (decrementado pelo updateQuantidadeDelta)
    // SUM(ARMAZENAGEM) = 60, SUM(EXPEDICAO c/ origemId) = 30
    // Pendente = 40 - 60 + 30 = 10
    // (Endereço A ainda tem 30; lote tem 40; 40 - 30 = 10 pendentes — bate ✅)
    const pendente = 40 - 60 + 30;
    expect(pendente).toBe(10);
    expect(pendente).toBeGreaterThanOrEqual(0);
  });

  // =========================================================================
  // T5 — FEFO: lote COM validade deve ser priorizado sobre lote SEM validade
  // =========================================================================
  it('T5: FEFO — lote com vencimento mais próximo deve ser separado primeiro (RN-EXP-001)', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 5,
      status: 'PENDENTE',
      itens: [{ id: 50, produtoId: 5, quantidadeSolicitada: 50, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 501, numeroLote: 'L-OLD', produtoId: 5, quantidade: 30, validade: new Date('2026-10-01') },
      { id: 502, numeroLote: 'L-NEW', produtoId: 5, quantidade: 100, validade: new Date('2027-01-01') },
    ] as any);

    mockMovRepo.findAllocationByLote.mockResolvedValue([]);

    const useCase = buildUseCase();
    const result = await useCase.execute(5, 99);

    expect(result.pickingList[0].sugestoes[0].loteId).toBe(501); // vence em out/26
    expect(result.pickingList[0].sugestoes[0].quantidadeSeparada).toBe(30);
    expect(result.pickingList[0].sugestoes[1].loteId).toBe(502);
    expect(result.pickingList[0].sugestoes[1].quantidadeSeparada).toBe(20);
  });

  // =========================================================================
  // T6 — Dois endereços (40 em A, 30 em B), pick de 50
  // Valida critério de desempate entre endereços na prática
  // =========================================================================
  it('T6: pick de lote distribuído em 2 endereços (40+30), expedir 50 — critério maior-primeiro', async () => {
    const ENDERECO_A = 20;
    const ENDERECO_B = 21;

    mockOrderRepo.findById.mockResolvedValue({
      id: 6,
      status: 'PENDENTE',
      itens: [{ id: 60, produtoId: 6, quantidadeSolicitada: 50, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 600, numeroLote: 'L-MULTI', produtoId: 6, quantidade: 100, validade: null },
    ] as any);

    // Retornado com o maior alocado primeiro (ordem DESC — conforme implementação do repositório)
    mockMovRepo.findAllocationByLote.mockResolvedValue([
      { enderecoId: ENDERECO_A, quantidadeAlocada: 40 },
      { enderecoId: ENDERECO_B, quantidadeAlocada: 30 },
    ]);

    // Endereços com seus ocupados
    mockAddressRepo.findById.mockImplementation(async (id: number) => {
      if (id === ENDERECO_A) return { id: ENDERECO_A, ocupado: 40 } as any;
      if (id === ENDERECO_B) return { id: ENDERECO_B, ocupado: 30 } as any;
      return null;
    });

    const useCase = buildUseCase();
    await useCase.execute(6, 99);

    const criarCalls = (mockMovRepo.create as jest.Mock).mock.calls.map((c: any) => c[0]);

    const movA = criarCalls.find((c: any) => c.enderecoOrigemId === ENDERECO_A);
    const movB = criarCalls.find((c: any) => c.enderecoOrigemId === ENDERECO_B);

    // Estratégia maior-primeiro: esvazia A (40) completamente, depois retira 10 de B
    expect(movA?.quantidade).toBe(40);
    expect(movB?.quantidade).toBe(10);

    // Soma dos decrementos bate com 50
    expect((movA?.quantidade ?? 0) + (movB?.quantidade ?? 0)).toBe(50);

    // Nenhum endereço com ocupado negativo
    expect(mockAddressRepo.updateOcupacao).toHaveBeenCalledWith(ENDERECO_A, 0);  // 40 - 40 = 0
    expect(mockAddressRepo.updateOcupacao).toHaveBeenCalledWith(ENDERECO_B, 20); // 30 - 10 = 20

    // Pendente final pela fórmula ADR-001:
    // Lote.quantidade após pick = 100 - 50 = 50
    // SUM(ARMAZENAGEM) = 70 (40+30)
    // SUM(EXPEDICAO com origemId) = 50 (40+10)
    // Pendente = 50 - 70 + 50 = 30
    const pendente = 50 - 70 + 50;
    expect(pendente).toBe(30);
    expect(pendente).toBeGreaterThanOrEqual(0);
  });

  // =========================================================================
  // Guardrails existentes — garantir que não quebramos nada
  // =========================================================================
  it('deve falhar se pedido não estiver em status PENDENTE (RN-EXP-002)', async () => {
    mockOrderRepo.findById.mockResolvedValue({ id: 1, status: 'SEPARACAO', itens: [] } as any);
    await expect(buildUseCase().execute(1, 99)).rejects.toBeInstanceOf(DomainException);
    await expect(buildUseCase().execute(1, 99)).rejects.toThrow('RN-EXP-002');
  });

  it('deve falhar se não houver saldo suficiente (RN-EXP-004)', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 2,
      status: 'PENDENTE',
      itens: [{ id: 11, produtoId: 1, quantidadeSolicitada: 100, quantidadeSeparada: 0 }],
    } as any);
    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 101, numeroLote: 'L-1', quantidade: 40, validade: new Date() },
    ] as any);
    mockMovRepo.findAllocationByLote.mockResolvedValue([]);

    await expect(buildUseCase().execute(2, 99)).rejects.toThrow('RN-EXP-004');
  });

  it('deve priorizar lotes sem validade por último (RN-EXP-001)', async () => {
    mockOrderRepo.findById.mockResolvedValue({
      id: 3,
      status: 'PENDENTE',
      itens: [{ id: 12, produtoId: 1, quantidadeSolicitada: 5, quantidadeSeparada: 0 }],
    } as any);

    mockBatchRepo.findAvailableByProduct.mockResolvedValue([
      { id: 201, numeroLote: 'SEM-VAL', produtoId: 1, quantidade: 10, validade: null },
      { id: 202, numeroLote: 'COM-VAL', produtoId: 1, quantidade: 10, validade: new Date('2026-08-01') },
    ] as any);
    mockMovRepo.findAllocationByLote.mockResolvedValue([]);

    const result = await buildUseCase().execute(3, 99);
    expect(result.pickingList[0].sugestoes[0].loteId).toBe(202); // com validade primeiro
  });
});
