import { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';
import { Movimentacao } from '@prisma/client';
import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

export class GetBatchMovementsUseCase {
  constructor(
    private readonly movementRepository: IMovementRepository,
    private readonly batchRepository: IBatchRepository,
  ) {}

  async execute(loteId: number): Promise<Movimentacao[]> {
    const lote = await this.batchRepository.findById(loteId);
    if (!lote) {
      throw new Error(`Lote com ID ${loteId} não encontrado.`);
    }

    return await this.movementRepository.findByLote(loteId);
  }
}
