import { Module } from '@nestjs/common';
import { AdjustmentController } from './controllers/adjustment.controller';
import { RequestAdjustmentUseCase } from '../../core/use-cases/adjustment/request-adjustment.use-case';
import { ApproveAdjustmentUseCase } from '../../core/use-cases/adjustment/approve-adjustment.use-case';
import { IAdjustmentRepository } from '../../core/interfaces/repositories/i-adjustment.repository';
import { IBatchRepository } from '../../core/interfaces/repositories/i-batch.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { IMovementRepository } from '../../core/interfaces/repositories/i-movement.repository';
import { PrismaModule } from '../database/prisma/prisma.module';
import { IUnitOfWork } from '../../core/interfaces/repositories/i-unit-of-work';
import { PrismaAdjustmentRepository } from '../database/prisma/repositories/prisma-adjustment.repository';
import { PrismaBatchRepository } from '../database/prisma/repositories/prisma-batch.repository';
import { PrismaProductRepository } from '../database/prisma/repositories/prisma-product.repository';
import { PrismaMovementRepository } from '../database/prisma/repositories/prisma-movement.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AdjustmentController],
  providers: [
    {
      provide: RequestAdjustmentUseCase,
      useFactory: (
        adjRepo: IAdjustmentRepository,
        batchRepo: IBatchRepository,
        prodRepo: IProductRepository,
      ) => {
        return new RequestAdjustmentUseCase(adjRepo, batchRepo, prodRepo);
      },
      inject: [
        'IAdjustmentRepository',
        'IBatchRepository',
        'IProductRepository',
      ],
    },
    {
      // RN-AJU-005: Ajustes não alteram o Custo Médio Ponderado.
      provide: ApproveAdjustmentUseCase,
      useFactory: (
        adjRepo: PrismaAdjustmentRepository,
        batchRepo: PrismaBatchRepository,
        prodRepo: PrismaProductRepository,
        movRepo: PrismaMovementRepository,
        unitOfWork: IUnitOfWork,
      ) => {
        return new ApproveAdjustmentUseCase(
          adjRepo,
          batchRepo,
          prodRepo,
          movRepo,
          unitOfWork,
        );
      },
      inject: [
        'IAdjustmentRepository',
        'IBatchRepository',
        'IProductRepository',
        'IMovementRepository',
        'IUnitOfWork',
      ],
    },
  ],
})
export class AdjustmentModule {}
