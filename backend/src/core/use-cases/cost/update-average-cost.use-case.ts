import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { ILogCustoRepository } from '../../interfaces/repositories/i-log-custo.repository';

export interface UpdateAverageCostDto {
  produtoId: number;
  quantidadeEntrada: number;
  custoEntrada: number;
  motivo?: string;
}

export class UpdateAverageCostUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly logCustoRepository: ILogCustoRepository,
  ) {}

  async execute(dto: UpdateAverageCostDto) {
    if (dto.quantidadeEntrada <= 0) {
      throw new Error('RN-CST-001: Quantidade de entrada deve ser maior que zero para cálculo de custo.');
    }
    if (dto.custoEntrada < 0) {
      throw new Error('RN-CST-001: Custo de entrada não pode ser negativo.');
    }

    const produto = await this.productRepository.findById(dto.produtoId);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    const lotes = await this.batchRepository.findAvailableByProduct(dto.produtoId);
    const quantidadeAnterior = lotes.reduce((acc, lote) => acc + lote.quantidade, 0);
    const custoAnterior = produto.custoMedio;

    let novoCusto = 0;
    const quantidadeNova = quantidadeAnterior + dto.quantidadeEntrada;

    if (quantidadeAnterior === 0) {
      // Se não havia saldo anterior, o custo médio é exatamente o custo da nova entrada
      novoCusto = dto.custoEntrada;
    } else {
      // Fórmula do Custo Médio Ponderado
      novoCusto = ((custoAnterior * quantidadeAnterior) + (dto.custoEntrada * dto.quantidadeEntrada)) / quantidadeNova;
    }

    // Arredondamento de 6 casas decimais (RN-CST-001/Riscos)
    novoCusto = Number(novoCusto.toFixed(6));

    // Atualizar no Produto
    const produtoAtualizado = await this.productRepository.updateCustoMedio(produto.id, novoCusto);

    // Gravar Log de Rastreabilidade (RN-CST-001 / RN-AJU-004)
    const log = await this.logCustoRepository.create({
      produtoId: produto.id,
      custoAnterior,
      custoNovo: novoCusto,
      quantidadeAnterior,
      quantidadeNova,
      motivo: dto.motivo,
    });

    return {
      produto: produtoAtualizado,
      log,
    };
  }
}
