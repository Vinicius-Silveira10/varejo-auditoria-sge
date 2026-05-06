import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { RequestAdjustmentUseCase } from '../../../core/use-cases/adjustment/request-adjustment.use-case';
import { ApproveAdjustmentUseCase } from '../../../core/use-cases/adjustment/approve-adjustment.use-case';

@Controller('adjustments')
@UseGuards(JwtAuthGuard)
export class AdjustmentController {
  constructor(
    private readonly requestAdjustmentUseCase: RequestAdjustmentUseCase,
    private readonly approveAdjustmentUseCase: ApproveAdjustmentUseCase,
  ) {}

  @Post('request')
  async requestAdjustment(@Body() body: any, @Req() req: any) {
    const { loteId, quantidadeDelta, motivo } = body;
    const solicitanteId = req.user.userId;

    const result = await this.requestAdjustmentUseCase.execute({
      loteId,
      quantidadeDelta,
      motivo,
      solicitanteId,
    });

    return result;
  }

  @Post('approve')
  async approveAdjustment(@Body() body: any, @Req() req: any) {
    const { ajusteId, aprovado } = body;
    const aprovadorId = req.user.userId;
    const aprovadorRole = req.user.perfil; // JWT deve ter injetado o perfil

    const result = await this.approveAdjustmentUseCase.execute({
      ajusteId,
      aprovado,
      aprovadorId,
      aprovadorRole,
    });

    return result;
  }
}
