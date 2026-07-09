import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';

export interface ApproveAdjustmentDto {
  ajusteId: number;
  aprovadorId: number;
  aprovadorRole: string;
  aprovado: boolean;
}

export class ApproveAdjustmentUseCase {
  constructor(
    private readonly adjustmentRepository: IAdjustmentRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly productRepository: IProductRepository,
    private readonly movementRepository: IMovementRepository,
  ) {}

  async execute(dto: ApproveAdjustmentDto) {
    const ajuste = await this.adjustmentRepository.findById(dto.ajusteId);
    if (!ajuste) {
      throw new Error('Ajuste não encontrado.');
    }

    if (ajuste.statusAprovacao !== 'PENDENTE') {
      throw new Error('Este ajuste já foi processado.');
    }

    // RN-REL-004: Segregação de Funções — quem solicita não pode aprovar
    if (ajuste.solicitanteId === dto.aprovadorId) {
      throw new Error(
        'RN-REL-004: Segregação de funções violada. O solicitante não pode aprovar o próprio ajuste.',
      );
    }

    if (!dto.aprovado) {
      return this.adjustmentRepository.updateStatus(
        dto.ajusteId,
        'REJEITADO',
        dto.aprovadorId,
      );
    }

    const lote = await this.batchRepository.findById(ajuste.loteId);
    if (!lote) {
      throw new Error('Lote não encontrado.');
    }

    if (lote.emInventario) {
      throw new Error(
        'RN-INV-006: Lote bloqueado para contagem de inventário. Efetivação de ajustes suspensa.',
      );
    }

    const produto = await this.productRepository.findById(lote.produtoId);
    if (!produto) {
      throw new Error('Produto não encontrado.');
    }

    // Validação de Alçada (RN-AJU-004)
    const saldoTeorico = lote.quantidade;
    const deltaPercent =
      saldoTeorico > 0 ? ajuste.quantidadeDelta / saldoTeorico : 1;

    if (Math.abs(deltaPercent) > 0.02 || Math.abs(ajuste.valorDelta) > 1000) {
      if (dto.aprovadorRole !== 'ADMIN') {
        throw new Error(
          'RN-AJU-004: Ajustes acima de 2% ou R$ 1000 exigem aprovação de Controladoria/ADMIN.',
        );
      }
    } else {
      if (dto.aprovadorRole !== 'GESTOR' && dto.aprovadorRole !== 'ADMIN') {
        throw new Error('RN-AJU-004: Aprovador deve ser GESTOR ou superior.');
      }
    }

    // RN-AJU-005 / RN-CST-002: Ajustes de estoque NÃO recalculam o Custo Médio Ponderado.
    // O CMP só é alterado em fluxos de entrada real de mercadoria (ex.: recebimento de NF-e).
    // Vide ADR: docs/adr/0001-ajuste-nao-altera-custo-medio.md

    // 4. Executa a aprovação e atualização do saldo de forma ATÔMICA
    const ajusteAtualizado = await this.adjustmentRepository.executeApprovalTransaction({
      ajusteId: dto.ajusteId,
      aprovadorId: dto.aprovadorId,
      loteId: lote.id,
      novaQuantidade: lote.quantidade + ajuste.quantidadeDelta,
    });

    // Gerar Movimentação de Auditoria
    await this.movementRepository.create({
      tipo: 'AJUSTE',
      loteId: lote.id,
      quantidade: ajuste.quantidadeDelta,
      motivo: ajuste.motivo,
      usuarioId: dto.aprovadorId,
      enderecoOrigemId: null,
      enderecoDestinoId: null,
    });

    return ajusteAtualizado;
  }
}
