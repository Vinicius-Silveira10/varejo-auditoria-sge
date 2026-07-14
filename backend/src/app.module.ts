import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
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
import { DashboardModule } from './infrastructure/http/dashboard.module';
import { WebsocketModule } from './infrastructure/websocket/websocket.module';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { RolesGuard } from './infrastructure/security/roles.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './infrastructure/security/custom-throttler.guard';


@Module({
  imports: [
    PrismaModule,
    MovementModule,
    ProductModule,
    BatchModule,
    AddressModule,
    AuthModule,
    AdjustmentModule,
    InventoryModule,
    AuditModule,
    NfeModule,
    OrderModule,
    CostModule,
    DashboardModule, // GAP-001 / ARQT-001 FIX: DashboardModule registrado
    WebsocketModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 50,
      },
    ]),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // ARQT-002 FIX: JwtAuthGuard agora é global (antes do RolesGuard)
    // Endpoints públicos devem usar o decorator @Public() para dispensa de autenticação
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
