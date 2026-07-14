import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { INotaFiscalRepository } from '../../interfaces/repositories/i-nota-fiscal.repository';
import { ProcessNfeUseCase } from '../nfe/process-nfe.use-case';
import { Lote } from '@prisma/client';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';

export interface ReceiveBatchRequest {
  numeroLote: string;
  produtoId: number;
  quantidade: number;
  validade?: Date;
  custoAquisicao: number;
  evidenciaUrl?: string;
  notaFiscalId?: number;
  usuarioId: number;
}

/**
 * GAP-009 FIX: Recálculo do custo médio de forma síncrona transacional (UnitOfWork).
 */
export class ReceiveBatchUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly notaFiscalRepository: INotaFiscalRepository,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(request: ReceiveBatchRequest): Promise<Lote> {
    const produto = await this.productRepository.findById(request.produtoId);

    if (!produto) {
      throw new NotFoundException(
        `RN-BAT-001: Produto com ID ${request.produtoId} não encontrado`,
      );
    }

    if (!produto.ativo) {
      throw new DomainException(
        `RN-BAT-002: Não é possível receber lote para um produto desativado`,
      );
    }

    // RN-REC-001: Conciliação automática NF-e vs Físico
    if (request.notaFiscalId) {
      const nfe = await this.notaFiscalRepository.findById(
        request.notaFiscalId,
      );
      if (!nfe) {
        throw new NotFoundException(
          `RN-REC-001: NF-e com ID ${request.notaFiscalId} não encontrada`,
        );
      }

      const itemNfe = nfe.itensNfe.find(
        (item) => item.produtoSku === produto.sku,
      );
      if (!itemNfe) {
        throw new DomainException(
          `RN-REC-001: Produto ${produto.sku} não encontrado na NF-e ${request.notaFiscalId}`,
        );
      }

      // GAP-004 FIX — RN-REC-001: Tolerância sistêmica de 2% para divergências de quantidade
      const dentroTolerancia = ProcessNfeUseCase.isQuantidadeDentroTolerancia(
        itemNfe.quantidade,
        request.quantidade,
      );

      if (!dentroTolerancia) {
        const deltaPercent =
          Math.abs(
            (request.quantidade - itemNfe.quantidade) / itemNfe.quantidade,
          ) * 100;
        const divergencias = JSON.stringify([
          {
            sku: produto.sku,
            tipo: 'QUANTIDADE_DIVERGENTE',
            detalhe: `Quantidade física (${request.quantidade}) difere da NF-e (${itemNfe.quantidade}) em ${deltaPercent.toFixed(2)}% — acima da tolerância de 2% (RN-REC-001)`,
            quantidadeNfe: itemNfe.quantidade,
            quantidadeFisica: request.quantidade,
            deltaPercent,
          },
        ]);
        await this.notaFiscalRepository.updateStatus(
          request.notaFiscalId,
          'DIVERGENTE',
          divergencias,
        );
      }
    }

    // RN-REC-003: Perecíveis exigem lote/validade e evidência fotográfica obrigatórios
    if (produto.perecivel) {
      if (!request.validade) {
        throw new DomainException(
          'RN-REC-003: Produto perecível exige data de validade obrigatória no recebimento.',
        );
      }
      if (!request.evidenciaUrl) {
        throw new DomainException(
          'RN-REC-003: Produto perecível exige foto de evidência obrigatória no recebimento.',
        );
      }
    }

    // As verificações preliminares passaram. 
    // Inicia a transação síncrona com Lock Pessimista para garantir o cálculo correto do CMP (GAP-009).
    return await this.unitOfWork.execute(async (ctx) => {
      // LOCK EXCLUSIVO no Produto
      await ctx.lockForUpdate('Produto', produto.id);

      // Busca o estado mais recente do produto DEPOIS de obter o lock
      const lockedProduto = await ctx.produtoRepository.findById(produto.id);
      if (!lockedProduto) {
        throw new NotFoundException('Produto não encontrado durante o processamento.');
      }

      // Salva o novo lote
      const lote = await ctx.loteRepository.create({
        numeroLote: request.numeroLote,
        produtoId: request.produtoId,
        quantidade: request.quantidade,
        validade: request.validade ? new Date(request.validade) : null,
        ativo: true,
        emInventario: false,
        notaFiscalId: request.notaFiscalId || null,
        evidenciaUrl: request.evidenciaUrl || null,
      });

      // Cálculo Síncrono do Custo Médio Ponderado (CMP)
      if (request.quantidade <= 0) {
        throw new DomainException('RN-CST-001: Quantidade de entrada deve ser maior que zero para cálculo de custo.');
      }
      if (request.custoAquisicao < 0) {
        throw new DomainException('RN-CST-001: Custo de entrada não pode ser negativo.');
      }

      const lotes = await ctx.loteRepository.findAvailableByProduct(produto.id);
      const quantidadeNova = lotes.reduce((acc, l) => acc + l.quantidade, 0);
      const quantidadeAnterior = Math.max(0, quantidadeNova - request.quantidade);
      const custoAnterior = lockedProduto.custoMedio;

      let novoCusto = custoAnterior;
      if (quantidadeAnterior === 0) {
        novoCusto = request.custoAquisicao;
      } else {
        novoCusto = (custoAnterior * quantidadeAnterior + request.custoAquisicao * request.quantidade) / quantidadeNova;
      }
      novoCusto = Number(novoCusto.toFixed(6));

      await ctx.produtoRepository.updateCustoMedio(produto.id, novoCusto);

      await ctx.logCustoRepository.create({
        produtoId: produto.id,
        custoAnterior,
        custoNovo: novoCusto,
        quantidadeAnterior,
        quantidadeNova,
        motivo: `Recebimento de Lote ${request.numeroLote}`,
      });

      // Fechamento da NF-e
      if (request.notaFiscalId) {
        const nfe = await ctx.notaFiscalRepository.findById(request.notaFiscalId);
        if (nfe) {
          const lotesRecebidos = await ctx.loteRepository.countByNotaFiscal(request.notaFiscalId);
          if (lotesRecebidos === nfe.itensNfe.length && nfe.status !== 'DIVERGENTE') {
            await ctx.notaFiscalRepository.updateStatus(request.notaFiscalId, 'CONFERIDO');
          }
        }
      }

      // ADR-005: Cria a Movimentação de ENTRADA no final da transação para garantir que
      // o lock do ChainPointer (adquirido dentro de movementRepository.create) seja o último lock.
      await ctx.movementRepository.create({
        tipo: 'ENTRADA',
        loteId: lote.id,
        quantidade: request.quantidade,
        motivo: `Recebimento de Lote ${request.numeroLote}`,
        enderecoOrigemId: null,
        enderecoDestinoId: null, // Ainda está na doca
        usuarioId: request.usuarioId,
      });

      return lote;
    });
  }
}
