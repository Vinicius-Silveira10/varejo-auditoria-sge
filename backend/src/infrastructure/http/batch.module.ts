import { Module } from '@nestjs/common';
import { BatchController } from './controllers/batch.controller';
import { ReceiveBatchUseCase } from '../../core/use-cases/batch/receive-batch.use-case';
import { GetExpiryAlertsUseCase } from '../../core/use-cases/batch/get-expiry-alerts.use-case';
import { GetPendingPutawayBatchesUseCase } from '../../core/use-cases/batch/get-pending-putaway.use-case';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { PrismaBatchRepository } from '../database/prisma/repositories/prisma-batch.repository';
import { PrismaProductRepository } from '../database/prisma/repositories/prisma-product.repository';
import { PrismaNotaFiscalRepository } from '../database/prisma/repositories/prisma-nota-fiscal.repository';
import { IUnitOfWork } from '../../core/interfaces/repositories/i-unit-of-work';
import { PrismaModule } from '../database/prisma/prisma.module';

/**
 * GAP-009 FIX: BatchModule refatorado.
 * - ReceiveBatchUseCase roda transacionalmente com lock pessimista (GAP-009 FIX).
 */
@Module({
  imports: [PrismaModule],
  controllers: [BatchController],
  providers: [
    {
      provide: ReceiveBatchUseCase,
      useFactory: (
        productRepo: PrismaProductRepository,
        notaFiscalRepo: PrismaNotaFiscalRepository,
        unitOfWork: IUnitOfWork,
      ) => {
        return new ReceiveBatchUseCase(
          productRepo,
          notaFiscalRepo,
          unitOfWork,
        );
      },
      inject: [
        'IProductRepository',
        'INotaFiscalRepository',
        'IUnitOfWork',
      ],
    },
    {
      provide: GetExpiryAlertsUseCase,
      useFactory: (batchRepo: IBatchRepository) => {
        return new GetExpiryAlertsUseCase(batchRepo);
      },
      inject: ['IBatchRepository'],
    },
    {
      provide: GetPendingPutawayBatchesUseCase,
      useFactory: (batchRepo: IBatchRepository) => {
        return new GetPendingPutawayBatchesUseCase(batchRepo);
      },
      inject: ['IBatchRepository'],
    },
  ],
})
export class BatchModule {}
