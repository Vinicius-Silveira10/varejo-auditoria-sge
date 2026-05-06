import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { Produto } from '@prisma/client';

export class DisableProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(id: number): Promise<Produto> {
    const existingProduct = await this.productRepository.findById(id);
    if (!existingProduct) {
      throw new Error(`RN-PROD-002: Produto com ID ${id} não encontrado`);
    }
    
    if (!existingProduct.ativo) {
      throw new Error(`RN-PROD-003: O produto com ID ${id} já está desativado`);
    }

    return this.productRepository.disable(id);
  }
}
