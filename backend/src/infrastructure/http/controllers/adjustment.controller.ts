import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { CurrentUser } from '../../security/current-user.decorator';
import { Roles, Role } from '../../security/roles.decorator';
import { RequestAdjustmentUseCase } from '../../../core/use-cases/adjustment/request-adjustment.use-case';
import { ApproveAdjustmentUseCase } from '../../../core/use-cases/adjustment/approve-adjustment.use-case';
import { ListPendingAdjustmentsUseCase } from '../../../core/use-cases/adjustment/list-pending-adjustments.use-case';
import { RequestAdjustmentBodyDto } from '../dtos/request-adjustment-body.dto';
import { ApproveAdjustmentBodyDto } from '../dtos/approve-adjustment-body.dto';

@ApiTags('Ajustes de Estoque')
@ApiBearerAuth()
@Controller('adjustments')
@UseGuards(JwtAuthGuard)
export class AdjustmentController {
  constructor(
    private readonly requestAdjustmentUseCase: RequestAdjustmentUseCase,
    private readonly approveAdjustmentUseCase: ApproveAdjustmentUseCase,
    private readonly listPendingAdjustmentsUseCase: ListPendingAdjustmentsUseCase,
  ) {}

  @Roles(Role.OPERADOR, Role.GESTOR, Role.ADMIN)
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Solicitar ajuste de estoque (positivo ou negativo)',
  })
  @ApiBody({ type: RequestAdjustmentBodyDto })
  @ApiResponse({
    status: 201,
    description: 'Solicitação de ajuste criada e aguardando aprovação.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou lote não encontrado.',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  async requestAdjustment(
    @Body() body: RequestAdjustmentBodyDto,
    @CurrentUser('userId') solicitanteId: number,
  ) {
    const { loteId, quantidadeDelta, motivo } = body;

    const result = await this.requestAdjustmentUseCase.execute({
      loteId,
      quantidadeDelta,
      motivo,
      solicitanteId,
    });

    return result;
  }

  @Roles(Role.GESTOR, Role.ADMIN)
  @Post('approve')
  @ApiOperation({
    summary: 'Aprovar ou rejeitar uma solicitação de ajuste de estoque',
  })
  @ApiBody({ type: ApproveAdjustmentBodyDto })
  @ApiResponse({
    status: 200,
    description: 'Ajuste processado. Estoque atualizado se aprovado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Ajuste não encontrado ou já processado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Perfil sem permissão para aprovar ajustes.',
  })
  async approveAdjustment(
    @Body() body: ApproveAdjustmentBodyDto,
    @CurrentUser('userId') aprovadorId: number,
    @CurrentUser('perfil') aprovadorRole: string,
  ) {
    const { ajusteId, aprovado } = body;

    const result = await this.approveAdjustmentUseCase.execute({
      ajusteId,
      aprovado,
      aprovadorId,
      aprovadorRole,
    });

    return result;
  }

  @Roles(Role.GESTOR, Role.ADMIN)
  @Get('pending')
  @ApiOperation({
    summary: 'Listar ajustes de estoque pendentes ou por status',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDENTE', 'APROVADO', 'REJEITADO'] })
  @ApiResponse({
    status: 200,
    description: 'Lista de ajustes retornada com sucesso.',
  })
  async listPending(@Query('status') status?: string) {
    const validStatuses = ['PENDENTE', 'APROVADO', 'REJEITADO'];
    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException(`Status inválido. Use: ${validStatuses.join(', ')}`);
    }
    return this.listPendingAdjustmentsUseCase.execute(status);
  }
}
