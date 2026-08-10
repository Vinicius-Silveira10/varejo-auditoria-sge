import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DashboardGateway } from './dashboard.gateway';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [DashboardGateway],
  exports: [DashboardGateway],
})
export class WebsocketModule {}
