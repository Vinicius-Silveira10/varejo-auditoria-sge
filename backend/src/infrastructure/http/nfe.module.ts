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
import { PrismaModule } from '../database/prisma/prisma.module';
import { IUnitOfWork } from '../../core/interfaces/repositories/i-unit-of-work';
import { PrismaBatchRepository } from '../database/prisma/repositories/prisma-batch.repository';
import { PrismaProductRepository } from '../database/prisma/repositories/prisma-product.repository';
import { PrismaNotaFiscalRepository } from '../database/prisma/repositories/prisma-nota-fiscal.repository';

/**
 * GAP-009 FIX: NfeModule atualizado.
 * - Remove a injeção da fila 'cost-update'.
 */
@Module({
  imports: [PrismaModule],
  controllers: [NfeController],
  providers: [
    ParseNfeXmlService,
    {
      provide: ReceiveBatchUseCase,
      useFactory: (
        productRepo: PrismaProductRepository,
        notaFiscalRepo: PrismaNotaFiscalRepository,
        unitOfWork: IUnitOfWork,
      ) => {
        return new ReceiveBatchUseCase(
          productRepo,
          notaFiscalRepo,
          unitOfWork,
        );
      },
      inject: [
        'IProductRepository',
        'INotaFiscalRepository',
        'IUnitOfWork',
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
