import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { CurrentUser } from '../../security/current-user.decorator';
import { GetInventoryAccuracyUseCase } from '../../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { GetOccupationDashboardUseCase } from '../../../core/use-cases/address/get-occupation-dashboard.use-case';
import { GetOtifDashboardUseCase } from '../../../core/use-cases/order/get-otif-dashboard.use-case';

/**
 * GAP-001 FIX: DashboardController corrigido.
 * - Removido o método privado checkAccess() — substituído pelo decorator @Roles (ARQT-001).
 * - Módulo dashboard.module.ts criado e registrado no AppModule.
 */
@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN) // RN-DASH-002: Restrito a Gestores e Administradores
@Controller('dashboards')
export class DashboardController {
  constructor(
    private readonly getInventoryAccuracyUseCase: GetInventoryAccuracyUseCase,
    private readonly getOccupationDashboardUseCase: GetOccupationDashboardUseCase,
    private readonly getOtifDashboardUseCase: GetOtifDashboardUseCase,
  ) {}

  @Get('accuracy')
  @ApiOperation({ summary: 'Acurácia do inventário (meta ≥ 98%)' })
  @ApiResponse({ status: 200, description: 'Acurácia calculada com sucesso.' })
  async getAccuracy(@CurrentUser() user: any) {
    return await this.getInventoryAccuracyUseCase.execute();
  }

  @Get('occupation')
  @ApiOperation({ summary: 'Ocupação dos endereços de estoque' })
  @ApiResponse({ status: 200, description: 'Dashboard de ocupação retornado.' })
  async getOccupation(@CurrentUser() user: any) {
    return await this.getOccupationDashboardUseCase.execute();
  }

  @Get('otif')
  @ApiOperation({ summary: 'Dashboard OTIF de expedição' })
  @ApiResponse({ status: 200, description: 'Dashboard OTIF retornado.' })
  async getOtif(@CurrentUser() user: any) {
    return await this.getOtifDashboardUseCase.execute();
  }
}
