import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { Produto } from '@prisma/client';

export interface ClassifyAbcDto {
  dias?: number;
}

export class ClassifyAbcUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly movementRepository: IMovementRepository,
  ) {}

  async execute(dto: ClassifyAbcDto): Promise<Produto[]> {
    const dias = dto.dias || 30;

    // 1. Buscar todos os produtos
    const products = await this.productRepository.findAll();

    // 2. Buscar quantidades de movimentações de saída agrupadas por produto
    const movementQuantities =
      await this.movementRepository.getMovementQuantitiesByProduct(dias);

    // Criar um mapa para consulta rápida de quantidade total movida por produtoId
    const qtyMap = new Map<number, number>();
    for (const mq of movementQuantities) {
      qtyMap.set(mq.produtoId, mq.quantidadeTotal);
    }

    // 3. Calcular o valor total movimentado de cada produto (quantidade * custoMedio)
    const productValues = products.map((product) => {
      const quantidade = qtyMap.get(product.id) || 0;
      const valorTotal = quantidade * product.custoMedio;
      return {
        product,
        valorTotal,
      };
    });

    // 4. Ordenar em ordem decrescente de valor total movimentado
    productValues.sort((a, b) => b.valorTotal - a.valorTotal);

    // 5. Calcular a soma de todos os valores movimentados
    const totalAll = productValues.reduce(
      (sum, item) => sum + item.valorTotal,
      0,
    );

    const updatedProducts: Produto[] = [];

    if (totalAll === 0) {
      // Se não houver movimentação de saída com valor, classifica todos como "C"
      for (const item of productValues) {
        const updated = await this.productRepository.updateCurvaAbc(
          item.product.id,
          'C',
        );
        updatedProducts.push(updated);
      }
    } else {
      let cumulativeValue = 0;

      for (const item of productValues) {
        const prevPercent = (cumulativeValue / totalAll) * 100;
        cumulativeValue += item.valorTotal;

        let curva = 'C';
        if (prevPercent < 80) {
          curva = 'A';
        } else if (prevPercent < 95) {
          curva = 'B';
        }

        const updated = await this.productRepository.updateCurvaAbc(
          item.product.id,
          curva,
        );
        updatedProducts.push(updated);
      }
    }

    return updatedProducts;
  }
}
