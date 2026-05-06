import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/jwt-auth.guard';
import { StartCountUseCase } from '../../../core/use-cases/inventory/start-count.use-case';
import { RegisterCountUseCase } from '../../../core/use-cases/inventory/register-count.use-case';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly startCountUseCase: StartCountUseCase,
    private readonly registerCountUseCase: RegisterCountUseCase,
  ) {}

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
