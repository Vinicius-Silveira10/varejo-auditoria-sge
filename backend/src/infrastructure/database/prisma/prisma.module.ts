import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaBatchRepository } from './repositories/prisma-batch.repository';
import { PrismaMovementRepository } from './repositories/prisma-movement.repository';
import { PrismaProductRepository } from './repositories/prisma-product.repository';
import { PrismaAddressRepository } from './repositories/prisma-address.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { PrismaAdjustmentRepository } from './repositories/prisma-adjustment.repository';
import { PrismaLogCustoRepository } from './repositories/prisma-log-custo.repository';
import { PrismaInventoryCountRepository } from './repositories/prisma-inventory-count.repository';
import { HashService } from '../../security/hash.service';

@Global()
@Module({
  providers: [
    PrismaService,
    HashService,
    {
      provide: 'IBatchRepository',
      useClass: PrismaBatchRepository,
    },
    {
      provide: 'IMovementRepository',
      useClass: PrismaMovementRepository,
    },
    {
      provide: 'IProductRepository',
      useClass: PrismaProductRepository,
    },
    {
      provide: 'IAddressRepository',
      useClass: PrismaAddressRepository,
    },
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'IAdjustmentRepository',
      useClass: PrismaAdjustmentRepository,
    },
    {
      provide: 'ILogCustoRepository',
      useClass: PrismaLogCustoRepository,
    },
    {
      provide: 'IInventoryCountRepository',
      useClass: PrismaInventoryCountRepository,
    },
  ],
  exports: [
    PrismaService,
    HashService,
    'IBatchRepository',
    'IMovementRepository',
    'IProductRepository',
    'IAddressRepository',
    'IUserRepository',
    'IAdjustmentRepository',
    'ILogCustoRepository',
    'IInventoryCountRepository',
  ],
})
export class PrismaModule {}
