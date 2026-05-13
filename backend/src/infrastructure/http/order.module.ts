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
import { PrismaModule } from '../database/prisma/prisma.module';

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
      useFactory: (orderRepo: IOrderRepository, productRepo: IProductRepository) => {
        return new CreateOrderUseCase(orderRepo, productRepo);
      },
      inject: ['IOrderRepository', 'IProductRepository'],
    },
    {
      provide: PickOrderUseCase,
      useFactory: (orderRepo: IOrderRepository, batchRepo: IBatchRepository) => {
        return new PickOrderUseCase(orderRepo, batchRepo);
      },
      inject: ['IOrderRepository', 'IBatchRepository'],
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
