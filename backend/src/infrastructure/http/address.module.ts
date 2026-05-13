import { Module } from '@nestjs/common';
import { AddressController } from './controllers/address.controller';
import { RegisterAddressUseCase } from '../../core/use-cases/address/register-address.use-case';
import { DisableAddressUseCase } from '../../core/use-cases/address/disable-address.use-case';
import { SuggestPutawayUseCase } from '../../core/use-cases/address/suggest-putaway.use-case';
import { GetAddressCapacityAlertsUseCase } from '../../core/use-cases/address/get-address-capacity-alerts.use-case';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AddressController],
  providers: [
    {
      provide: RegisterAddressUseCase,
      useFactory: (addressRepo: IAddressRepository) => {
        return new RegisterAddressUseCase(addressRepo);
      },
      inject: ['IAddressRepository'],
    },
    {
      provide: DisableAddressUseCase,
      useFactory: (addressRepo: IAddressRepository) => {
        return new DisableAddressUseCase(addressRepo);
      },
      inject: ['IAddressRepository'],
    },
    {
      provide: SuggestPutawayUseCase,
      useFactory: (addressRepo: IAddressRepository, productRepo: IProductRepository) => {
        return new SuggestPutawayUseCase(addressRepo, productRepo);
      },
      inject: ['IAddressRepository', 'IProductRepository'],
    },
    {
      provide: GetAddressCapacityAlertsUseCase,
      useFactory: (addressRepo: IAddressRepository) => {
        return new GetAddressCapacityAlertsUseCase(addressRepo);
      },
      inject: ['IAddressRepository'],
    },
  ],
})
export class AddressModule {}
