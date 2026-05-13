import { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';

export class GetExpiryAlertsUseCase {
  constructor(private readonly batchRepository: IBatchRepository) {}

  async execute(days: number = 30) {
    const expiringBatches = await this.batchRepository.findExpiring(days);
    
    return expiringBatches.map(batch => ({
      loteId: batch.id,
      numeroLote: batch.numeroLote,
      sku: (batch as any).produto?.sku,
      descricao: (batch as any).produto?.descricao,
      quantidade: batch.quantidade,
      validade: batch.validade,
      diasParaVencer: Math.ceil((batch.validade!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }));
  }
}
