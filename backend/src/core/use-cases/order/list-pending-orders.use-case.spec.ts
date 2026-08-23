import { ListPendingOrdersUseCase } from './list-pending-orders.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

describe('ListPendingOrdersUseCase', () => {
  let mockOrderRepo: jest.Mocked<IOrderRepository>;

  function buildUseCase() {
    return new ListPendingOrdersUseCase(mockOrderRepo);
  }

  beforeEach(() => {
    mockOrderRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      updateConferentes: jest.fn(),
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      updateItemSeparado: jest.fn(),
      countPendingPicking: jest.fn(),
    } as any;
  });

  it('T1: deve retornar lista vazia e meta correta quando nao ha pedidos', async () => {
    mockOrderRepo.findByStatus.mockResolvedValue({ data: [], total: 0 });
    const result = await buildUseCase().execute({});
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(20);
    expect(result.meta.totalPages).toBe(0);
  });

  it('T2: deve retornar pedidos quando existem pedidos no status solicitado', async () => {
    const fakePedidos = [
      { id: 1, codigoPedido: 'PED-001', status: 'PENDENTE', valorTotal: 500, createdAt: new Date(), itens: [] },
      { id: 2, codigoPedido: 'PED-002', status: 'PENDENTE', valorTotal: 300, createdAt: new Date(), itens: [] },
    ];
    mockOrderRepo.findByStatus.mockResolvedValue({ data: fakePedidos as any, total: 2 });
    const result = await buildUseCase().execute({});
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.totalPages).toBe(1);
  });

  it('T3: deve passar o status correto ao repositorio quando especificado', async () => {
    mockOrderRepo.findByStatus.mockResolvedValue({ data: [], total: 0 });
    await buildUseCase().execute({ status: 'SEPARACAO' });
    expect(mockOrderRepo.findByStatus).toHaveBeenCalledWith('SEPARACAO', 1, 20);
  });

  it('T4: deve usar status PENDENTE como default quando nenhum status for informado', async () => {
    mockOrderRepo.findByStatus.mockResolvedValue({ data: [], total: 0 });
    await buildUseCase().execute({});
    expect(mockOrderRepo.findByStatus).toHaveBeenCalledWith('PENDENTE', 1, 20);
  });

  it('T5: deve calcular totalPages corretamente e repassar page/limit ao repositorio', async () => {
    mockOrderRepo.findByStatus.mockResolvedValue({ data: [] as any, total: 25 });
    const result = await buildUseCase().execute({ page: 2, limit: 10 });
    expect(mockOrderRepo.findByStatus).toHaveBeenCalledWith('PENDENTE', 2, 10);
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.total).toBe(25);
    expect(result.meta.totalPages).toBe(3);
  });

  it('T6: deve calcular totalPages sem pagina extra quando total e multiplo exato do limit', async () => {
    mockOrderRepo.findByStatus.mockResolvedValue({ data: [] as any, total: 20 });
    const result = await buildUseCase().execute({ page: 1, limit: 20 });
    expect(result.meta.totalPages).toBe(1);
  });

  it('T7: deve lancar erro para status invalido', async () => {
    await expect(buildUseCase().execute({ status: 'STATUS_INVALIDO' })).rejects.toThrow('Status invalido');
  });
});
