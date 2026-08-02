import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { DomainException, NotFoundException } from '../../exceptions/domain.exception';
import { calcularNivelAprovacaoExigido } from '../../domain/adjustment/adjustment.rules';

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
      throw new DomainException('RN-AJU-001: Todo ajuste deve ter motivo classificado.');
    }

    const lote = await this.batchRepository.findById(dto.loteId);
    if (!lote) {
      throw new NotFoundException('Lote não encontrado.');
    }

    if (lote.emInventario) {
      throw new DomainException(
        'RN-INV-006: Lote bloqueado para contagem de inventário. Solicitações de ajuste suspensas.',
      );
    }

    const produto = await this.productRepository.findById(lote.produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    if (produto.perecivel && !lote.validade) {
      throw new DomainException(
        'RN-AJU-003: Ajustes em produtos perecíveis exigem lote com data de validade preenchida.',
      );
    }

    const saldoTeorico = lote.quantidade;
    const valorDelta = Number((dto.quantidadeDelta * produto.custoMedio).toFixed(2));

    const nivelAprovacao = calcularNivelAprovacaoExigido(
      dto.quantidadeDelta,
      valorDelta,
      saldoTeorico,
    );

    const ajuste = await this.adjustmentRepository.create({
      loteId: dto.loteId,
      quantidadeDelta: dto.quantidadeDelta,
      motivo: dto.motivo,
      valorDelta: valorDelta,
      saldoTeorico: saldoTeorico,
      statusAprovacao: 'PENDENTE',
      solicitanteId: dto.solicitanteId,
    });

    return {
      ajuste,
      nivelAprovacaoExigido: nivelAprovacao,
    };
  }
}
