import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { HealthController } from './infrastructure/http/controllers/health.controller';
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
import { CostModule } from './infrastructure/http/cost.module';
import { RolesGuard } from './infrastructure/security/roles.guard';

@Module({
  imports: [PrismaModule, MovementModule, ProductModule, BatchModule, AddressModule, AuthModule, AdjustmentModule, InventoryModule, AuditModule, NfeModule, OrderModule, CostModule],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
