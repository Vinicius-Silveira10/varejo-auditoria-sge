import { Module } from '@nestjs/common';
import { OrderController } from './controllers/order.controller';
import { CloseOrderUseCase } from '../../core/use-cases/order/close-order.use-case';
import { VerifyOrderUseCase } from '../../core/use-cases/order/verify-order.use-case';
import { CreateOrderUseCase } from '../../core/use-cases/order/create-order.use-case';
import { PickOrderUseCase } from '../../core/use-cases/order/pick-order.use-case';
import { GetOtifDashboardUseCase } from '../../core/use-cases/order/get-otif-dashboard.use-case';
import { IOrderRepository } from '../../core/interfaces/repositories/i-order.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IUnitOfWork } from '../../core/interfaces/repositories/i-unit-of-work';
import { PrismaModule } from '../database/prisma/prisma.module';
import { PrismaOrderRepository } from '../database/prisma/repositories/prisma-order.repository';
import { PrismaBatchRepository } from '../database/prisma/repositories/prisma-batch.repository';
import { PrismaProductRepository } from '../database/prisma/repositories/prisma-product.repository';
import { PrismaMovementRepository } from '../database/prisma/repositories/prisma-movement.repository';

@Module({
  imports: [PrismaModule],
  controllers: [OrderController],
  providers: [
    {
      provide: CloseOrderUseCase,
      useFactory: (orderRepo: IOrderRepository) => {
        return new CloseOrderUseCase(orderRepo);
      },
      inject: ['IOrderRepository'],
    },
    {
      provide: VerifyOrderUseCase,
      useFactory: (orderRepo: IOrderRepository) => {
        return new VerifyOrderUseCase(orderRepo);
      },
      inject: ['IOrderRepository'],
    },
    {
      provide: CreateOrderUseCase,
      useFactory: (
        orderRepo: IOrderRepository,
        productRepo: IProductRepository,
      ) => {
        return new CreateOrderUseCase(orderRepo, productRepo);
      },
      inject: ['IOrderRepository', 'IProductRepository'],
    },
    {
      provide: PickOrderUseCase,
      useFactory: (
        orderRepo: PrismaOrderRepository,
        batchRepo: PrismaBatchRepository,
        movRepo: PrismaMovementRepository,
        unitOfWork: IUnitOfWork,
        addressRepo: IAddressRepository,
      ) => {
        return new PickOrderUseCase(orderRepo, batchRepo, movRepo, unitOfWork, addressRepo);
      },
      inject: [
        'IOrderRepository',
        'IBatchRepository',
        'IMovementRepository',
        'IUnitOfWork',
        'IAddressRepository',
      ],
    },
    {
      provide: GetOtifDashboardUseCase,
      useFactory: (orderRepo: IOrderRepository) => {
        return new GetOtifDashboardUseCase(orderRepo);
      },
      inject: ['IOrderRepository'],
    },
  ],
})
export class OrderModule {}
