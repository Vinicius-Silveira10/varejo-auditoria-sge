import { IOrderRepository, PedidoExpedicaoWithItems } from '../../interfaces/repositories/i-order.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { CreateOrderDto } from '../../../infrastructure/http/dtos/create-order.dto';

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(data: CreateOrderDto): Promise<PedidoExpedicaoWithItems> {
    // Validar se todos os produtos existem
    for (const item of data.itens) {
      const produto = await this.productRepository.findById(item.produtoId);
      if (!produto) {
        throw new Error(`Produto com ID ${item.produtoId} não encontrado.`);
      }
    }

    return await this.orderRepository.create({
      codigoPedido: data.codigoPedido,
      itens: data.itens,
    });
  }
}
