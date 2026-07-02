import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';

export interface RealtimeDashboardResult {
  totalMovimentacoes: number;
  pickingPendente: number;
}

export class GetRealtimeDashboardUseCase {
  constructor(
    private readonly movementRepo: IMovementRepository,
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(): Promise<RealtimeDashboardResult> {
    const [totalMovimentacoes, pickingPendente] = await Promise.all([
      this.movementRepo.countAll(),
      this.orderRepo.countPendingPicking(),
    ]);

    return {
      totalMovimentacoes,
      pickingPendente,
    };
  }
}
