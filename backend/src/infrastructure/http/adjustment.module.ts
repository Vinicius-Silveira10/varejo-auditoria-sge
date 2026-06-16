import { Module } from '@nestjs/common';
import { AdjustmentController } from './controllers/adjustment.controller';
import { RequestAdjustmentUseCase } from '../../core/use-cases/adjustment/request-adjustment.use-case';
import { ApproveAdjustmentUseCase } from '../../core/use-cases/adjustment/approve-adjustment.use-case';
import { UpdateAverageCostUseCase } from '../../core/use-cases/cost/update-average-cost.use-case';
import { IAdjustmentRepository } from '../../core/interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { ILogCustoRepository } from '../../core/interfaces/repositories/i-log-custo.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdjustmentController],
  providers: [
    {
      provide: RequestAdjustmentUseCase,
      useFactory: (adjRepo: IAdjustmentRepository, batchRepo: IBatchRepository, prodRepo: IProductRepository) => {
        return new RequestAdjustmentUseCase(adjRepo, batchRepo, prodRepo);
      },
      inject: ['IAdjustmentRepository', 'IBatchRepository', 'IProductRepository'],
    },
    {
      // BUG-005 FIX: Adicionado UpdateAverageCostUseCase e ILogCustoRepository
      provide: UpdateAverageCostUseCase,
      useFactory: (productRepo: IProductRepository, batchRepo: IBatchRepository, logCustoRepo: ILogCustoRepository) => {
        return new UpdateAverageCostUseCase(productRepo, batchRepo, logCustoRepo);
      },
      inject: ['IProductRepository', 'IBatchRepository', 'ILogCustoRepository'],
    },
    {
      provide: ApproveAdjustmentUseCase,
      useFactory: (
        adjRepo: IAdjustmentRepository,
        batchRepo: IBatchRepository,
        prodRepo: IProductRepository,
        movRepo: IMovementRepository,
        updateCostUseCase: UpdateAverageCostUseCase,
      ) => {
        return new ApproveAdjustmentUseCase(adjRepo, batchRepo, prodRepo, movRepo, updateCostUseCase);
      },
      inject: ['IAdjustmentRepository', 'IBatchRepository', 'IProductRepository', 'IMovementRepository', UpdateAverageCostUseCase],
    },
  ],
})
export class AdjustmentModule {}
