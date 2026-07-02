import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { GetInventoryAccuracyUseCase } from '../../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { GetOccupationDashboardUseCase } from '../../../core/use-cases/address/get-occupation-dashboard.use-case';
import { GetOtifDashboardUseCase } from '../../../core/use-cases/order/get-otif-dashboard.use-case';
import { GetKpisDashboardUseCase } from '../../../core/use-cases/dashboard/get-kpis-dashboard.use-case';
import { GetRealtimeDashboardUseCase } from '../../../core/use-cases/dashboard/get-realtime-dashboard.use-case';
import { GetRupturesKpiUseCase } from '../../../core/use-cases/dashboard/get-ruptures-kpi.use-case';
import { GetDeadStockKpiUseCase } from '../../../core/use-cases/dashboard/get-dead-stock-kpi.use-case';
import { GetShrinkageKpiUseCase } from '../../../core/use-cases/dashboard/get-shrinkage-kpi.use-case';

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
    private readonly getKpisDashboardUseCase: GetKpisDashboardUseCase,
    private readonly getRealtimeDashboardUseCase: GetRealtimeDashboardUseCase,
    private readonly getRupturesKpiUseCase: GetRupturesKpiUseCase,
    private readonly getDeadStockKpiUseCase: GetDeadStockKpiUseCase,
    private readonly getShrinkageKpiUseCase: GetShrinkageKpiUseCase,
  ) {}

  @Get('accuracy')
  @ApiOperation({ summary: 'Acurácia do inventário (meta ≥ 98%)' })
  @ApiResponse({ status: 200, description: 'Acurácia calculada com sucesso.' })
  async getAccuracy() {
    return await this.getInventoryAccuracyUseCase.execute();
  }

  @Get('occupation')
  @ApiOperation({ summary: 'Ocupação dos endereços de estoque' })
  @ApiResponse({ status: 200, description: 'Dashboard de ocupação retornado.' })
  async getOccupation() {
    return await this.getOccupationDashboardUseCase.execute();
  }

  @Get('otif')
  @ApiOperation({ summary: 'Dashboard OTIF de expedição' })
  @ApiResponse({ status: 200, description: 'Dashboard OTIF retornado.' })
  async getOtif() {
    return await this.getOtifDashboardUseCase.execute();
  }

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs estratégicos (acurácia, recontagens, perdas)' })
  @ApiResponse({ status: 200, description: 'KPIs retornados com sucesso.' })
  async getKpis() {
    return await this.getKpisDashboardUseCase.execute();
  }

  @Get('realtime')
  @ApiOperation({ summary: 'KPIs em tempo real de operações' })
  @ApiResponse({ status: 200, description: 'KPIs em tempo real retornados.' })
  async getRealtime() {
    return await this.getRealtimeDashboardUseCase.execute();
  }

  @Get('kpi/ruptures')
  @ApiOperation({ summary: '% de SKUs da Curva A com saldo zero' })
  @ApiResponse({ status: 200, description: 'KPI de ruptura retornado.' })
  async getRuptures() {
    return await this.getRupturesKpiUseCase.execute();
  }

  @Get('kpi/dead-stock')
  @ApiOperation({ summary: '% de estoque parado por 90 dias' })
  @ApiResponse({ status: 200, description: 'KPI de dead-stock retornado.' })
  async getDeadStock() {
    return await this.getDeadStockKpiUseCase.execute();
  }

  @Get('kpi/shrinkage')
  @ApiOperation({ summary: 'Perdas financeiras por ajustes negativos' })
  @ApiResponse({ status: 200, description: 'KPI de shrinkage retornado.' })
  async getShrinkage() {
    return await this.getShrinkageKpiUseCase.execute();
  }
}
