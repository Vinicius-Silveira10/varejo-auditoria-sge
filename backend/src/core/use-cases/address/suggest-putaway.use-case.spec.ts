import { SuggestPutawayUseCase } from './suggest-putaway.use-case';
import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('SuggestPutawayUseCase', () => {
  let useCase: SuggestPutawayUseCase;
  let mockAddressRepo: jest.Mocked<IAddressRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockAddressRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findAvailableByZona: jest.fn(),
      disable: jest.fn(),
      updateOcupacao: jest.fn(),
    };

    mockProductRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };

    useCase = new SuggestPutawayUseCase(mockAddressRepo, mockProductRepo);
  });

  it('deve sugerir endereços SECO para produto não perecível (RN-ARM-002/003)', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 1, sku: 'ARROZ-5KG', descricao: 'Arroz', categoria: 'Grãos', perecivel: false, tipoZonaRequerida: 'SECO', custoMedio: 12, ativo: true,
    } as any);

    mockAddressRepo.findAvailableByZona.mockResolvedValue([
      { id: 1, codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 80, ativo: true },
      { id: 2, codigo: 'A-02-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 20, ativo: true },
      { id: 3, codigo: 'B-01-01', zona: 'B', tipoZona: 'SECO', capacidade: 50, ocupado: 10, ativo: true },
    ] as any);

    const result = await useCase.execute({ produtoId: 1, quantidade: 20 });

    expect(result.tipoZonaRequerida).toBe('SECO');
    expect(result.perecivel).toBe(false);
    expect(result.sugestoes.length).toBeGreaterThan(0);
    // Primeiro sugerido deve ser o mais ocupado (consolidação de estoque)
    expect(result.sugestoes[0].codigo).toBe('A-01-01');
    expect(mockAddressRepo.findAvailableByZona).toHaveBeenCalledWith('SECO');
  });

  it('deve sugerir endereços REFRIGERADO para produto perecível (RN-ARM-003)', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 2, sku: 'LEITE-1L', descricao: 'Leite', categoria: 'Laticínios', perecivel: true, tipoZonaRequerida: 'REFRIGERADO', custoMedio: 5, ativo: true,
    } as any);

    mockAddressRepo.findAvailableByZona.mockResolvedValue([
      { id: 10, codigo: 'R-01-01', zona: 'R', tipoZona: 'REFRIGERADO', capacidade: 50, ocupado: 30, ativo: true },
    ] as any);

    const result = await useCase.execute({ produtoId: 2, quantidade: 10 });

    expect(result.tipoZonaRequerida).toBe('REFRIGERADO');
    expect(result.perecivel).toBe(true);
    expect(result.sugestoes[0].tipoZona).toBe('REFRIGERADO');
    expect(mockAddressRepo.findAvailableByZona).toHaveBeenCalledWith('REFRIGERADO');
  });

  it('deve filtrar endereços sem capacidade suficiente (RN-ARM-001/004)', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 1, sku: 'ARROZ', descricao: 'Arroz', categoria: 'C', perecivel: false, tipoZonaRequerida: 'SECO', custoMedio: 10, ativo: true,
    } as any);

    mockAddressRepo.findAvailableByZona.mockResolvedValue([
      { id: 1, codigo: 'A-01-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 95, ativo: true }, // Só cabe 5
      { id: 2, codigo: 'A-02-01', zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: 20, ativo: true }, // Cabe 80
    ] as any);

    const result = await useCase.execute({ produtoId: 1, quantidade: 50 });

    // Só o endereço com espaço suficiente (80 disponíveis) deve aparecer
    expect(result.sugestoes).toHaveLength(1);
    expect(result.sugestoes[0].codigo).toBe('A-02-01');
    expect(result.sugestoes[0].espacoDisponivel).toBe(80);
  });

  it('deve falhar se produto não existir', async () => {
    mockProductRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ produtoId: 99, quantidade: 10 })).rejects.toThrow('RN-ARM-002');
  });

  it('deve falhar se produto estiver desativado', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 1, sku: 'X', descricao: 'X', categoria: 'C', perecivel: false, custoMedio: 0, ativo: false,
    } as any);

    await expect(useCase.execute({ produtoId: 1, quantidade: 10 })).rejects.toThrow('desativado');
  });

  it('deve retornar lista vazia se nenhum endereço tiver capacidade', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 1, sku: 'X', descricao: 'X', categoria: 'C', perecivel: false, tipoZonaRequerida: 'SECO', custoMedio: 0, ativo: true,
    } as any);

    mockAddressRepo.findAvailableByZona.mockResolvedValue([
      { id: 1, codigo: 'A-01', zona: 'A', tipoZona: 'SECO', capacidade: 10, ocupado: 10, ativo: true }, // Cheio
    ] as any);

    const result = await useCase.execute({ produtoId: 1, quantidade: 5 });

    expect(result.sugestoes).toHaveLength(0);
  });

  it('deve tentar CONGELADO como fallback para perecível sem espaço REFRIGERADO (RN-ARM-003)', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 2, sku: 'LEITE', descricao: 'Leite', categoria: 'L', perecivel: true, tipoZonaRequerida: 'REFRIGERADO', custoMedio: 5, ativo: true,
    } as any);

    mockAddressRepo.findAvailableByZona
      .mockResolvedValueOnce([]) // REFRIGERADO vazio
      .mockResolvedValueOnce([ // CONGELADO disponível
        { id: 20, codigo: 'C-01-01', zona: 'C', tipoZona: 'CONGELADO', capacidade: 100, ocupado: 10, ativo: true },
      ] as any);

    const result = await useCase.execute({ produtoId: 2, quantidade: 10 });

    expect(result.sugestoes).toHaveLength(1);
    expect(result.sugestoes[0].tipoZona).toBe('CONGELADO');
    expect(mockAddressRepo.findAvailableByZona).toHaveBeenCalledWith('CONGELADO');
  });

  it('deve limitar sugestões a no máximo 5 endereços', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 1, sku: 'X', descricao: 'X', categoria: 'C', perecivel: false, tipoZonaRequerida: 'SECO', custoMedio: 0, ativo: true,
    } as any);

    const manyAddresses = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, codigo: `A-0${i}`, zona: 'A', tipoZona: 'SECO', capacidade: 100, ocupado: i * 10, ativo: true,
    }));
    mockAddressRepo.findAvailableByZona.mockResolvedValue(manyAddresses as any);

    const result = await useCase.execute({ produtoId: 1, quantidade: 5 });

    expect(result.sugestoes.length).toBeLessThanOrEqual(5);
  });
});
