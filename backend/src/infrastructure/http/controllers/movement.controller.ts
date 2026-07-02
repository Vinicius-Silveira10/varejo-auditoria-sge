import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { Roles, Role } from '../../security/roles.decorator';
import { RegisterMovementUseCase } from '../../../core/use-cases/movement/register-movement.use-case';
import { GetBatchMovementsUseCase } from '../../../core/use-cases/movement/get-batch-movements.use-case';
import { DashboardGateway } from '../../websocket/dashboard.gateway';
import { RegisterMovementDto } from '../dtos/register-movement.dto';

@ApiTags('Movimentações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('movements')
export class MovementController {
  constructor(
    private readonly registerMovementUseCase: RegisterMovementUseCase,
    private readonly getBatchMovementsUseCase: GetBatchMovementsUseCase,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  @Roles(Role.GESTOR, Role.ADMIN)
  @Get('batch/:id')
  @ApiOperation({ summary: 'Listar movimentações de um lote específico' })
  @ApiParam({ name: 'id', description: 'ID do lote', type: Number })
  @ApiResponse({ status: 200, description: 'Movimentações retornadas com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão.' })
  async getBatchMovements(@Param('id') id: string) {
    const result = await this.getBatchMovementsUseCase.execute(+id);
    return {
      data: result,
    };
  }

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nova movimentação de estoque (entrada, saída ou transferência)' })
  @ApiResponse({ status: 201, description: 'Movimentação registrada e evento emitido em tempo real.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou regra de negócio violada (RN-TRV-002, RN-EXP-001).' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async registerMovement(@Body() dto: RegisterMovementDto) {
    try {
      const result = await this.registerMovementUseCase.execute({
        ...dto,
        motivo: dto.motivo ?? null,
        enderecoOrigemId: dto.enderecoOrigemId ?? null,
        enderecoDestinoId: dto.enderecoDestinoId ?? null,
      });

      // Notificar o dashboard em tempo real (F-06 / GAP-008)
      this.dashboardGateway.emitDashboardUpdate('movement:registered', result);

      return {
        message: 'Movimentação registrada com sucesso',
        data: result,
      };
    } catch (error: any) {
      if (error.message.includes('RN-TRV-002') || error.message.includes('RN-EXP-001') || error.message.includes('não encontrado')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
