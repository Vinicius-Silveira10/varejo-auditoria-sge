import { RegisterProductUseCase } from './register-product.use-case';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('RegisterProductUseCase', () => {
  let useCase: RegisterProductUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      updateCustoMedio: jest.fn(),
    };
    useCase = new RegisterProductUseCase(mockRepository);
  });

  it('deve registrar um novo produto com sucesso', async () => {
    const request = { sku: 'PROD-01', descricao: 'Feijao', categoria: 'Alimentos', perecivel: true };
    const mockCreated = { id: 1, custoMedio: 0, ativo: true, ...request };

    mockRepository.findBySku.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(mockCreated);

    const result = await useCase.execute(request);

    expect(mockRepository.findBySku).toHaveBeenCalledWith('PROD-01');
    expect(mockRepository.create).toHaveBeenCalledWith(request);
    expect(result).toEqual(mockCreated);
  });

  it('deve bloquear o cadastro se o SKU ja existir (RN-PROD-001)', async () => {
    const request = { sku: 'PROD-01', descricao: 'Feijao', categoria: 'Alimentos', perecivel: true };
    const existingProduct = { id: 1, custoMedio: 0, ativo: true, ...request };

    mockRepository.findBySku.mockResolvedValue(existingProduct);

    await expect(useCase.execute(request)).rejects.toThrow('RN-PROD-001: Já existe um produto cadastrado com o SKU PROD-01');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
