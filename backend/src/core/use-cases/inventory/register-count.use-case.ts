import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';
import { RequestAdjustmentUseCase } from '../adjustment/request-adjustment.use-case';

export interface RegisterCountDto {
  contagemId: number;
  quantidadeFisica: number;
  usuarioId: number;
  isRecontagem?: boolean; // RN-INV-002: true se for segunda contagem
}

export class RegisterCountUseCase {
  constructor(
    private readonly inventoryCountRepository: IInventoryCountRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly requestAdjustmentUseCase: RequestAdjustmentUseCase,
  ) {}

  async execute(dto: RegisterCountDto) {
    const contagem = await this.inventoryCountRepository.findById(dto.contagemId);

    if (!contagem) {
      throw new Error('Contagem não encontrada.');
    }

    if (contagem.status !== 'PENDENTE') {
      throw new Error('Esta contagem já foi registrada.');
    }

    const delta = dto.quantidadeFisica - contagem.quantidadeTeorica;
    const deltaPercent = contagem.quantidadeTeorica > 0 
      ? Math.abs(delta / contagem.quantidadeTeorica) * 100 
      : (delta !== 0 ? 100 : 0);
    
    let status = 'CONCLUIDO';
    let ajusteResult = null;
    let recontagemExigida = false;

    if (delta !== 0) {
      // RN-INV-002: Recontagem obrigatória se Δ > 0,5%
      if (deltaPercent > 0.5 && !dto.isRecontagem) {
        status = 'RECONTAGEM';
        recontagemExigida = true;
      } else {
        status = 'DIVERGENTE';
        // Dispara solicitação de ajuste (PRC-AJU-005)
        ajusteResult = await this.requestAdjustmentUseCase.execute({
          loteId: contagem.loteId,
          quantidadeDelta: delta,
          motivo: 'Divergência de Inventário',
          solicitanteId: dto.usuarioId,
        });
      }
    }

    const contagemAtualizada = await this.inventoryCountRepository.updateCount(
      contagem.id as number,
      dto.quantidadeFisica,
      status
    );

    // RN-INV-006: Só desbloqueia se a contagem for final (não exige recontagem)
    if (!recontagemExigida) {
      await this.batchRepository.updateInventarioStatus(contagem.loteId, false);
    }

    return {
      contagem: contagemAtualizada,
      ajusteSugerido: ajusteResult,
      recontagemExigida,
    };
  }
}
