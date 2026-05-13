import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

export interface InventoryValueItem {
  produtoId: number;
  sku: string;
  descricao: string;
  quantidadeTotal: number;
  custoMedio: number;
  valorTotal: number;
}

export interface InventoryValueReport {
  itens: InventoryValueItem[];
  valorTotalGeral: number;
}

export class GetInventoryValueReportUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly batchRepository: IBatchRepository,
  ) {}

  async execute(): Promise<InventoryValueReport> {
    const produtos = await this.productRepository.findAll();
    const reportItems: InventoryValueItem[] = [];
    let valorTotalGeral = 0;

    for (const produto of produtos) {
      const lotes = await this.batchRepository.findAvailableByProduct(produto.id);
      const quantidadeTotal = lotes.reduce((acc, lote) => acc + lote.quantidade, 0);
      const valorTotal = Number((quantidadeTotal * produto.custoMedio).toFixed(2));

      if (quantidadeTotal > 0) {
        reportItems.push({
          produtoId: produto.id,
          sku: produto.sku,
          descricao: produto.descricao,
          quantidadeTotal,
          custoMedio: produto.custoMedio,
          valorTotal,
        });
        valorTotalGeral += valorTotal;
      }
    }

    return {
      itens: reportItems,
      valorTotalGeral: Number(valorTotalGeral.toFixed(2)),
    };
  }
}
