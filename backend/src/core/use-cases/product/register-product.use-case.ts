import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Produto } from '@prisma/client';

export type RegisterProductRequest = Omit<Produto, 'id' | 'custoMedio' | 'ativo'>;

export class RegisterProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(request: RegisterProductRequest): Promise<Produto> {
    const existingProduct = await this.productRepository.findBySku(request.sku);
    if (existingProduct) {
      throw new Error(`RN-PROD-001: Já existe um produto cadastrado com o SKU ${request.sku}`);
    }

    return this.productRepository.create(request);
  }
}
