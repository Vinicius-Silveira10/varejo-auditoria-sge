import {
  Controller,
  Post,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { ReceiveBatchUseCase } from '../../../core/use-cases/batch/receive-batch.use-case';
import { GetExpiryAlertsUseCase } from '../../../core/use-cases/batch/get-expiry-alerts.use-case';
import { DashboardGateway } from '../../websocket/dashboard.gateway';
import { ReceiveBatchDto } from '../dtos/receive-batch.dto';

@ApiTags('Lotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN)
@Controller('batches')
export class BatchController {
  constructor(
    private readonly receiveBatchUseCase: ReceiveBatchUseCase,
    private readonly getExpiryAlertsUseCase: GetExpiryAlertsUseCase,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  @Roles(Role.GESTOR, Role.ADMIN, Role.OPERADOR) // Operadores também precisam saber o que vai vencer
  @Get('alerts/expiry')
  @ApiOperation({ summary: 'Obter alertas de lotes próximos ao vencimento' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Número de dias para o vencimento (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Alertas recuperados com sucesso.' })
  async getExpiryAlerts(@Query('days') days?: string) {
    const result = await this.getExpiryAlertsUseCase.execute(days ? +days : 30);
    return {
      data: result,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Receber um novo lote de produto' })
  @ApiResponse({
    status: 201,
    description: 'Lote recebido e estoque atualizado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Produto não encontrado ou dados inválidos.',
  })
  async receiveBatch(@Body() dto: ReceiveBatchDto) {
    try {
      const validadeDate = dto.validade ? new Date(dto.validade) : undefined;
      const result = await this.receiveBatchUseCase.execute({
        ...dto,
        validade: validadeDate,
      });

      // Notificar o dashboard em tempo real (F-06 / GAP-008)
      this.dashboardGateway.emitDashboardUpdate('batch:received', result);

      return {
        message: 'Lote recebido com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (
        error.message.includes('RN-BAT-001') ||
        error.message.includes('RN-BAT-002')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
