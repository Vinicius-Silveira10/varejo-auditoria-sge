import {
  IAdjustmentRepository,
  AjusteEstoqueWithDetails,
} from '../../interfaces/repositories/i-adjustment.repository';

export class ListPendingAdjustmentsUseCase {
  constructor(private readonly adjustmentRepository: IAdjustmentRepository) {}

  async execute(status?: string): Promise<AjusteEstoqueWithDetails[]> {
    return this.adjustmentRepository.findPending(status);
  }
}
