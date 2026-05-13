import { Controller, Get, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { GetInventoryAccuracyUseCase } from '../../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { GetOccupationDashboardUseCase } from '../../../core/use-cases/address/get-occupation-dashboard.use-case';
import { GetOtifDashboardUseCase } from '../../../core/use-cases/order/get-otif-dashboard.use-case';
import { CurrentUser } from '../../security/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class DashboardController {
  constructor(
    private readonly getInventoryAccuracyUseCase: GetInventoryAccuracyUseCase,
    private readonly getOccupationDashboardUseCase: GetOccupationDashboardUseCase,
    private readonly getOtifDashboardUseCase: GetOtifDashboardUseCase,
  ) {}

  @Get('accuracy')
  async getAccuracy(@CurrentUser() user: any) {
    this.checkAccess(user);
    return await this.getInventoryAccuracyUseCase.execute();
  }

  @Get('occupation')
  async getOccupation(@CurrentUser() user: any) {
    this.checkAccess(user);
    return await this.getOccupationDashboardUseCase.execute();
  }

  @Get('otif')
  async getOtif(@CurrentUser() user: any) {
    this.checkAccess(user);
    return await this.getOtifDashboardUseCase.execute();
  }

  private checkAccess(user: any) {
    if (user.perfil !== 'GESTOR' && user.perfil !== 'ADMIN') {
      throw new UnauthorizedException('RN-DASH-002: Acesso restrito a Gestores e Administradores.');
    }
  }
}
