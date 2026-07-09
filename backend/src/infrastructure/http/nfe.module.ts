import { Module } from '@nestjs/common';
import { NfeController } from './controllers/nfe.controller';
import { ProcessNfeUseCase } from '../../core/use-cases/nfe/process-nfe.use-case';
import { GetNotaFiscalDetailsUseCase } from '../../core/use-cases/nfe/get-nfe-details.use-case';
import { GetNfeDivergencesUseCase } from '../../core/use-cases/nfe/get-nfe-divergences.use-case';
import { ParseNfeXmlService } from '../../core/use-cases/nfe/parse-nfe-xml.service';
import { ReceiveBatchUseCase } from '../../core/use-cases/batch/receive-batch.use-case';
import { INotaFiscalRepository } from '../../core/interfaces/repositories/i-nota-fiscal.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../database/prisma/prisma.module';

/**
 * GAP-009 FIX: NfeModule atualizado.
 * - Importa QueueModule para injetar a fila 'cost-update' no ReceiveBatchUseCase.
 * - Remove a injeção síncrona de UpdateAverageCostUseCase deste módulo.
 */
@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [NfeController],
  providers: [
    ParseNfeXmlService,
    {
      provide: ReceiveBatchUseCase,
      useFactory: (
        batchRepo: IBatchRepository,
        productRepo: IProductRepository,
        costUpdateQueue: Queue,
        nfRepo: INotaFiscalRepository,
      ) => {
        return new ReceiveBatchUseCase(
          batchRepo,
          productRepo,
          costUpdateQueue,
          nfRepo,
        );
      },
      inject: [
        'IBatchRepository',
        'IProductRepository',
        getQueueToken('cost-update'),
        'INotaFiscalRepository',
      ],
    },
    {
      provide: ProcessNfeUseCase,
      useFactory: (
        nfRepo: INotaFiscalRepository,
        productRepo: IProductRepository,
        parseService: ParseNfeXmlService,
        receiveBatchUseCase: ReceiveBatchUseCase,
      ) => {
        return new ProcessNfeUseCase(
          nfRepo,
          productRepo,
          parseService,
          receiveBatchUseCase,
        );
      },
      inject: [
        'INotaFiscalRepository',
        'IProductRepository',
        ParseNfeXmlService,
        ReceiveBatchUseCase,
      ],
    },
    {
      provide: GetNotaFiscalDetailsUseCase,
      useFactory: (nfRepo: INotaFiscalRepository) => {
        return new GetNotaFiscalDetailsUseCase(nfRepo);
      },
      inject: ['INotaFiscalRepository'],
    },
    {
      provide: GetNfeDivergencesUseCase,
      useFactory: (nfRepo: INotaFiscalRepository) => {
        return new GetNfeDivergencesUseCase(nfRepo);
      },
      inject: ['INotaFiscalRepository'],
    },
  ],
})
export class NfeModule {}
