import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { StartCountUseCase } from '../../../core/use-cases/inventory/start-count.use-case';
import { RegisterCountUseCase } from '../../../core/use-cases/inventory/register-count.use-case';
import { GetInventoryValueReportUseCase } from '../../../core/use-cases/inventory/get-inventory-value-report.use-case';
import { GetInventoryAccuracyUseCase } from '../../../core/use-cases/inventory/get-inventory-accuracy.use-case';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN)
export class InventoryController {
  constructor(
    private readonly startCountUseCase: StartCountUseCase,
    private readonly registerCountUseCase: RegisterCountUseCase,
    private readonly getInventoryValueReportUseCase: GetInventoryValueReportUseCase,
    private readonly getInventoryAccuracyUseCase: GetInventoryAccuracyUseCase,
  ) {}

  @Get('report/accuracy')
  async getInventoryAccuracy() {
    const result = await this.getInventoryAccuracyUseCase.execute();
    return {
      data: result,
    };
  }

  @Get('report/value')
  async getInventoryValueReport() {
    const result = await this.getInventoryValueReportUseCase.execute();
    return {
      data: result,
    };
  }

  @Post('start')
  async startCount(@Body() body: any, @Req() req: any) {
    const { loteId } = body;
    const usuarioId = req.user.userId;

    const result = await this.startCountUseCase.execute({
      loteId,
      usuarioId,
    });

    return result;
  }

  @Post('register')
  async registerCount(@Body() body: any, @Req() req: any) {
    const { contagemId, quantidadeFisica } = body;
    const usuarioId = req.user.userId;

    const result = await this.registerCountUseCase.execute({
      contagemId,
      quantidadeFisica,
      usuarioId,
    });

    return result;
  }
}
