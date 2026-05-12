import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { MovementModule } from './infrastructure/http/movement.module';
import { ProductModule } from './infrastructure/http/product.module';
import { BatchModule } from './infrastructure/http/batch.module';
import { AddressModule } from './infrastructure/http/address.module';
import { AuthModule } from './infrastructure/http/auth.module';
import { AdjustmentModule } from './infrastructure/http/adjustment.module';
import { InventoryModule } from './infrastructure/http/inventory.module';
import { AuditModule } from './infrastructure/http/audit.module';
import { NfeModule } from './infrastructure/http/nfe.module';
import { OrderModule } from './infrastructure/http/order.module';

@Module({
  imports: [PrismaModule, MovementModule, ProductModule, BatchModule, AddressModule, AuthModule, AdjustmentModule, InventoryModule, AuditModule, NfeModule, OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
