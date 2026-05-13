import { CreateOrderUseCase } from './create-order.use-case';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let orderRepository: jest.Mocked<IOrderRepository>;
  let productRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    orderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateConferentes: jest.fn(),
      findAll: jest.fn(),
    } as any;

    productRepository = {
      findById: jest.fn(),
      findBySku: jest.fn(),
      create: jest.fn(),
      updateCustoMedio: jest.fn(),
      disable: jest.fn(),
    } as any;

    useCase = new CreateOrderUseCase(orderRepository, productRepository);
  });

  it('deve criar um pedido com sucesso', async () => {
    const dto = {
      codigoPedido: 'ORD-001',
      itens: [{ produtoId: 1, quantidadeSolicitada: 10 }]
    };

    productRepository.findById.mockResolvedValue({ id: 1, sku: 'PROD1', nome: 'Produto 1' } as any);
    orderRepository.create.mockResolvedValue({ id: 1, ...dto, status: 'CRIADO', itens: [] } as any);

    const result = await useCase.execute(dto);

    expect(result.id).toBe(1);
    expect(orderRepository.create).toHaveBeenCalled();
  });

  it('deve lançar erro se o produto não existir', async () => {
    const dto = {
      codigoPedido: 'ORD-002',
      itens: [{ produtoId: 999, quantidadeSolicitada: 10 }]
    };

    productRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow('Produto com ID 999 não encontrado');
  });
});
