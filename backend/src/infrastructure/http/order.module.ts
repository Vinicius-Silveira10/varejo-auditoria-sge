import { Module } from '@nestjs/common';
import { OrderController } from './controllers/order.controller';
import { CloseOrderUseCase } from '../../core/use-cases/order/close-order.use-case';
import { VerifyOrderUseCase } from '../../core/use-cases/order/verify-order.use-case';
import { IOrderRepository } from '../../core/interfaces/repositories/i-order.repository';
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
  ],
})
export class OrderModule {}
