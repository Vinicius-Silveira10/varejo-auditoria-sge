import { Module } from '@nestjs/common';
import { MovementController } from './controllers/movement.controller';
import { RegisterMovementUseCase } from '../../core/use-cases/movement/register-movement.use-case';
import { GetBatchMovementsUseCase } from '../../core/use-cases/movement/get-batch-movements.use-case';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { PrismaModule } from '../database/prisma/prisma.module';
import { IUnitOfWork } from '../../core/interfaces/repositories/i-unit-of-work';
import { PrismaBatchRepository } from '../database/prisma/repositories/prisma-batch.repository';
import { PrismaMovementRepository } from '../database/prisma/repositories/prisma-movement.repository';
import { PrismaAddressRepository } from '../database/prisma/repositories/prisma-address.repository';
import { PrismaProductRepository } from '../database/prisma/repositories/prisma-product.repository';

@Module({
  imports: [PrismaModule],
  controllers: [MovementController],
  providers: [
    {
      provide: RegisterMovementUseCase,
      useFactory: (
        batchRepo: PrismaBatchRepository,
        movementRepo: PrismaMovementRepository,
        addressRepo: PrismaAddressRepository,
        productRepo: PrismaProductRepository,
        unitOfWork: IUnitOfWork,
      ) => {
        return new RegisterMovementUseCase(
          batchRepo,
          movementRepo,
          addressRepo,
          productRepo,
          unitOfWork,
        );
      },
      inject: [
        'IBatchRepository',
        'IMovementRepository',
        'IAddressRepository',
        'IProductRepository',
        'IUnitOfWork',
      ],
    },
    {
      provide: GetBatchMovementsUseCase,
      useFactory: (
        movementRepo: IMovementRepository,
        batchRepo: IBatchRepository,
      ) => {
        return new GetBatchMovementsUseCase(movementRepo, batchRepo);
      },
      inject: ['IMovementRepository', 'IBatchRepository'],
    },
  ],
})
export class MovementModule {}
