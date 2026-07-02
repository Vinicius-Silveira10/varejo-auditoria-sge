import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { StartCountUseCase } from '../../core/use-cases/inventory/start-count.use-case';
import { RegisterCountUseCase } from '../../core/use-cases/inventory/register-count.use-case';
import { GetInventoryValueReportUseCase } from '../../core/use-cases/inventory/get-inventory-value-report.use-case';
import { GetInventoryAccuracyUseCase } from '../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { IInventoryCountRepository } from '../../core/interfaces/repositories/i-inventory-count.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { RequestAdjustmentUseCase } from '../../core/use-cases/adjustment/request-adjustment.use-case';
import { IAdjustmentRepository } from '../../core/interfaces/repositories/i-adjustment.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
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
      useFactory: (
        countRepo: IInventoryCountRepository,
        batchRepo: IBatchRepository,
        addressRepo: IAddressRepository,
        movRepo: IMovementRepository,
        productRepo: IProductRepository,
      ) => {
        return new StartCountUseCase(countRepo, batchRepo, addressRepo, movRepo, productRepo);
      },
      inject: ['IInventoryCountRepository', 'IBatchRepository', 'IAddressRepository', 'IMovementRepository', 'IProductRepository'],
    },
    {
      provide: RegisterCountUseCase,
      useFactory: (
        countRepo: IInventoryCountRepository,
        batchRepo: IBatchRepository,
        reqAdjUseCase: RequestAdjustmentUseCase,
        addressRepo: IAddressRepository,
        movRepo: IMovementRepository,
      ) => {
        return new RegisterCountUseCase(countRepo, batchRepo, reqAdjUseCase, addressRepo, movRepo);
      },
      inject: ['IInventoryCountRepository', 'IBatchRepository', RequestAdjustmentUseCase, 'IAddressRepository', 'IMovementRepository'],
    },
    {
      provide: GetInventoryValueReportUseCase,
      useFactory: (prodRepo: IProductRepository, batchRepo: IBatchRepository) => {
        return new GetInventoryValueReportUseCase(prodRepo, batchRepo);
      },
      inject: ['IProductRepository', 'IBatchRepository'],
    },
    {
      provide: GetInventoryAccuracyUseCase,
      useFactory: (countRepo: IInventoryCountRepository) => {
        return new GetInventoryAccuracyUseCase(countRepo);
      },
      inject: ['IInventoryCountRepository'],
    },
  ],
})
export class InventoryModule {}
