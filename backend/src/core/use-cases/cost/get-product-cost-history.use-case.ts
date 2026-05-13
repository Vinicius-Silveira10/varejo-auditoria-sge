import { ILogCustoRepository, LogCusto } from '../../interfaces/repositories/i-log-custo.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

export class GetProductCostHistoryUseCase {
  constructor(
    private readonly logCustoRepository: ILogCustoRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(produtoId: number): Promise<LogCusto[]> {
    const produto = await this.productRepository.findById(produtoId);
    if (!produto) {
      throw new Error(`Produto com ID ${produtoId} não encontrado.`);
    }

    return await this.logCustoRepository.findByProdutoId(produtoId);
  }
}
