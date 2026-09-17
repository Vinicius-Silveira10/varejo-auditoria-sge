import { IAdjustmentRepository } from '../../interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IProductRepository } from '../../interfaces/repositories/i-product.repository';
import { IUnitOfWork } from '../../interfaces/repositories/i-unit-of-work';
import { DomainException, NotFoundException, ConflictException } from '../../exceptions/domain.exception';
import { calcularNivelAprovacaoExigido } from '../../domain/adjustment/adjustment.rules';

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

    // Verificação removida daqui e movida para DENTRO da transação atômica

    // RN-REL-004: Segregação de Funções — quem solicita não pode aprovar
    if (ajuste.solicitanteId === dto.aprovadorId) {
      throw new DomainException(
        'RN-REL-004: Segregação de funções violada. O solicitante não pode aprovar o próprio ajuste.',
      );
    }

    if (!dto.aprovado) {
      const ajusteRejeitado = await this.unitOfWork.execute(async (ctx) => {
        // FIX RACE CONDITION: Adquirir lock na linha do AjusteEstoque antes de prosseguir
        await ctx.lockForUpdate('AjusteEstoque', dto.ajusteId);
        
        // Re-verificar o status atômicamente (permite rejeição em qualquer fase)
        const ajusteAtual = await ctx.adjustmentRepository.findById(dto.ajusteId);
        if (
          ajusteAtual?.statusAprovacao !== 'PENDENTE' &&
          ajusteAtual?.statusAprovacao !== 'PENDENTE_CONTROLADORIA'
        ) {
          throw new ConflictException('Este ajuste já foi processado.');
        }

        // Ordem: AjusteEstoque -> Lote -> ChainPointer
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

    // Validação de Alçada (RN-AJU-004) — delegada à função pura do domínio
    const nivelExigido = calcularNivelAprovacaoExigido(
      ajuste.quantidadeDelta,
      ajuste.valorDelta,
      ajuste.saldoTeorico,
    );

    if (nivelExigido === 'GESTOR') {
      if (dto.aprovadorRole !== 'GESTOR' && dto.aprovadorRole !== 'ADMIN') {
        throw new DomainException('RN-AJU-004: Aprovador deve ser GESTOR ou superior.');
      }

      // Efetivação direta
      const ajusteAtualizado = await this.unitOfWork.execute(async (ctx) => {
        await ctx.lockForUpdate('AjusteEstoque', dto.ajusteId);

        const ajusteAtual = await ctx.adjustmentRepository.findById(dto.ajusteId);
        if (ajusteAtual?.statusAprovacao !== 'PENDENTE') {
          throw new ConflictException('Este ajuste já foi processado.');
        }

        await ctx.lockForUpdate('Lote', lote.id);

        await ctx.loteRepository.updateQuantidade(
          lote.id,
          lote.quantidade + ajuste.quantidadeDelta,
        );

        const atualizado = await ctx.adjustmentRepository.updateStatus(
          dto.ajusteId,
          'APROVADO',
          dto.aprovadorId,
          'GESTOR',
        );

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

    // Caso nivelExigido === 'GESTOR_CONTROLADORIA'
    if (ajuste.statusAprovacao === 'PENDENTE') {
      // Fase 1 - Gestor
      if (dto.aprovadorRole !== 'GESTOR' && dto.aprovadorRole !== 'ADMIN') {
        throw new DomainException(
          'RN-AJU-004: Primeira aprovação deve ser realizada por GESTOR ou ADMIN.',
        );
      }

      const ajusteAtualizado = await this.unitOfWork.execute(async (ctx) => {
        await ctx.lockForUpdate('AjusteEstoque', dto.ajusteId);

        const ajusteAtual = await ctx.adjustmentRepository.findById(dto.ajusteId);
        if (ajusteAtual?.statusAprovacao !== 'PENDENTE') {
          throw new ConflictException('Este ajuste já foi processado.');
        }

        // Transiciona para 'PENDENTE_CONTROLADORIA': grava aprovadorGestorId = dto.aprovadorId
        // NÃO altera quantidade do lote e NÃO cria movimentação de estoque
        const atualizado = await ctx.adjustmentRepository.updateStatus(
          dto.ajusteId,
          'PENDENTE_CONTROLADORIA',
          dto.aprovadorId,
          'GESTOR',
        );

        return atualizado;
      });

      return ajusteAtualizado;
    }

    if (ajuste.statusAprovacao === 'PENDENTE_CONTROLADORIA') {
      // Fase 2 - Controladoria
      if (dto.aprovadorRole !== 'CONTROLADORIA' && dto.aprovadorRole !== 'ADMIN') {
        throw new DomainException(
          'RN-AJU-004: Segunda aprovação exige papel CONTROLADORIA ou ADMIN.',
        );
      }

      // Segregação SoD entre aprovadores
      if (dto.aprovadorId === ajuste.aprovadorGestorId) {
        throw new DomainException(
          'RN-REL-004: Segregação de funções violada. O mesmo usuário não pode realizar a primeira e a segunda aprovação.',
        );
      }

      const ajusteAtualizado = await this.unitOfWork.execute(async (ctx) => {
        await ctx.lockForUpdate('AjusteEstoque', dto.ajusteId);

        const ajusteAtual = await ctx.adjustmentRepository.findById(dto.ajusteId);
        if (ajusteAtual?.statusAprovacao !== 'PENDENTE_CONTROLADORIA') {
          throw new ConflictException('Este ajuste já foi processado.');
        }

        if (ajusteAtual?.aprovadorGestorId && dto.aprovadorId === ajusteAtual.aprovadorGestorId) {
          throw new DomainException(
            'RN-REL-004: Segregação de funções violada. O mesmo usuário não pode realizar a primeira e a segunda aprovação.',
          );
        }

        await ctx.lockForUpdate('Lote', lote.id);

        await ctx.loteRepository.updateQuantidade(
          lote.id,
          lote.quantidade + ajuste.quantidadeDelta,
        );

        const atualizado = await ctx.adjustmentRepository.updateStatus(
          dto.ajusteId,
          'APROVADO',
          dto.aprovadorId,
          'CONTROLADORIA',
        );

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

    throw new ConflictException('Este ajuste já foi processado.');
  }
}
