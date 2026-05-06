import { DisableProductUseCase } from './disable-product.use-case';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('DisableProductUseCase', () => {
  let useCase: DisableProductUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    };
    useCase = new DisableProductUseCase(mockRepository);
  });

  it('deve desativar um produto existente', async () => {
    const mockProduct = { id: 1, sku: 'PROD-01', descricao: 'Teste', categoria: 'Teste', perecivel: false, custoMedio: 0, ativo: true };
    const mockDisabledProduct = { ...mockProduct, ativo: false };

    mockRepository.findById.mockResolvedValue(mockProduct);
    mockRepository.disable.mockResolvedValue(mockDisabledProduct);

    const result = await useCase.execute(1);

    expect(mockRepository.findById).toHaveBeenCalledWith(1);
    expect(mockRepository.disable).toHaveBeenCalledWith(1);
    expect(result.ativo).toBe(false);
  });

  it('deve falhar se o produto não for encontrado (RN-PROD-002)', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(99)).rejects.toThrow('RN-PROD-002: Produto com ID 99 não encontrado');
    expect(mockRepository.disable).not.toHaveBeenCalled();
  });

  it('deve falhar se o produto já estiver desativado (RN-PROD-003)', async () => {
    const mockProduct = { id: 1, sku: 'PROD-01', descricao: 'Teste', categoria: 'Teste', perecivel: false, custoMedio: 0, ativo: false };
    mockRepository.findById.mockResolvedValue(mockProduct);

    await expect(useCase.execute(1)).rejects.toThrow('RN-PROD-003: O produto com ID 1 já está desativado');
    expect(mockRepository.disable).not.toHaveBeenCalled();
  });
});
