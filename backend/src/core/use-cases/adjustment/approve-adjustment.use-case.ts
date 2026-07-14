import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException, ConflictException } from '../../exceptions/domain.exception';

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
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(dto: ApproveAdjustmentDto) {
    const ajuste = await this.adjustmentRepository.findById(dto.ajusteId);
    if (!ajuste) {
      throw new NotFoundException('Ajuste não encontrado.');
    }

    if (ajuste.statusAprovacao !== 'PENDENTE') {
      throw new ConflictException('Este ajuste já foi processado.');
    }

    // RN-REL-004: Segregação de Funções — quem solicita não pode aprovar
    if (ajuste.solicitanteId === dto.aprovadorId) {
      throw new DomainException(
        'RN-REL-004: Segregação de funções violada. O solicitante não pode aprovar o próprio ajuste.',
      );
    }

    if (!dto.aprovado) {
      const ajusteRejeitado = await this.unitOfWork.execute(async (ctx) => {
        // FIX: Prevenção de Deadlock - Adquirir lock de domínio antes do ChainPointer
        await ctx.lockForUpdate('Lote', ajuste.loteId);

        const atualizado = await ctx.adjustmentRepository.updateStatus(
          dto.ajusteId,
          'REJEITADO',
          dto.aprovadorId,
        );

        await ctx.movementRepository.create({
          tipo: 'AJUSTE_REJEITADO',
          loteId: ajuste.loteId,
          quantidade: ajuste.quantidadeDelta,
          motivo: ajuste.motivo,
          usuarioId: dto.aprovadorId,
          enderecoOrigemId: null,
          enderecoDestinoId: null,
        });

        return atualizado;
      });

      return ajusteRejeitado;
    }

    const lote = await this.batchRepository.findById(ajuste.loteId);
    if (!lote) {
      throw new NotFoundException('Lote não encontrado.');
    }

    if (lote.emInventario) {
      throw new DomainException(
        'RN-INV-006: Lote bloqueado para contagem de inventário. Efetivação de ajustes suspensa.',
      );
    }

    const produto = await this.productRepository.findById(lote.produtoId);
    if (!produto) {
      throw new NotFoundException('Produto não encontrado.');
    }

    // Validação de Alçada (RN-AJU-004)
    const saldoTeorico = lote.quantidade;
    const deltaPercent =
      saldoTeorico > 0 ? ajuste.quantidadeDelta / saldoTeorico : 1;

    if (Math.abs(deltaPercent) > 0.02 || Math.abs(ajuste.valorDelta) > 1000) {
      if (dto.aprovadorRole !== 'ADMIN') {
        throw new DomainException(
          'RN-AJU-004: Ajustes acima de 2% ou R$ 1000 exigem aprovação de Controladoria/ADMIN.',
        );
      }
    } else {
      if (dto.aprovadorRole !== 'GESTOR' && dto.aprovadorRole !== 'ADMIN') {
        throw new DomainException('RN-AJU-004: Aprovador deve ser GESTOR ou superior.');
      }
    }

    // RN-AJU-005 / RN-CST-002: Ajustes de estoque NÃO recalculam o Custo Médio Ponderado.
    // O CMP só é alterado em fluxos de entrada real de mercadoria (ex.: recebimento de NF-e).
    // Vide ADR: docs/adr/0001-ajuste-nao-altera-custo-medio.md

    // 4. Executa a aprovação e atualização do saldo de forma ATÔMICA, incluindo a Movimentação
    const ajusteAtualizado = await this.unitOfWork.execute(async (ctx) => {
      // FIX: Prevenção de Deadlock - Adquirir lock de domínio antes do ChainPointer
      await ctx.lockForUpdate('Lote', lote.id);

      // 1. Atualiza o lote
      await ctx.loteRepository.updateQuantidade(
        lote.id,
        lote.quantidade + ajuste.quantidadeDelta,
      );

      // 2. Atualiza o status do ajuste
      const atualizado = await ctx.adjustmentRepository.updateStatus(
        dto.ajusteId,
        'APROVADO',
        dto.aprovadorId,
      );

      // 3. Gerar Movimentação de Auditoria atrelada à mesma transação
      await ctx.movementRepository.create({
        tipo: 'AJUSTE',
        loteId: lote.id,
        quantidade: ajuste.quantidadeDelta,
        motivo: ajuste.motivo,
        usuarioId: dto.aprovadorId,
        enderecoOrigemId: null,
        enderecoDestinoId: null,
      });

      return atualizado;
    });

    return ajusteAtualizado;
  }
}
