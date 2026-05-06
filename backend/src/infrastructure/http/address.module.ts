import { Module } from '@nestjs/common';
import { AddressController } from './controllers/address.controller';
import { RegisterAddressUseCase } from '../../core/use-cases/address/register-address.use-case';
import { DisableAddressUseCase } from '../../core/use-cases/address/disable-address.use-case';
import { IAddressRepository } from '../../core/interfaces/repositories/i-address.repository';
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
  ],
})
export class AddressModule {}
