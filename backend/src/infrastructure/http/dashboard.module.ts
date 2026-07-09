import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { GetInventoryAccuracyUseCase } from '../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { GetOccupationDashboardUseCase } from '../../core/use-cases/address/get-occupation-dashboard.use-case';
import { GetOtifDashboardUseCase } from '../../core/use-cases/order/get-otif-dashboard.use-case';
import { GetKpisDashboardUseCase } from '../../core/use-cases/dashboard/get-kpis-dashboard.use-case';
import { GetRealtimeDashboardUseCase } from '../../core/use-cases/dashboard/get-realtime-dashboard.use-case';
import { GetRupturesKpiUseCase } from '../../core/use-cases/dashboard/get-ruptures-kpi.use-case';
import { GetDeadStockKpiUseCase } from '../../core/use-cases/dashboard/get-dead-stock-kpi.use-case';
import { GetShrinkageKpiUseCase } from '../../core/use-cases/dashboard/get-shrinkage-kpi.use-case';
import { IInventoryCountRepository } from '../../core/interfaces/repositories/i-inventory-count.repository';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IOrderRepository } from '../../core/interfaces/repositories/i-order.repository';
import { IAdjustmentRepository } from '../../core/interfaces/repositories/i-adjustment.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
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
    {
      provide: GetKpisDashboardUseCase,
      useFactory: (
        countRepo: IInventoryCountRepository,
        adjustmentRepo: IAdjustmentRepository,
      ) => {
        return new GetKpisDashboardUseCase(countRepo, adjustmentRepo);
      },
      inject: ['IInventoryCountRepository', 'IAdjustmentRepository'],
    },
    {
      provide: GetRealtimeDashboardUseCase,
      useFactory: (
        movRepo: IMovementRepository,
        orderRepo: IOrderRepository,
      ) => {
        return new GetRealtimeDashboardUseCase(movRepo, orderRepo);
      },
      inject: ['IMovementRepository', 'IOrderRepository'],
    },
    {
      provide: GetRupturesKpiUseCase,
      useFactory: (productRepo: IProductRepository) => {
        return new GetRupturesKpiUseCase(productRepo);
      },
      inject: ['IProductRepository'],
    },
    {
      provide: GetDeadStockKpiUseCase,
      useFactory: (batchRepo: IBatchRepository) => {
        return new GetDeadStockKpiUseCase(batchRepo);
      },
      inject: ['IBatchRepository'],
    },
    {
      provide: GetShrinkageKpiUseCase,
      useFactory: (adjustmentRepo: IAdjustmentRepository) => {
        return new GetShrinkageKpiUseCase(adjustmentRepo);
      },
      inject: ['IAdjustmentRepository'],
    },
  ],
})
export class DashboardModule {}
