import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { GetInventoryAccuracyUseCase } from '../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { GetOccupationDashboardUseCase } from '../../core/use-cases/address/get-occupation-dashboard.use-case';
import { GetOtifDashboardUseCase } from '../../core/use-cases/order/get-otif-dashboard.use-case';
import { IInventoryCountRepository } from '../../core/interfaces/repositories/i-inventory-count.repository';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IOrderRepository } from '../../core/interfaces/repositories/i-order.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

/**
 * GAP-001 / ARQT-001 FIX: Módulo criado para registrar o DashboardController,
 * que estava implementado mas não vinculado a nenhum módulo NestJS.
 * A rota /dashboards não era registrada no servidor antes desta correção.
 */
@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: GetInventoryAccuracyUseCase,
      useFactory: (countRepo: IInventoryCountRepository) => {
        return new GetInventoryAccuracyUseCase(countRepo);
      },
      inject: ['IInventoryCountRepository'],
    },
    {
      provide: GetOccupationDashboardUseCase,
      useFactory: (addressRepo: IAddressRepository) => {
        return new GetOccupationDashboardUseCase(addressRepo);
      },
      inject: ['IAddressRepository'],
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
export class DashboardModule {}
