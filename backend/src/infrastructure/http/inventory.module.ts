import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { StartCountUseCase } from '../../core/use-cases/inventory/start-count.use-case';
import { RegisterCountUseCase } from '../../core/use-cases/inventory/register-count.use-case';
import { IInventoryCountRepository } from '../../core/interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { RequestAdjustmentUseCase } from '../../core/use-cases/adjustment/request-adjustment.use-case';
import { IAdjustmentRepository } from '../../core/interfaces/repositories/i-adjustment.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    {
      provide: RequestAdjustmentUseCase,
      useFactory: (adjRepo: IAdjustmentRepository, batchRepo: IBatchRepository, prodRepo: IProductRepository) => {
        return new RequestAdjustmentUseCase(adjRepo, batchRepo, prodRepo);
      },
      inject: ['IAdjustmentRepository', 'IBatchRepository', 'IProductRepository'],
    },
    {
      provide: StartCountUseCase,
      useFactory: (countRepo: IInventoryCountRepository, batchRepo: IBatchRepository) => {
        return new StartCountUseCase(countRepo, batchRepo);
      },
      inject: ['IInventoryCountRepository', 'IBatchRepository'],
    },
    {
      provide: RegisterCountUseCase,
      useFactory: (countRepo: IInventoryCountRepository, batchRepo: IBatchRepository, reqAdjUseCase: RequestAdjustmentUseCase) => {
        return new RegisterCountUseCase(countRepo, batchRepo, reqAdjUseCase);
      },
      inject: ['IInventoryCountRepository', 'IBatchRepository', RequestAdjustmentUseCase],
    },
  ],
})
export class InventoryModule {}
