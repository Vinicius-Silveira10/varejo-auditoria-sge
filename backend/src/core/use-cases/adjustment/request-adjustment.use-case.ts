import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

export interface RequestAdjustmentDto {
  loteId: number;
  quantidadeDelta: number;
  motivo: string;
  solicitanteId: number;
}

export class RequestAdjustmentUseCase {
  constructor(
    private readonly adjustmentRepository: IAdjustmentRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(dto: RequestAdjustmentDto) {
    if (!dto.motivo || dto.motivo.trim() === '') {
      throw new Error('RN-AJU-001: Todo ajuste deve ter motivo classificado.');
    }

    const lote = await this.batchRepository.findById(dto.loteId);
    if (!lote) {
      throw new Error('Lote não encontrado.');
    }

    if (lote.emInventario) {
      throw new Error('RN-INV-006: Lote bloqueado para contagem de inventário. Solicitações de ajuste suspensas.');
    }

    const produto = await this.productRepository.findById(lote.produtoId);
    if (!produto) {
      throw new Error('Produto não encontrado.');
    }

    const saldoTeorico = lote.quantidade;
    const custoMedio = produto.custoMedio;

    const deltaPercent = saldoTeorico > 0 ? dto.quantidadeDelta / saldoTeorico : 1;
    const valorDelta = dto.quantidadeDelta * custoMedio;

    let nivelAprovacao = 'GESTOR';
    if (Math.abs(deltaPercent) > 0.02 || Math.abs(valorDelta) > 1000) {
      nivelAprovacao = 'GESTOR_CONTROLADORIA';
    }

    const ajuste = await this.adjustmentRepository.create({
      loteId: dto.loteId,
      quantidadeDelta: dto.quantidadeDelta,
      motivo: dto.motivo,
      valorDelta: Number(valorDelta.toFixed(2)),
      statusAprovacao: 'PENDENTE',
      solicitanteId: dto.solicitanteId,
    });

    return {
      ajuste,
      nivelAprovacaoExigido: nivelAprovacao,
    };
  }
}
