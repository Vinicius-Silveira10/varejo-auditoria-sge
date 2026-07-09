import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { UpdateAverageCostUseCase } from '../../core/use-cases/cost/update-average-cost.use-case';

export interface CostUpdateJobData {
  produtoId: number;
  quantidadeEntrada: number;
  custoEntrada: number;
  motivo: string;
}

/**
 * GAP-009: Processador da fila assíncrona de atualização de custo médio.
 * Desacopla o recálculo do fluxo HTTP síncrono de recebimento de lotes (RN-CST-001).
 */
@Processor('cost-update')
export class CostQueueProcessor {
  private readonly logger = new Logger(CostQueueProcessor.name);

  constructor(
    private readonly updateAverageCostUseCase: UpdateAverageCostUseCase,
  ) {}

  @Process('calculate-cost')
  async handleCostCalculation(job: Job<CostUpdateJobData>): Promise<void> {
    const { produtoId, quantidadeEntrada, custoEntrada, motivo } = job.data;

    this.logger.log(
      `[cost-update] Processando job #${job.id} — Produto ${produtoId}`,
    );

    try {
      await this.updateAverageCostUseCase.execute({
        produtoId,
        quantidadeEntrada,
        custoEntrada,
        motivo,
      });
      this.logger.log(`[cost-update] Job #${job.id} concluído com sucesso.`);
    } catch (error: any) {
      this.logger.error(
        `[cost-update] Falha no job #${job.id}: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw para BullMQ marcar o job como failed e aplicar retry policy
    }
  }
}
