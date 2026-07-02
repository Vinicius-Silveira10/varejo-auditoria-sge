import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CostQueueProcessor } from './cost-queue.processor';
import { UpdateAverageCostUseCase } from '../../core/use-cases/cost/update-average-cost.use-case';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { ILogCustoRepository } from '../../core/interfaces/repositories/i-log-custo.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

/**
 * GAP-009: Módulo que registra a fila 'cost-update' e o processador assíncrono de custo médio.
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'cost-update',
    }),
  ],
  providers: [
    {
      provide: UpdateAverageCostUseCase,
      useFactory: (productRepo: IProductRepository, batchRepo: IBatchRepository, logCustoRepo: ILogCustoRepository) => {
        return new UpdateAverageCostUseCase(productRepo, batchRepo, logCustoRepo);
      },
      inject: ['IProductRepository', 'IBatchRepository', 'ILogCustoRepository'],
    },
    CostQueueProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
