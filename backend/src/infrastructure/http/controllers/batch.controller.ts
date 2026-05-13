import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus, UseGuards, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { ReceiveBatchUseCase } from '../../../core/use-cases/batch/receive-batch.use-case';
import { GetExpiryAlertsUseCase } from '../../../core/use-cases/batch/get-expiry-alerts.use-case';
import { ReceiveBatchDto } from '../dtos/receive-batch.dto';

@UseGuards(JwtAuthGuard)
@Roles(Role.GESTOR, Role.ADMIN)
@Controller('batches')
export class BatchController {
  constructor(
    private readonly receiveBatchUseCase: ReceiveBatchUseCase,
    private readonly getExpiryAlertsUseCase: GetExpiryAlertsUseCase,
  ) {}

  @Roles(Role.GESTOR, Role.ADMIN, Role.OPERADOR) // Operadores também precisam saber o que vai vencer
  @Get('alerts/expiry')
  async getExpiryAlerts(@Query('days') days?: string) {
    const result = await this.getExpiryAlertsUseCase.execute(days ? +days : 30);
    return {
      data: result,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async receiveBatch(@Body() dto: ReceiveBatchDto) {
    try {
      const validadeDate = dto.validade ? new Date(dto.validade) : undefined;
      const result = await this.receiveBatchUseCase.execute({
        ...dto,
        validade: validadeDate,
      });
      return {
        message: 'Lote recebido com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-BAT-001') || error.message.includes('RN-BAT-002')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
