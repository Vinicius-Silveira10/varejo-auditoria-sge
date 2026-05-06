import { Module } from '@nestjs/common';
import { MovementController } from './controllers/movement.controller';
import { RegisterMovementUseCase } from '../../core/use-cases/movement/register-movement.use-case';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MovementController],
  providers: [
    {
      provide: RegisterMovementUseCase,
      useFactory: (
        batchRepo: IBatchRepository,
        movementRepo: IMovementRepository,
        addressRepo: IAddressRepository,
        productRepo: IProductRepository,
      ) => {
        return new RegisterMovementUseCase(batchRepo, movementRepo, addressRepo, productRepo);
      },
      inject: ['IBatchRepository', 'IMovementRepository', 'IAddressRepository', 'IProductRepository'],
    },
  ],
})
export class MovementModule {}
