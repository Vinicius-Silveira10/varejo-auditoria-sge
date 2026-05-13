import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { UpdateAverageCostUseCase } from '../cost/update-average-cost.use-case';
import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { Lote } from '@prisma/client';

export interface ReceiveBatchRequest {
  numeroLote: string;
  produtoId: number;
  quantidade: number;
  validade?: Date;
  custoAquisicao: number;
  evidenciaUrl?: string;
  notaFiscalId?: number;
}

export class ReceiveBatchUseCase {
  constructor(
    private readonly batchRepository: IBatchRepository,
    private readonly productRepository: IProductRepository,
    private readonly updateAverageCostUseCase: UpdateAverageCostUseCase,
    private readonly notaFiscalRepository: INotaFiscalRepository
  ) {}

  async execute(request: ReceiveBatchRequest): Promise<Lote> {
    const produto = await this.productRepository.findById(request.produtoId);
    
    if (!produto) {
      throw new Error(`RN-BAT-001: Produto com ID ${request.produtoId} não encontrado`);
    }

    if (!produto.ativo) {
      throw new Error(`RN-BAT-002: Não é possível receber lote para um produto desativado`);
    }

    // RN-REC-001: Conciliação automática NF-e vs Físico
    if (request.notaFiscalId) {
      const nfe = await this.notaFiscalRepository.findById(request.notaFiscalId);
      if (!nfe) {
        throw new Error(`RN-REC-001: NF-e com ID ${request.notaFiscalId} não encontrada`);
      }

      const itemNfe = nfe.itensNfe.find((item) => item.produtoSku === produto.sku);
      if (!itemNfe) {
        throw new Error(`RN-REC-001: Produto ${produto.sku} não encontrado na NF-e ${request.notaFiscalId}`);
      }

      if (itemNfe.quantidade !== request.quantidade) {
        const divergencias = JSON.stringify([{
          sku: produto.sku,
          tipo: 'QUANTIDADE_DIVERGENTE',
          detalhe: `Quantidade física (${request.quantidade}) difere da NF-e (${itemNfe.quantidade})`,
          quantidadeNfe: itemNfe.quantidade,
          quantidadeFisica: request.quantidade
        }]);
        await this.notaFiscalRepository.updateStatus(request.notaFiscalId, 'DIVERGENTE', divergencias);
      }
    }

    // RN-REC-003: Perecíveis exigem lote/validade e evidência fotográfica obrigatórios
    if (produto.perecivel) {
      if (!request.validade) {
        throw new Error('RN-REC-003: Produto perecível exige data de validade obrigatória no recebimento.');
      }
      if (!request.evidenciaUrl) {
        throw new Error('RN-REC-003: Produto perecível exige foto de evidência obrigatória no recebimento.');
      }
    }

    // RN-CST-001: Atualização do Custo Médio usando o caso de uso oficial (gera logs e garante precisão)
    await this.updateAverageCostUseCase.execute({
      produtoId: produto.id,
      quantidadeEntrada: request.quantidade,
      custoEntrada: request.custoAquisicao,
      motivo: `Recebimento de Lote ${request.numeroLote}`,
    });

    // Salva o novo lote
    const lote = await this.batchRepository.create({
      numeroLote: request.numeroLote,
      produtoId: request.produtoId,
      quantidade: request.quantidade,
      validade: request.validade ? new Date(request.validade) : null,
      ativo: true,
      emInventario: false,
      notaFiscalId: request.notaFiscalId || null,
      evidenciaUrl: request.evidenciaUrl || null,
    });

    // RN-REC-001: Fechamento de status da NF-e (Se todos os itens foram recebidos)
    if (request.notaFiscalId) {
      const nfe = await this.notaFiscalRepository.findById(request.notaFiscalId);
      if (nfe) {
        const lotesRecebidos = await this.batchRepository.countByNotaFiscal(request.notaFiscalId);
        if (lotesRecebidos === nfe.itensNfe.length) {
          // Só muda para CONFERIDO se não estiver DIVERGENTE
          if (nfe.status !== 'DIVERGENTE') {
            await this.notaFiscalRepository.updateStatus(request.notaFiscalId, 'CONFERIDO');
          }
        }
      }
    }

    return lote;
  }
}
