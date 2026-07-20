import { ListPendingAdjustmentsUseCase } from './list-pending-adjustments.use-case';
import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';

describe('ListPendingAdjustmentsUseCase', () => {
  let useCase: ListPendingAdjustmentsUseCase;
  let mockAdjRepo: jest.Mocked<IAdjustmentRepository>;

  beforeEach(() => {
    mockAdjRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      sumFinancialLosses: jest.fn(),
      findPending: jest.fn(),
    };
    useCase = new ListPendingAdjustmentsUseCase(mockAdjRepo);
  });

  it('deve retornar lista vazia quando não há ajustes pendentes', async () => {
    mockAdjRepo.findPending.mockResolvedValue([]);
    const result = await useCase.execute('PENDENTE');
    expect(result).toEqual([]);
    expect(mockAdjRepo.findPending).toHaveBeenCalledWith('PENDENTE');
  });

  it('deve retornar apenas ajustes do status filtrado', async () => {
    const mockAjustes = [
      { id: 1, statusAprovacao: 'PENDENTE' },
    ] as any;
    mockAdjRepo.findPending.mockResolvedValue(mockAjustes);
    
    const result = await useCase.execute('PENDENTE');
    
    expect(result).toHaveLength(1);
    expect(result[0].statusAprovacao).toBe('PENDENTE');
    expect(mockAdjRepo.findPending).toHaveBeenCalledWith('PENDENTE');
  });

  it('deve retornar dados de Lote e Produto corretamente populados', async () => {
    const mockAjusteEnriquecido = {
      id: 1,
      loteId: 10,
      quantidadeDelta: 5,
      motivo: 'Teste',
      valorDelta: 50,
      statusAprovacao: 'PENDENTE',
      solicitanteId: 1,
      lote: {
        numeroLote: 'LOTE-123',
        produto: {
          sku: 'SKU-001',
          descricao: 'Produto Teste',
        },
      },
    } as any;
    
    mockAdjRepo.findPending.mockResolvedValue([mockAjusteEnriquecido]);
    
    const result = await useCase.execute();
    
    expect(result).toHaveLength(1);
    expect(result[0].lote.numeroLote).toBe('LOTE-123');
    expect(result[0].lote.produto.sku).toBe('SKU-001');
    expect(result[0].lote.produto.descricao).toBe('Produto Teste');
  });
});
