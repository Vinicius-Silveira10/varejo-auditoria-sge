import { Module } from '@nestjs/common';
import { BatchController } from './controllers/batch.controller';
import { ReceiveBatchUseCase } from '../../core/use-cases/batch/receive-batch.use-case';
import { UpdateAverageCostUseCase } from '../../core/use-cases/cost/update-average-cost.use-case';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { ILogCustoRepository } from '../../core/interfaces/repositories/i-log-custo.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BatchController],
  providers: [
    {
      provide: UpdateAverageCostUseCase,
      useFactory: (productRepo: IProductRepository, batchRepo: IBatchRepository, logCustoRepo: ILogCustoRepository) => {
        return new UpdateAverageCostUseCase(productRepo, batchRepo, logCustoRepo);
      },
      inject: ['IProductRepository', 'IBatchRepository', 'ILogCustoRepository'],
    },
    {
      provide: ReceiveBatchUseCase,
      useFactory: (batchRepo: IBatchRepository, productRepo: IProductRepository, updateCostUseCase: UpdateAverageCostUseCase) => {
        return new ReceiveBatchUseCase(batchRepo, productRepo, updateCostUseCase);
      },
      inject: ['IBatchRepository', 'IProductRepository', UpdateAverageCostUseCase],
    },
  ],
})
export class BatchModule {}
