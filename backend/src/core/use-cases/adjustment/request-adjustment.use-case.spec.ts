import { RequestAdjustmentUseCase } from './request-adjustment.use-case';
import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('RequestAdjustmentUseCase', () => {
  let useCase: RequestAdjustmentUseCase;
  let mockAdjRepo: jest.Mocked<IAdjustmentRepository>;
  let mockBatchRepo: jest.Mocked<IBatchRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockAdjRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockBatchRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAvailableByProduct: jest.fn(),
      updateQuantidade: jest.fn(),
    };
    mockProductRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };
    useCase = new RequestAdjustmentUseCase(mockAdjRepo, mockBatchRepo, mockProductRepo);
  });

  it('deve registrar pendência e pedir aprovação de GESTOR se abaixo do limite', async () => {
    mockBatchRepo.findById.mockResolvedValue({ id: 1, produtoId: 1, quantidade: 100 } as any);
    mockProductRepo.findById.mockResolvedValue({ id: 1, custoMedio: 10 } as any);
    mockAdjRepo.create.mockResolvedValue({ id: 1 } as any);

    // Delta de 1 unidade (1%). Valor de 10 reais. (Abaixo de 2% e 1000 reais)
    const result = await useCase.execute({
      loteId: 1,
      quantidadeDelta: 1,
      motivo: 'Quebra na prateleira',
      solicitanteId: 2,
    });

    expect(result.nivelAprovacaoExigido).toBe('GESTOR');
    expect(mockAdjRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      loteId: 1,
      quantidadeDelta: 1,
      valorDelta: 10,
      statusAprovacao: 'PENDENTE'
    }));
  });

  it('deve exigir GESTOR_CONTROLADORIA se |delta%| > 2%', async () => {
    mockBatchRepo.findById.mockResolvedValue({ id: 1, produtoId: 1, quantidade: 100 } as any);
    mockProductRepo.findById.mockResolvedValue({ id: 1, custoMedio: 10 } as any);
    mockAdjRepo.create.mockResolvedValue({ id: 1 } as any);

    // Delta de 3 unidades (3%). (Acima de 2%)
    const result = await useCase.execute({
      loteId: 1,
      quantidadeDelta: -3,
      motivo: 'Avaria',
      solicitanteId: 2,
    });

    expect(result.nivelAprovacaoExigido).toBe('GESTOR_CONTROLADORIA');
  });

  it('deve exigir GESTOR_CONTROLADORIA se |valorDelta| > 1000', async () => {
    mockBatchRepo.findById.mockResolvedValue({ id: 1, produtoId: 1, quantidade: 1000 } as any);
    mockProductRepo.findById.mockResolvedValue({ id: 1, custoMedio: 1500 } as any);
    mockAdjRepo.create.mockResolvedValue({ id: 1 } as any);

    // Delta de 1 unidade (0.1%), mas valor = 1500 (> 1000)
    const result = await useCase.execute({
      loteId: 1,
      quantidadeDelta: -1,
      motivo: 'Roubo',
      solicitanteId: 2,
    });

    expect(result.nivelAprovacaoExigido).toBe('GESTOR_CONTROLADORIA');
  });

  it('deve falhar se não houver motivo', async () => {
    await expect(useCase.execute({ loteId: 1, quantidadeDelta: 1, motivo: '', solicitanteId: 2 }))
      .rejects.toThrow('RN-AJU-001: Todo ajuste deve ter motivo classificado.');
  });

  it('deve falhar se o lote estiver em inventário (RN-INV-006)', async () => {
    mockBatchRepo.findById.mockResolvedValue({ id: 1, emInventario: true } as any);
    
    await expect(useCase.execute({ loteId: 1, quantidadeDelta: 1, motivo: 'Ajuste', solicitanteId: 2 }))
      .rejects.toThrow('RN-INV-006');
  });
});
