import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { BatchController } from './controllers/batch.controller';
import { ReceiveBatchUseCase } from '../../core/use-cases/batch/receive-batch.use-case';
import { GetExpiryAlertsUseCase } from '../../core/use-cases/batch/get-expiry-alerts.use-case';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { INotaFiscalRepository } from '../../core/interfaces/repositories/i-nota-fiscal.repository';
import { Queue } from 'bull';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../database/prisma/prisma.module';

/**
 * GAP-009 FIX: BatchModule refatorado.
 * - Importa QueueModule para ter acesso à fila 'cost-update'.
 * - UpdateAverageCostUseCase removido do contexto síncrono — agora é executado pelo processador assíncrono.
 * - ReceiveBatchUseCase agora injeta a Queue<any> ao invés do UpdateAverageCostUseCase.
 */
@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [BatchController],
  providers: [
    {
      provide: ReceiveBatchUseCase,
      useFactory: (
        batchRepo: IBatchRepository,
        productRepo: IProductRepository,
        costUpdateQueue: Queue,
        nfRepo: INotaFiscalRepository,
      ) => {
        return new ReceiveBatchUseCase(batchRepo, productRepo, costUpdateQueue, nfRepo);
      },
      inject: ['IBatchRepository', 'IProductRepository', getQueueToken('cost-update'), 'INotaFiscalRepository'],
    },
    {
      provide: GetExpiryAlertsUseCase,
      useFactory: (batchRepo: IBatchRepository) => {
        return new GetExpiryAlertsUseCase(batchRepo);
      },
      inject: ['IBatchRepository'],
    },
  ],
})
export class BatchModule {}
