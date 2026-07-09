import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { StartCountUseCase } from '../../../core/use-cases/inventory/start-count.use-case';
import { RegisterCountUseCase } from '../../../core/use-cases/inventory/register-count.use-case';
import { GetInventoryValueReportUseCase } from '../../../core/use-cases/inventory/get-inventory-value-report.use-case';
import { GetInventoryAccuracyUseCase } from '../../../core/use-cases/inventory/get-inventory-accuracy.use-case';
import { StartCountBodyDto } from '../dtos/start-count-body.dto';
import { RegisterCountBodyDto } from '../dtos/register-count-body.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Obter acuracidade do inventário' })
  @ApiResponse({
    status: 200,
    description: 'Acuracidade calculada com sucesso.',
  })
  async getInventoryAccuracy() {
    const result = await this.getInventoryAccuracyUseCase.execute();
    return {
      data: result,
    };
  }

  @Get('report/value')
  @ApiOperation({ summary: 'Obter relatório de valor total do estoque' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso.' })
  async getInventoryValueReport() {
    const result = await this.getInventoryValueReportUseCase.execute();
    return {
      data: result,
    };
  }

  @Post('start')
  @ApiOperation({ summary: 'Iniciar contagem de inventário' })
  @ApiResponse({ status: 201, description: 'Contagem iniciada.' })
  async startCount(@Body() body: StartCountBodyDto, @Req() req: any) {
    const { loteId } = body;
    const usuarioId = req.user.userId;

    const result = await this.startCountUseCase.execute({
      loteId,
      usuarioId,
    });

    return result;
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar contagem física' })
  @ApiResponse({
    status: 201,
    description: 'Contagem registrada e divergências processadas.',
  })
  async registerCount(@Body() body: RegisterCountBodyDto, @Req() req: any) {
    const { contagemId, quantidadeFisica, isRecontagem } = body;
    const usuarioId = req.user.userId;

    const result = await this.registerCountUseCase.execute({
      contagemId,
      quantidadeFisica,
      usuarioId,
      isRecontagem,
    });

    return result;
  }
}
