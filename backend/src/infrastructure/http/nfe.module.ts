import { Module } from '@nestjs/common';
import { NfeController } from './controllers/nfe.controller';
import { ProcessNfeUseCase } from '../../core/use-cases/nfe/process-nfe.use-case';
import { ParseNfeXmlService } from '../../core/use-cases/nfe/parse-nfe-xml.service';
import { ReceiveBatchUseCase } from '../../core/use-cases/batch/receive-batch.use-case';
import { UpdateAverageCostUseCase } from '../../core/use-cases/cost/update-average-cost.use-case';
import { INotaFiscalRepository } from '../../core/interfaces/repositories/i-nota-fiscal.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { ILogCustoRepository } from '../../core/interfaces/repositories/i-log-custo.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NfeController],
  providers: [
    ParseNfeXmlService,
    {
      provide: UpdateAverageCostUseCase,
      useFactory: (productRepo: IProductRepository, batchRepo: IBatchRepository, logCustoRepo: ILogCustoRepository) => {
        return new UpdateAverageCostUseCase(productRepo, batchRepo, logCustoRepo);
      },
      inject: ['IProductRepository', 'IBatchRepository', 'ILogCustoRepository'],
    },
    {
      provide: ReceiveBatchUseCase,
      useFactory: (batchRepo: IBatchRepository, productRepo: IProductRepository, updateCostUseCase: UpdateAverageCostUseCase) => {
        return new ReceiveBatchUseCase(batchRepo, productRepo, updateCostUseCase);
      },
      inject: ['IBatchRepository', 'IProductRepository', UpdateAverageCostUseCase],
    },
    {
      provide: ProcessNfeUseCase,
      useFactory: (
        nfRepo: INotaFiscalRepository,
        productRepo: IProductRepository,
        parseService: ParseNfeXmlService,
        receiveBatchUseCase: ReceiveBatchUseCase,
      ) => {
        return new ProcessNfeUseCase(nfRepo, productRepo, parseService, receiveBatchUseCase);
      },
      inject: ['INotaFiscalRepository', 'IProductRepository', ParseNfeXmlService, ReceiveBatchUseCase],
    },
  ],
})
export class NfeModule {}
