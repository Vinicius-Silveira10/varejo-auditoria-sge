import { AddressController } from './address.controller';
import { AdjustmentController } from './adjustment.controller';
import { InventoryController } from './inventory.controller';
import { MovementController } from './movement.controller';
import { OrderController } from './order.controller';
import { BatchController } from './batch.controller';
import { JwtUser } from '../../security/jwt.strategy';

// Mock objects for UseCases
const mockExecutePutawayUseCase = { execute: jest.fn() };
const mockRequestAdjustmentUseCase = { execute: jest.fn() };
const mockProcessAdjustmentApprovalUseCase = { execute: jest.fn() };
const mockRecordInventoryUseCase = { execute: jest.fn() };
const mockProcessInventoryDivergenceUseCase = { execute: jest.fn() };
const mockLogMovementUseCase = { execute: jest.fn() };
const mockPickOrderUseCase = { execute: jest.fn().mockResolvedValue({ totalMovimentacoes: 1 }) };
const mockReceiveBatchUseCase = { execute: jest.fn() };

describe('Controllers Identity Extractor Regression Test', () => {
  let addressController: AddressController;
  let adjustmentController: AdjustmentController;
  let inventoryController: InventoryController;
  let movementController: MovementController;
  let orderController: OrderController;
  let batchController: BatchController;

  beforeEach(() => {
    // Generic mock that has all needed methods
    const genericMock = { 
      execute: jest.fn().mockResolvedValue({ totalMovimentacoes: 1 }), 
      emitDashboardUpdate: jest.fn() 
    };

    // Assign specific mocks so we can assert on them
    const mockDeps = new Proxy({}, {
      get: (target, prop) => genericMock
    });

    addressController = new AddressController(
      genericMock as any, genericMock as any, genericMock as any,
      mockExecutePutawayUseCase as any, genericMock as any
    );

    adjustmentController = new AdjustmentController(
      mockRequestAdjustmentUseCase as any,
      mockProcessAdjustmentApprovalUseCase as any
    );

    inventoryController = new InventoryController(
      mockRecordInventoryUseCase as any,
      genericMock as any,
      mockProcessInventoryDivergenceUseCase as any,
      genericMock as any
    );
    // Replace the real registerCountUseCase with mockRecordInventoryUseCase for the test
    (inventoryController as any).registerCountUseCase = mockRecordInventoryUseCase;
    (inventoryController as any).startCountUseCase = mockProcessInventoryDivergenceUseCase;

    movementController = new MovementController(
      mockLogMovementUseCase as any,
      genericMock as any, genericMock as any
    );
    (movementController as any).dashboardGateway = genericMock;

    orderController = new OrderController(
      genericMock as any, 
      genericMock as any, 
      genericMock as any, 
      mockPickOrderUseCase as any, 
      genericMock as any
    );

    batchController = new BatchController(
      mockReceiveBatchUseCase as any,
      genericMock as any,
      genericMock as any,
      genericMock as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUser: JwtUser = { userId: 999, email: 'test@fortal.com.br', perfil: 'GESTOR' };

  it('AddressController should pass usuarioId correctly', async () => {
    await addressController.executePutaway({ loteId: 1, enderecoDestinoId: 2, quantidade: 10 }, mockUser.userId);
    expect(mockExecutePutawayUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 999 })
    );
  });

  it('AdjustmentController should pass solicitanteId correctly', async () => {
    await adjustmentController.requestAdjustment({ loteId: 1, quantidadeDelta: 5, motivo: 'test' }, mockUser.userId);
    expect(mockRequestAdjustmentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ solicitanteId: 999 })
    );
  });

  it('AdjustmentController should pass aprovadorId and perfil correctly on approval', async () => {
    await adjustmentController.approveAdjustment({ ajusteId: 1, aprovado: true }, mockUser.userId, mockUser.perfil);
    expect(mockProcessAdjustmentApprovalUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ aprovadorId: 999, aprovadorRole: 'GESTOR' })
    );
  });

  it('InventoryController should pass usuarioId correctly when recording', async () => {
    await inventoryController.registerCount({ contagemId: 1, quantidadeFisica: 10, isRecontagem: false }, mockUser.userId);
    expect(mockRecordInventoryUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 999 })
    );
  });

  it('InventoryController should pass usuarioId correctly when starting count', async () => {
    await inventoryController.startCount({ loteId: 1 }, mockUser.userId);
    expect(mockProcessInventoryDivergenceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 999 })
    );
  });

  it('MovementController should pass usuarioId correctly', async () => {
    await movementController.registerMovement({ tipo: 'SAIDA', loteId: 1, quantidade: 1, motivo: 'test' } as any, mockUser.userId);
    expect(mockLogMovementUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 999 })
    );
  });

  it('OrderController should pass operadorId correctly', async () => {
    await orderController.pickOrder('1', mockUser.userId);
    expect(mockPickOrderUseCase.execute).toHaveBeenCalledWith(
      1, 999
    );
  });

  it('BatchController should pass usuarioId correctly', async () => {
    await batchController.receiveBatch({ numeroLote: 'L-123', produtoId: 1, quantidade: 10, custoAquisicao: 10 } as any, mockUser.userId);
    expect(mockReceiveBatchUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 999 })
    );
  });
});
