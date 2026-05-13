import { Module } from '@nestjs/common';
import { CostController } from './controllers/cost.controller';
import { GetProductCostHistoryUseCase } from '../../core/use-cases/cost/get-product-cost-history.use-case';
import { ILogCustoRepository } from '../../core/interfaces/repositories/i-log-custo.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CostController],
  providers: [
    {
      provide: GetProductCostHistoryUseCase,
      useFactory: (logRepo: ILogCustoRepository, productRepo: IProductRepository) => {
        return new GetProductCostHistoryUseCase(logRepo, productRepo);
      },
      inject: ['ILogCustoRepository', 'IProductRepository'],
    },
  ],
})
export class CostModule {}
