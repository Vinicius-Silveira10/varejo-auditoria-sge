import { RegisterMovementUseCase } from './register-movement.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Lote, Movimentacao } from '@prisma/client';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

describe('RegisterMovementUseCase', () => {
  let useCase: RegisterMovementUseCase;
  let mockBatchRepository: any;
  let mockMovementRepository: any;
  let mockAddressRepository: any;
  let mockProductRepository: any;
  let mockUnitOfWork: any;
  let mockLockForUpdate: jest.Mock;

  beforeEach(() => {
    mockBatchRepository = {
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
      updateQuantidadeDelta: jest.fn().mockResolvedValue({ id: 1, quantidade: 10 }),
      updateInventarioStatus: jest.fn(),
      create: jest.fn(),
    };
    mockMovementRepository = {
      create: jest.fn(),
      executeMovementTransaction: jest.fn(),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
    };
    mockAddressRepository = {
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      create: jest.fn(),
      disable: jest.fn(),
      updateOcupacao: jest.fn(),
    };
    mockProductRepository = {
      findById: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };
    mockLockForUpdate = jest.fn();
    mockUnitOfWork = {
      execute: jest.fn().mockImplementation(async (callback) => {
        return await callback({
          loteRepository: mockBatchRepository,
          movementRepository: mockMovementRepository,
          addressRepository: mockAddressRepository,
          produtoRepository: mockProductRepository,
          lockForUpdate: mockLockForUpdate,
        });
      }),
    };

    useCase = new RegisterMovementUseCase(
      mockBatchRepository,
      mockMovementRepository,
      mockAddressRepository,
      mockProductRepository,
      mockUnitOfWork,
    );
  });

  it('deve registrar uma ENTRADA e incrementar a quantidade do lote', async () => {
    const loteId = 1;
    const batchMock: any = {
      id: loteId,
      produtoId: 10,
      numeroLote: 'L01',
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const movRequest: any = {
      tipo: 'ENTRADA',
      loteId,
      quantidade: 20,
      motivo: 'Compra',
      enderecoOrigemId: null,
      enderecoDestinoId: 5,
      usuarioId: 1,
    };
    mockAddressRepository.findById.mockResolvedValue({
      id: 5,
      capacidade: 100,
      ocupado: 0,
      codigo: 'A1',
      tipoZona: 'SECO',
    } as any);
    mockProductRepository.findById.mockResolvedValue({
      id: 10,
      tipoZonaRequerida: 'SECO',
    } as any);

    mockMovementRepository.create.mockResolvedValue({
      id: 100,
      criadoEm: new Date(),
      hash: 'h',
      previousHash: null,
      ...movRequest,
    });

    const result = await useCase.execute(movRequest);

    // Validação de prevenção de deadlock: Lock de domínio no início da transação
    expect(mockLockForUpdate).toHaveBeenCalledWith('Lote', loteId);

    // Validação da ORDEM ESTRITA: O lock deve ocorrer ANTES de qualquer update ou insert no BD
    const lockOrder = mockLockForUpdate.mock.invocationCallOrder[0];
    const updateLoteOrder = mockBatchRepository.updateQuantidadeDelta.mock.invocationCallOrder[0];
    const createMovOrder = mockMovementRepository.create.mock.invocationCallOrder[0];

    expect(lockOrder).toBeLessThan(updateLoteOrder);
    expect(updateLoteOrder).toBeLessThan(createMovOrder);

    expect(mockBatchRepository.findById).toHaveBeenCalledWith(loteId);
    expect(mockMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'ENTRADA',
      }),
    );
    expect(result.id).toBeDefined();
  });

  it('deve registrar uma SAIDA e decrementar a quantidade do lote', async () => {
    const loteId = 2;
    const batchMock: any = {
      id: loteId,
      produtoId: 10,
      numeroLote: 'L02',
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const movRequest: any = {
      tipo: 'SAIDA',
      loteId,
      quantidade: 10,
      motivo: 'Venda',
      enderecoOrigemId: 10,
      enderecoDestinoId: null,
      usuarioId: 1,
    };
    mockAddressRepository.findById.mockResolvedValue({
      id: 10,
      capacidade: 100,
      ocupado: 50,
      codigo: 'B1',
    } as any);

    mockMovementRepository.create.mockResolvedValue({
      id: 101,
      criadoEm: new Date(),
      hash: 'h',
      previousHash: null,
      ...movRequest,
    });

    const result = await useCase.execute(movRequest);

    expect(mockMovementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'SAIDA',
      }),
    );
  });

  it('deve lançar erro [RN-TRV-002] ao tentar fazer SAIDA com saldo negativo', async () => {
    const loteId = 3;
    const batchMock: any = {
      id: loteId,
      produtoId: 10,
      numeroLote: 'L03',
      quantidade: 5,
      validade: null,
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const movRequest: any = {
      tipo: 'SAIDA',
      loteId,
      quantidade: 10,
      motivo: 'Venda',
      enderecoOrigemId: 10,
      enderecoDestinoId: null,
      usuarioId: 1,
    };

    await expect(useCase.execute(movRequest)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-TRV-002');
    expect(mockBatchRepository.updateQuantidade).not.toHaveBeenCalled();
  });

  it('deve lançar erro [RN-EXP-001] (FEFO) ao expedir um lote se houver outro mais antigo', async () => {
    const produtoId = 10;
    const loteSolicitado: any = {
      id: 1,
      produtoId,
      numeroLote: 'L_NOVO',
      quantidade: 100,
      validade: new Date('2027-01-01'),
      ativo: true,
      emInventario: false,
    };
    const loteAntigo: any = {
      id: 2,
      produtoId,
      numeroLote: 'L_ANTIGO',
      quantidade: 50,
      validade: new Date('2026-10-01'),
      ativo: true,
      emInventario: false,
    };

    mockBatchRepository.findById.mockResolvedValue(loteSolicitado);
    mockBatchRepository.findAvailableByProduct.mockResolvedValue([
      loteSolicitado,
      loteAntigo,
    ]);

    const movRequest: any = {
      tipo: 'EXPEDICAO',
      loteId: 1,
      quantidade: 10,
      motivo: 'Despacho',
      enderecoOrigemId: 10,
      enderecoDestinoId: null,
      usuarioId: 1,
    };
    mockAddressRepository.findById.mockResolvedValue({
      id: 10,
      capacidade: 100,
      ocupado: 50,
      codigo: 'B1',
    } as any);

    await expect(useCase.execute(movRequest)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-EXP-001');
  });

  it('deve lançar erro [RN-INV-006] ao movimentar um lote que está em inventário', async () => {
    const loteId = 4;
    const batchMock: any = {
      id: loteId,
      produtoId: 10,
      numeroLote: 'L04',
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: true,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const movRequest: any = {
      tipo: 'SAIDA',
      loteId,
      quantidade: 10,
      motivo: 'Venda',
      enderecoOrigemId: 10,
      enderecoDestinoId: null,
      usuarioId: 1,
    };

    await expect(useCase.execute(movRequest)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-INV-006');
  });

  // === NOVOS TESTES: Entrega 2.1 ===

  it('deve lançar erro [RN-ARM-001] ao exceder capacidade do endereço destino', async () => {
    const batchMock: any = {
      id: 1,
      produtoId: 10,
      numeroLote: 'L01',
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const enderecoDestino: any = {
      id: 5,
      codigo: 'A-01-01',
      zona: 'A',
      tipoZona: 'SECO',
      capacidade: 100,
      ocupado: 95,
      ativo: true,
    };
    mockAddressRepository.findById.mockResolvedValue(enderecoDestino);

    const movRequest: any = {
      tipo: 'ENTRADA',
      loteId: 1,
      quantidade: 10,
      motivo: 'Compra',
      enderecoOrigemId: null,
      enderecoDestinoId: 5,
      usuarioId: 1,
    };

    await expect(useCase.execute(movRequest)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-ARM-001');
    expect(mockBatchRepository.updateQuantidade).not.toHaveBeenCalled();
  });

  it('deve lançar erro [RN-INV-006] ao tentar movimentar para um endereço bloqueado por inventário', async () => {
    const batchMock: any = {
      id: 1,
      produtoId: 10,
      numeroLote: 'L01',
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const enderecoDestino: any = {
      id: 5,
      codigo: 'A-01-01',
      zona: 'A',
      tipoZona: 'SECO',
      capacidade: 100,
      ocupado: 10,
      ativo: true,
      bloqueado: true,
    };
    mockAddressRepository.findById.mockResolvedValue(enderecoDestino);

    const movRequest: any = {
      tipo: 'ENTRADA',
      loteId: 1,
      quantidade: 10,
      motivo: 'Compra',
      enderecoOrigemId: null,
      enderecoDestinoId: 5,
      usuarioId: 1,
    };

    await expect(useCase.execute(movRequest)).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute(movRequest)).rejects.toThrow(
      'RN-INV-006: Endereço bloqueado',
    );
  });

  it('deve permitir movimentação se cabem no endereço destino (RN-ARM-001)', async () => {
    const batchMock: any = {
      id: 1,
      produtoId: 10,
      numeroLote: 'L01',
      quantidade: 50,
      validade: null,
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);
    mockProductRepository.findById.mockResolvedValue({
      id: 10,
      sku: 'SKU1',
      descricao: 'Prod',
      categoria: 'Cat',
      perecivel: false,
      tipoZonaRequerida: 'SECO',
      custoMedio: 10,
      ativo: true,
    } as any);

    const enderecoDestino: any = {
      id: 5,
      codigo: 'A-01-01',
      zona: 'A',
      tipoZona: 'SECO',
      capacidade: 100,
      ocupado: 80,
      ativo: true,
    };
    mockAddressRepository.findById.mockResolvedValue(enderecoDestino);

    const movRequest: any = {
      tipo: 'ENTRADA',
      loteId: 1,
      quantidade: 10,
      motivo: 'Compra',
      enderecoOrigemId: null,
      enderecoDestinoId: 5,
      usuarioId: 1,
    };

    mockMovementRepository.create.mockResolvedValue({
      id: 200,
      criadoEm: new Date(),
      hash: 'h',
      previousHash: null,
      ...movRequest,
    });

    const result = await useCase.execute(movRequest);
    expect(result.id).toBe(200);
    expect(mockAddressRepository.updateOcupacao).toHaveBeenCalledWith(
      5, 90
    );
  });

  it('deve lançar erro [RN-ARM-003] ao armazenar perecível em zona SECO', async () => {
    const batchMock: any = {
      id: 1,
      produtoId: 10,
      numeroLote: 'L01',
      quantidade: 50,
      validade: new Date('2027-01-01'),
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const enderecoDestino: any = {
      id: 5,
      codigo: 'A-01-01',
      zona: 'A',
      tipoZona: 'SECO',
      capacidade: 100,
      ocupado: 10,
      ativo: true,
    };
    mockAddressRepository.findById.mockResolvedValue(enderecoDestino);

    const produtoPerecivel: any = {
      id: 10,
      sku: 'LEITE01',
      descricao: 'Leite',
      categoria: 'Laticínios',
      perecivel: true,
      tipoZonaRequerida: 'REFRIGERADO',
      custoMedio: 5,
      ativo: true,
    };
    mockProductRepository.findById.mockResolvedValue(produtoPerecivel);

    const movRequest: any = {
      tipo: 'ENTRADA',
      loteId: 1,
      quantidade: 5,
      motivo: 'Compra',
      enderecoOrigemId: null,
      enderecoDestinoId: 5,
      usuarioId: 1,
    };

    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-ARM-003');
    expect(mockBatchRepository.updateQuantidade).not.toHaveBeenCalled();
  });

  it('deve permitir perecível em zona REFRIGERADO (RN-ARM-003)', async () => {
    const batchMock: any = {
      id: 1,
      produtoId: 10,
      numeroLote: 'L01',
      quantidade: 50,
      validade: new Date('2027-01-01'),
      ativo: true,
      emInventario: false,
    };
    mockBatchRepository.findById.mockResolvedValue(batchMock);

    const enderecoRefrigerado: any = {
      id: 6,
      codigo: 'R-01-01',
      zona: 'R',
      tipoZona: 'REFRIGERADO',
      capacidade: 100,
      ocupado: 10,
      ativo: true,
    };
    mockAddressRepository.findById.mockResolvedValue(enderecoRefrigerado);

    const produtoPerecivel: any = {
      id: 10,
      sku: 'LEITE01',
      descricao: 'Leite',
      categoria: 'Laticínios',
      perecivel: true,
      tipoZonaRequerida: 'REFRIGERADO',
      custoMedio: 5,
      ativo: true,
    };
    mockProductRepository.findById.mockResolvedValue(produtoPerecivel);

    const movRequest: any = {
      tipo: 'ENTRADA',
      loteId: 1,
      quantidade: 5,
      motivo: 'Compra',
      enderecoOrigemId: null,
      enderecoDestinoId: 6,
      usuarioId: 1,
    };

    mockMovementRepository.create.mockResolvedValue({
      id: 300,
      criadoEm: new Date(),
      hash: 'h',
      previousHash: null,
      ...movRequest,
    });

    const result = await useCase.execute(movRequest);
    expect(result.id).toBe(300);
  });
});
