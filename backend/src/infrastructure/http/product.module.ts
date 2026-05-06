import { Module } from '@nestjs/common';
import { ProductController } from './controllers/product.controller';
import { RegisterProductUseCase } from '../../core/use-cases/product/register-product.use-case';
import { DisableProductUseCase } from '../../core/use-cases/product/disable-product.use-case';
import { IProductRepository } from '../../core/interfaces/repositories/i-product.repository';
import { PrismaModule } from '../database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [
    {
      provide: RegisterProductUseCase,
      useFactory: (productRepo: IProductRepository) => {
        return new RegisterProductUseCase(productRepo);
      },
      inject: ['IProductRepository'],
    },
    {
      provide: DisableProductUseCase,
      useFactory: (productRepo: IProductRepository) => {
        return new DisableProductUseCase(productRepo);
      },
      inject: ['IProductRepository'],
    },
  ],
})
export class ProductModule {}
