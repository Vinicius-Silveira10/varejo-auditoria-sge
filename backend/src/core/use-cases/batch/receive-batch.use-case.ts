import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { UpdateAverageCostUseCase } from '../cost/update-average-cost.use-case';
import { Lote } from '@prisma/client';

export interface ReceiveBatchRequest {
  numeroLote: string;
  produtoId: number;
  quantidade: number;
  validade?: Date;
  custoAquisicao: number;
}

export class ReceiveBatchUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly productRepository: IProductRepository,
    private readonly updateAverageCostUseCase: UpdateAverageCostUseCase
  ) {}

  async execute(request: ReceiveBatchRequest): Promise<Lote> {
    const produto = await this.productRepository.findById(request.produtoId);
    
    if (!produto) {
      throw new Error(`RN-BAT-001: Produto com ID ${request.produtoId} não encontrado`);
    }

    if (!produto.ativo) {
      throw new Error(`RN-BAT-002: Não é possível receber lote para um produto desativado`);
    }

    // RN-REC-003: Perecíveis exigem lote/validade obrigatórios
    if (produto.perecivel && !request.validade) {
      throw new Error('RN-REC-003: Produto perecível exige data de validade obrigatória no recebimento.');
    }

    // RN-CST-001: Atualização do Custo Médio usando o caso de uso oficial (gera logs e garante precisão)
    await this.updateAverageCostUseCase.execute({
      produtoId: produto.id,
      quantidadeEntrada: request.quantidade,
      custoEntrada: request.custoAquisicao,
      motivo: `Recebimento de Lote ${request.numeroLote}`,
    });

    // Salva o novo lote
    return this.batchRepository.create({
      numeroLote: request.numeroLote,
      produtoId: request.produtoId,
      quantidade: request.quantidade,
      validade: request.validade ? new Date(request.validade) : null,
      ativo: true,
      emInventario: false,
      notaFiscalId: null,
    });
  }
}
