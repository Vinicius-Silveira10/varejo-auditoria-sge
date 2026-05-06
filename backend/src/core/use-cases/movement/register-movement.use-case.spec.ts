import { RegisterMovementUseCase } from './register-movement.use-case';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Lote, Movimentacao } from '@prisma/client';

describe('RegisterMovementUseCase', () => {
  let useCase: RegisterMovementUseCase;
  let batchRepository: jest.Mocked<IBatchRepository>;
  let movementRepository: jest.Mocked<IMovementRepository>;
  let addressRepository: jest.Mocked<IAddressRepository>;
  let productRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    batchRepository = {
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
      updateInventarioStatus: jest.fn(),
      create: jest.fn(),
    } as any;

    movementRepository = {
      create: jest.fn(),
      findByLote: jest.fn(),
      findAllOrdered: jest.fn(),
    } as any;

    addressRepository = {
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      create: jest.fn(),
      disable: jest.fn(),
      updateOcupacao: jest.fn(),
    } as any;

    productRepository = {
      findById: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    } as any;

    useCase = new RegisterMovementUseCase(batchRepository, movementRepository, addressRepository, productRepository);
  });

  it('deve registrar uma ENTRADA e incrementar a quantidade do lote', async () => {
    const loteId = 1;
    const batchMock: any = { id: loteId, produtoId: 10, numeroLote: 'L01', quantidade: 50, validade: null, ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);
    
    const movRequest: any = {
      tipo: 'ENTRADA', loteId, quantidade: 20, motivo: 'Compra', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };

    movementRepository.create.mockResolvedValue({ id: 100, criadoEm: new Date(), hash: 'h', previousHash: null, ...movRequest });

    const result = await useCase.execute(movRequest);

    expect(batchRepository.findById).toHaveBeenCalledWith(loteId);
    expect(batchRepository.updateQuantidade).toHaveBeenCalledWith(loteId, 70); // 50 + 20
    expect(result.id).toBeDefined();
  });

  it('deve registrar uma SAIDA e decrementar a quantidade do lote', async () => {
    const loteId = 2;
    const batchMock: any = { id: loteId, produtoId: 10, numeroLote: 'L02', quantidade: 50, validade: null, ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);
    
    const movRequest: any = {
      tipo: 'SAIDA', loteId, quantidade: 10, motivo: 'Venda', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };

    movementRepository.create.mockResolvedValue({ id: 101, criadoEm: new Date(), hash: 'h', previousHash: null, ...movRequest });

    const result = await useCase.execute(movRequest);

    expect(batchRepository.updateQuantidade).toHaveBeenCalledWith(loteId, 40); // 50 - 10
  });

  it('deve lançar erro [RN-TRV-002] ao tentar fazer SAIDA com saldo negativo', async () => {
    const loteId = 3;
    const batchMock: any = { id: loteId, produtoId: 10, numeroLote: 'L03', quantidade: 5, validade: null, ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);
    
    const movRequest: any = {
      tipo: 'SAIDA', loteId, quantidade: 10, motivo: 'Venda', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };

    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-TRV-002');
    expect(batchRepository.updateQuantidade).not.toHaveBeenCalled();
  });

  it('deve lançar erro [RN-EXP-001] (FEFO) ao expedir um lote se houver outro mais antigo', async () => {
    const produtoId = 10;
    const loteSolicitado: any = { 
      id: 1, produtoId, numeroLote: 'L_NOVO', quantidade: 100, validade: new Date('2027-01-01'), ativo: true, emInventario: false 
    };
    const loteAntigo: any = { 
      id: 2, produtoId, numeroLote: 'L_ANTIGO', quantidade: 50, validade: new Date('2026-10-01'), ativo: true, emInventario: false 
    };

    batchRepository.findById.mockResolvedValue(loteSolicitado);
    batchRepository.findAvailableByProduct.mockResolvedValue([loteSolicitado, loteAntigo]);
    
    const movRequest: any = {
      tipo: 'EXPEDICAO', loteId: 1, quantidade: 10, motivo: 'Despacho', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };

    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-EXP-001');
  });

  it('deve lançar erro [RN-INV-006] ao movimentar um lote que está em inventário', async () => {
    const loteId = 4;
    const batchMock: any = { id: loteId, produtoId: 10, numeroLote: 'L04', quantidade: 50, validade: null, ativo: true, emInventario: true };
    batchRepository.findById.mockResolvedValue(batchMock);
    
    const movRequest: any = {
      tipo: 'SAIDA', loteId, quantidade: 10, motivo: 'Venda', enderecoOrigemId: null, enderecoDestinoId: null, usuarioId: 1
    };

    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-INV-006');
  });

  // === NOVOS TESTES: Entrega 2.1 ===

  it('deve lançar erro [RN-ARM-001] ao exceder capacidade do endereço destino', async () => {
    const batchMock: any = { id: 1, produtoId: 10, numeroLote: 'L01', quantidade: 50, validade: null, ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);

    const enderecoDestino: any = { id: 5, codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 95, ativo: true };
    addressRepository.findById.mockResolvedValue(enderecoDestino);

    const movRequest: any = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 10, motivo: 'Compra', enderecoOrigemId: null, enderecoDestinoId: 5, usuarioId: 1
    };

    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-ARM-001');
    expect(batchRepository.updateQuantidade).not.toHaveBeenCalled();
  });

  it('deve permitir movimentação se cabem no endereço destino (RN-ARM-001)', async () => {
    const batchMock: any = { id: 1, produtoId: 10, numeroLote: 'L01', quantidade: 50, validade: null, ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);
    productRepository.findById.mockResolvedValue({ id: 10, sku: 'SKU1', descricao: 'Prod', categoria: 'Cat', perecivel: false, custoMedio: 10, ativo: true } as any);

    const enderecoDestino: any = { id: 5, codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 80, ativo: true };
    addressRepository.findById.mockResolvedValue(enderecoDestino);

    const movRequest: any = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 10, motivo: 'Compra', enderecoOrigemId: null, enderecoDestinoId: 5, usuarioId: 1
    };

    movementRepository.create.mockResolvedValue({ id: 200, criadoEm: new Date(), hash: 'h', previousHash: null, ...movRequest });

    const result = await useCase.execute(movRequest);
    expect(result.id).toBe(200);
    expect(addressRepository.updateOcupacao).toHaveBeenCalledWith(5, 90); // 80 + 10
  });

  it('deve lançar erro [RN-ARM-003] ao armazenar perecível em zona SECO', async () => {
    const batchMock: any = { id: 1, produtoId: 10, numeroLote: 'L01', quantidade: 50, validade: new Date('2027-01-01'), ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);

    const enderecoDestino: any = { id: 5, codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 10, ativo: true };
    addressRepository.findById.mockResolvedValue(enderecoDestino);

    const produtoPerecivel: any = { id: 10, sku: 'LEITE01', descricao: 'Leite', categoria: 'Laticínios', perecivel: true, custoMedio: 5, ativo: true };
    productRepository.findById.mockResolvedValue(produtoPerecivel);

    const movRequest: any = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 5, motivo: 'Compra', enderecoOrigemId: null, enderecoDestinoId: 5, usuarioId: 1
    };

    await expect(useCase.execute(movRequest)).rejects.toThrow('RN-ARM-003');
    expect(batchRepository.updateQuantidade).not.toHaveBeenCalled();
  });

  it('deve permitir perecível em zona REFRIGERADO (RN-ARM-003)', async () => {
    const batchMock: any = { id: 1, produtoId: 10, numeroLote: 'L01', quantidade: 50, validade: new Date('2027-01-01'), ativo: true, emInventario: false };
    batchRepository.findById.mockResolvedValue(batchMock);

    const enderecoRefrigerado: any = { id: 6, codigo: 'R-01-01', zona: 'R', tipoZona: 'REFRIGERADO', capacidade: 100, ocupado: 10, ativo: true };
    addressRepository.findById.mockResolvedValue(enderecoRefrigerado);

    const produtoPerecivel: any = { id: 10, sku: 'LEITE01', descricao: 'Leite', categoria: 'Laticínios', perecivel: true, custoMedio: 5, ativo: true };
    productRepository.findById.mockResolvedValue(produtoPerecivel);

    const movRequest: any = {
      tipo: 'ENTRADA', loteId: 1, quantidade: 5, motivo: 'Compra', enderecoOrigemId: null, enderecoDestinoId: 6, usuarioId: 1
    };

    movementRepository.create.mockResolvedValue({ id: 300, criadoEm: new Date(), hash: 'h', previousHash: null, ...movRequest });

    const result = await useCase.execute(movRequest);
    expect(result.id).toBe(300);
  });
});
